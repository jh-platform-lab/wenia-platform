import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';

// Centra las tarjetas de proveedores (por defecto quedan alineadas a la izquierda).
const useStyles = makeStyles({
  center: {
    '& .MuiGrid-container': { justifyContent: 'center' },
    '& .MuiGrid-container > .MuiGrid-item': { margin: '0 auto' },
    '& main, & [class*="BackstageSignInPage"]': { textAlign: 'center' },
  },
});

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => {
      const classes = useStyles();
      return (
        <div className={classes.center}>
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
