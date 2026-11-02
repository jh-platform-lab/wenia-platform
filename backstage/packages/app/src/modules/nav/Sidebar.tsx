import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import MenuIcon from '@material-ui/icons/Menu';
import GitHubIcon from '@material-ui/icons/GitHub';
import TimelineIcon from '@material-ui/icons/Timeline';
import CloudIcon from '@material-ui/icons/Cloud';
import AssignmentIcon from '@material-ui/icons/Assignment';
import RocketLaunchIcon from '@material-ui/icons/FlightTakeoff';
import SearchIcon from '@material-ui/icons/Search';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item => (
        <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
      ));

      // Skipped items
      nav.take('page:search'); // Using search modal instead
      nav.take('page:notifications'); // Using NotificationsSidebarItem manually instead

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
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="El reto" icon={<RocketLaunchIcon />}>
            <SidebarItem icon={GitHubIcon} to="https://github.com/jh-platform-lab" text="Repositorios" />
            <SidebarItem icon={CloudIcon} to="https://console.aws.amazon.com" text="AWS" />
            <SidebarItem icon={TimelineIcon} to="https://one.newrelic.com" text="New Relic" />
            <SidebarItem
              icon={AssignmentIcon}
              to="https://github.com/jh-platform-lab/wenia-platform/tree/main/evidence"
              text="Evidencia"
            />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarScrollWrapper>{nav.rest({ sortBy: 'title' })}</SidebarScrollWrapper>
          <SidebarSpace />
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:app-visualizer')}
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
