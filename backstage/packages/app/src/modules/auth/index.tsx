import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import { weniaColors as c } from '../theme';

// Los nombres de clase de Backstage se minifican en produccion, asi que el estilo se apoya en la
// estructura del DOM (header, main, ul, li) y no en nombres de clase.
const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    paddingTop: '14vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: `radial-gradient(circle at 50% 0%, #12304a 0%, ${c.bg} 55%)`,
    // Se oculta la cabecera con degradado que trae la pagina por defecto.
    '& header': { display: 'none' },
    '& main': { background: 'transparent', minHeight: 'auto', display: 'block', width: '100%' },
    '& article': { padding: 0 },
    '& ul': { justifyContent: 'center', margin: 0, padding: 0 },
    '& ul > li': { flexGrow: 0, maxWidth: 380, width: '100%', listStyle: 'none' },
  },
  brand: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: `linear-gradient(135deg, ${c.teal}, ${c.violet})`,
    color: '#06212a',
    fontWeight: 800,
    fontSize: 30,
    display: 'grid',
    placeItems: 'center',
  },
  name: { fontSize: 38, fontWeight: 800, letterSpacing: 0.5, color: '#fff' },
  tagline: { color: '#9fb0cf', marginBottom: 28, fontSize: 16 },
});

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => {
      const classes = useStyles();
      return (
        <div className={classes.root}>
          <div className={classes.brand}>
            <div className={classes.mark}>W</div>
            <span className={classes.name}>wenia</span>
          </div>
          <div className={classes.tagline}>Plataforma de autoservicio para microservicios</div>
          <SignInPage
            {...props}
            auto
            providers={[
              'guest',
              {
                id: 'github-auth-provider',
                title: 'GitHub',
                message: 'Inicia sesión con tu cuenta de GitHub',
                apiRef: githubAuthApiRef,
              },
            ]}
          />
        </div>
      );
    },
  },
});

export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
