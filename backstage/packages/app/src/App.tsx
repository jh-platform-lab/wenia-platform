import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { catalogToolsModule, scaffolderToolsModule } from './modules/catalog-tools';
import { homeModule } from './modules/home';
import { authModule } from './modules/auth';
import { themeModule } from './modules/theme';
import { inventoryPlugin } from './modules/inventory';

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    homeModule,
    authModule,
    themeModule,
    catalogToolsModule,
    scaffolderToolsModule,
    inventoryPlugin,
  ],
});
