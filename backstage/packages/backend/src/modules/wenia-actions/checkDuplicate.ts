import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createActionLogger } from './structuredLog';

type Catalog = typeof catalogServiceRef.T;

const NAME_PATTERN = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;

export function createCheckDuplicateAction(options: {
  catalog: Catalog;
  githubToken?: string;
}) {
  const { catalog, githubToken } = options;

  return createTemplateAction({
    id: 'wenia:check-duplicate',
    description:
      'Fails if a service with this name already exists in the catalog or in GitHub',
    schema: {
      input: {
        name: z => z.string().describe('Service name'),
        org: z => z.string().describe('GitHub organization'),
      },
    },
    async handler(ctx) {
      const { name, org } = ctx.input;
      const log = createActionLogger(ctx.logger, {
        action: 'wenia:check-duplicate',
        requestId: ctx.task.id,
        service: name,
      });
      log.info('started', { org });

      if (!NAME_PATTERN.test(name)) {
        log.error('invalid-name');
        throw new Error(`Invalid service name: ${name}`);
      }

      // 1. Catalog
      const existing = await catalog.getEntityByRef(`component:default/${name}`, {
        credentials: await ctx.getInitiatorCredentials(),
      });
      if (existing) {
        log.error('duplicate', { where: 'catalog' });
        throw new Error(`A component named "${name}" already exists in the catalog`);
      }

      // 2. GitHub
      const response = await fetch(`https://api.github.com/repos/${org}/${name}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        },
      });
      if (response.status === 200) {
        log.error('duplicate', { where: 'github', httpStatus: 200 });
        throw new Error(`A repository named "${org}/${name}" already exists`);
      }
      if (response.status !== 404) {
        log.error('github-check-failed', { httpStatus: response.status });
        throw new Error(
          `Could not verify "${org}/${name}" in GitHub (HTTP ${response.status})`,
        );
      }

      log.info('name-available');
    },
  });
}
