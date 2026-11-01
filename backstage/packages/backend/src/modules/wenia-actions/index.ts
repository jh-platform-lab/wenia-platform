import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createCheckDuplicateAction } from './checkDuplicate';
import { createRegisterOrRollbackAction } from './registerOrRollback';

export default createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'wenia-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        catalog: catalogServiceRef,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, catalog, config }) {
        const githubToken = config
          .getOptionalConfigArray('integrations.github')?.[0]
          ?.getOptionalString('token');
        scaffolder.addActions(
          createCheckDuplicateAction({ catalog, githubToken }),
          createRegisterOrRollbackAction({ catalog, githubToken }),
        );
      },
    });
  },
});
