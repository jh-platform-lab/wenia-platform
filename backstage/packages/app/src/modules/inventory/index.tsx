import {
  PageBlueprint,
  createFrontendPlugin,
  createRouteRef,
} from '@backstage/frontend-plugin-api';
import DashboardIcon from '@material-ui/icons/Dashboard';

const rootRouteRef = createRouteRef();

const inventoryPage = PageBlueprint.make({
  params: {
    path: '/inventory',
    title: 'Inventario',
    icon: <DashboardIcon />,
    routeRef: rootRouteRef,
    loader: async () => {
      const { InventoryPage } = await import('./InventoryPage');
      return <InventoryPage />;
    },
  },
});

export const inventoryPlugin = createFrontendPlugin({
  pluginId: 'inventory',
  title: 'Inventario',
  icon: <DashboardIcon />,
  routes: { root: rootRouteRef },
  extensions: [inventoryPage],
});
