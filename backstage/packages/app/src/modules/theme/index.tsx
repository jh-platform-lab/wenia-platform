import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import {
  createUnifiedTheme,
  palettes,
  UnifiedThemeProvider,
} from '@backstage/theme';

// Paleta Wenia: azul noche con acento turquesa y violeta.
export const weniaColors = {
  bg: '#0b1220',
  paper: '#121b2e',
  border: '#1f2b45',
  teal: '#2dd4bf',
  violet: '#8b7cff',
  amber: '#fbbf24',
  pink: '#f472b6',
  blue: '#38bdf8',
};

const weniaDark = createUnifiedTheme({
  palette: {
    ...palettes.dark,
    primary: { main: weniaColors.teal },
    secondary: { main: weniaColors.violet },
    background: { default: weniaColors.bg, paper: weniaColors.paper },
    navigation: {
      ...palettes.dark.navigation,
      background: '#080d18',
      indicator: weniaColors.teal,
      color: '#9fb0cf',
      selectedColor: '#ffffff',
      navItem: { hoverBackground: '#14203a' },
    },
  },
  defaultPageTheme: 'home',
  pageTheme: {
    home: {
      colors: ['#0f766e', '#4338ca'],
      shape: 'wave',
      backgroundImage:
        'linear-gradient(135deg, #0f766e 0%, #1e3a8a 55%, #4338ca 100%)',
      fontColor: '#ffffff',
    } as never,
  },
  fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  components: {
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    BackstageHeader: {
      styleOverrides: { header: { boxShadow: 'none', borderBottom: `1px solid ${weniaColors.border}` } },
    },
  },
});

const weniaTheme = ThemeBlueprint.make({
  params: {
    theme: {
      id: 'wenia-dark',
      title: 'Wenia Dark',
      variant: 'dark',
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={weniaDark}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [weniaTheme],
});
