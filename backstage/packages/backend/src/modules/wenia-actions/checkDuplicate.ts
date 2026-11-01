import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

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

      if (!NAME_PATTERN.test(name)) {
        throw new Error(`Invalid service name: ${name}`);
      }

      // 1. Catalog
      const existing = await catalog.getEntityByRef(`component:default/${name}`, {
        credentials: await ctx.getInitiatorCredentials(),
      });
      if (existing) {
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
        throw new Error(`A repository named "${org}/${name}" already exists`);
      }
      if (response.status !== 404) {
        throw new Error(
          `Could not verify "${org}/${name}" in GitHub (HTTP ${response.status})`,
        );
      }

      ctx.logger.info(`Name "${name}" is available`);
    },
  });
}
