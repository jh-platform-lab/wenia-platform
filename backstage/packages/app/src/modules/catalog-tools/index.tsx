import {
  PluginHeaderActionBlueprint,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { ValidateCatalogButton } from './ValidateCatalog';
import { HideTemplatesButton, filteredCatalogApi } from './HiddenTemplates';

const validateAction = PluginHeaderActionBlueprint.make({
  name: 'validate-catalog',
  params: { loader: async () => <ValidateCatalogButton /> },
});

const hideAction = PluginHeaderActionBlueprint.make({
  name: 'hide-templates',
  params: { loader: async () => <HideTemplatesButton /> },
});

// Botones del catalogo y cliente del catalogo que respeta las plantillas ocultas.
export const catalogToolsModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [validateAction, filteredCatalogApi],
});

// Boton de la pantalla Create.
export const scaffolderToolsModule = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [hideAction],
});
