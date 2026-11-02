import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { InfoCard, Link } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Box, Grid, Typography } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import BuildIcon from '@material-ui/icons/Build';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import StorageIcon from '@material-ui/icons/Storage';
import { useEffect, useState } from 'react';

const actions = [
  {
    title: 'Crear servicio',
    text: 'Repo con CI/CD, Terraform y observabilidad en minutos',
    to: '/create',
    color: '#2e7d32',
    icon: <AddCircleOutlineIcon />,
  },
  {
    title: 'Catálogo',
    text: 'Servicios, APIs y equipos de la plataforma',
    to: '/catalog',
    color: '#1565c0',
    icon: <StorageIcon />,
  },
  {
    title: 'Documentación',
    text: 'TechDocs de cada servicio: arquitectura, operación y APIs',
    to: '/docs',
    color: '#6a1b9a',
    icon: <LibraryBooksIcon />,
  },
  {
    title: 'Plantillas',
    text: 'Servicios Python, Node.js, Go y Java; infra y gestión',
    to: '/create',
    color: '#ef6c00',
    icon: <BuildIcon />,
  },
];

function WelcomeContent() {
  return (
    <Box>
      <Typography variant="body1" paragraph>
        Desde aquí creas servicios, consultas el catálogo y encuentras la documentación.
        Cada servicio nuevo trae su repo, pipelines, Terraform, observabilidad y guía operativa.
      </Typography>
      <Grid container spacing={2}>
        {actions.map(action => (
          <Grid item xs={12} sm={6} key={action.title}>
            <Link to={action.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box
                p={2}
                borderRadius={8}
                borderLeft={`6px solid ${action.color}`}
                bgcolor="background.paper"
                boxShadow={1}
                display="flex"
                alignItems="center"
                style={{ gap: 12 }}
              >
                <Box color={action.color}>{action.icon}</Box>
                <Box>
                  <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {action.text}
                  </Typography>
                </Box>
              </Box>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

const countedKinds = [
  { kind: 'Component', label: 'Servicios', color: '#2e7d32' },
  { kind: 'API', label: 'APIs', color: '#1565c0' },
  { kind: 'Group', label: 'Equipos', color: '#6a1b9a' },
  { kind: 'Template', label: 'Plantillas', color: '#ef6c00' },
] as const;

function CatalogCountsContent() {
  const catalog = useApi(catalogApiRef);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    Promise.all(
      countedKinds.map(async ({ kind }) => {
        const response = await catalog.getEntities({ filter: { kind } });
        return [kind, response.items.length] as const;
      }),
    )
      .then(pairs => {
        if (active) setCounts(Object.fromEntries(pairs));
      })
      .catch(() => {
        // Si el catálogo no responde, las cifras quedan en guion.
      });
    return () => {
      active = false;
    };
  }, [catalog]);

  return (
    <Grid container spacing={2}>
      {countedKinds.map(({ kind, label, color }) => (
        <Grid item xs={6} sm={3} key={kind}>
          <Box p={2} borderRadius={8} bgcolor="background.paper" boxShadow={1} textAlign="center">
            <Typography variant="h4" style={{ color, fontWeight: 700 }}>
              {counts[kind] ?? '–'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {label}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

const welcomeWidget = HomePageWidgetBlueprint.make({
  name: 'wenia-welcome',
  params: {
    name: 'WeniaWelcome',
    title: 'Wenia · Plataforma de autoservicio',
    description: 'Accesos rápidos a crear, consultar y documentar',
    components: async () => ({
      Content: () => (
        <InfoCard title="Bienvenido" subheader="Plataforma de autoservicio para microservicios">
          <WelcomeContent />
        </InfoCard>
      ),
    }),
  },
});

const countsWidget = HomePageWidgetBlueprint.make({
  name: 'wenia-catalog-counts',
  params: {
    name: 'WeniaCatalogCounts',
    title: 'Catálogo en números',
    description: 'Servicios, APIs, equipos y plantillas registradas',
    components: async () => ({
      Content: () => (
        <InfoCard title="Catálogo en números">
          <CatalogCountsContent />
        </InfoCard>
      ),
    }),
  },
});

export const homeModule = createFrontendModule({
  pluginId: 'home',
  extensions: [welcomeWidget, countsWidget],
});
