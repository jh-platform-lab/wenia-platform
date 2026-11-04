import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarSpace,
} from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import MenuIcon from '@material-ui/icons/Menu';
import GitHubIcon from '@material-ui/icons/GitHub';
import TimelineIcon from '@material-ui/icons/Timeline';
import RocketLaunchIcon from '@material-ui/icons/FlightTakeoff';
import SearchIcon from '@material-ui/icons/Search';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item => (
        <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
      ));

      // Menu reducido: lo que no se lista aqui no se muestra.
      nav.take('page:search'); // Se usa el modal de busqueda
      nav.take('page:notifications');
      nav.take('page:app-visualizer');

      return (
        <Sidebar>
          <SidebarLogo />
          <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
            <SidebarSearchModal />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="Plataforma" icon={<MenuIcon />}>
            {nav.take('page:home')}
            {nav.take('page:scaffolder')}
            {nav.take('page:catalog')}
            {nav.take('page:api-docs')}
            {nav.take('page:techdocs')}
            {nav.take('page:catalog-graph')}
            {nav.take('page:inventory')}
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="El reto" icon={<RocketLaunchIcon />}>
            <SidebarItem icon={GitHubIcon} to="https://github.com/jh-platform-lab" text="GitHub" />
            <SidebarItem icon={TimelineIcon} to="https://one.newrelic.com/dashboards?account=8689628" text="New Relic" />
          </SidebarGroup>
          <SidebarSpace />
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
