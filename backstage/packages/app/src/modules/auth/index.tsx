import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => (
      <SignInPage
        {...props}
        auto
        providers={[
          {
            id: 'github-auth-provider',
            title: 'GitHub',
            message: 'Inicia sesión con tu cuenta de GitHub',
            apiRef: githubAuthApiRef,
          },
        ]}
      />
    ),
  },
});

export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
