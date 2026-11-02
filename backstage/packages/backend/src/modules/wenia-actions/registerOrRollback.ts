import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createActionLogger } from './structuredLog';
import { emitNewRelicEvent } from './newRelicEvent';

type Catalog = typeof catalogServiceRef.T;

const NAME_PATTERN = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
// Rollback guards: only this organization, and only repositories created moments ago.
const ALLOWED_ORG = 'jh-platform-lab';
const MAX_REPO_AGE_MS = 15 * 60 * 1000;

export function createRegisterOrRollbackAction(options: {
  catalog: Catalog;
  githubToken?: string;
}) {
  const { catalog, githubToken } = options;

  const githubHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
  };

  async function deleteCreatedRepo(org: string, name: string): Promise<string> {
    if (org !== ALLOWED_ORG) {
      return `refused: organization "${org}" is not allowed`;
    }
    if (!NAME_PATTERN.test(name)) {
      return `refused: invalid repository name "${name}"`;
    }

    const url = `https://api.github.com/repos/${org}/${name}`;
    const info = await fetch(url, { headers: githubHeaders });
    if (info.status === 404) {
      return 'nothing to delete (repository does not exist)';
    }
    if (info.status !== 200) {
      return `could not inspect the repository (HTTP ${info.status})`;
    }
    const { created_at: createdAt } = (await info.json()) as { created_at: string };
    if (Date.now() - new Date(createdAt).getTime() > MAX_REPO_AGE_MS) {
      return 'refused: repository was not created by this task (too old)';
    }

    const result = await fetch(url, { method: 'DELETE', headers: githubHeaders });
    return result.status === 204
      ? 'repository deleted'
      : `delete failed (HTTP ${result.status})`;
  }

  return createTemplateAction({
    id: 'wenia:register-or-rollback',
    description:
      'Registers the generated service in the catalog. If registration fails, deletes the repository created by this task so no orphan is left behind',
    schema: {
      input: {
        repoContentsUrl: z => z.string().describe('Contents URL of the published repository'),
        catalogInfoPath: z => z.string().describe('Path of catalog-info.yaml inside the repository'),
        org: z => z.string().describe('GitHub organization of the repository'),
        name: z => z.string().describe('Repository name'),
      },
      output: {
        entityRef: z => z.string().describe('Reference of the registered component'),
      },
    },
    async handler(ctx) {
      const { repoContentsUrl, catalogInfoPath, org, name } = ctx.input;
      const target = `${repoContentsUrl.replace(/\/$/, '')}/${catalogInfoPath.replace(/^\//, '')}`;
      const credentials = await ctx.getInitiatorCredentials();
      const log = createActionLogger(ctx.logger, {
        action: 'wenia:register-or-rollback',
        requestId: ctx.task.id,
        service: name,
      });
      log.info('started', { target });

      try {
        // Dry run first: validates the file and returns the entities (a real add does not).
        const preview = await catalog.addLocation(
          { type: 'url', target, dryRun: true },
          { credentials },
        );
        const component = preview.entities.find(e => e.kind === 'Component');
        if (!component) {
          throw new Error(`No Component entity found in ${target}`);
        }

        await catalog.addLocation({ type: 'url', target }, { credentials });

        const namespace = component.metadata.namespace ?? 'default';
        const entityRef = `component:${namespace}/${component.metadata.name}`;
        ctx.output('entityRef', entityRef);
        log.info('registered', { entityRef });

        const sent = await emitNewRelicEvent(ctx.logger, 'WeniaServiceRegistered', {
          service: component.metadata.name,
          owner: String(component.spec?.owner ?? 'unknown'),
          type: String(component.spec?.type ?? 'unknown'),
          lifecycle: String(component.spec?.lifecycle ?? 'unknown'),
          org,
          requestId: ctx.task.id,
        });
        log.info('newrelic-event', { event: 'WeniaServiceRegistered', outcome: sent });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        log.error('registration-failed', { reason });

        let outcome: string;
        try {
          outcome = await deleteCreatedRepo(org, name);
        } catch (rollbackError) {
          outcome = `rollback error: ${
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          }`;
        }
        log.error('rollback', { repository: `${org}/${name}`, outcome });

        const sent = await emitNewRelicEvent(ctx.logger, 'WeniaServiceRegistrationFailed', {
          service: name,
          org,
          reason: reason.slice(0, 200),
          rollback: outcome.slice(0, 200),
          requestId: ctx.task.id,
        });
        log.info('newrelic-event', { event: 'WeniaServiceRegistrationFailed', outcome: sent });

        throw new Error(
          `Registration failed (${reason}). Rollback of ${org}/${name}: ${outcome}`,
        );
      }
    },
  });
}
