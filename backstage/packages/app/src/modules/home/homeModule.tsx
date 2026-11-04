import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { Link, LinkButton } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Box, Chip, Grid, Typography, makeStyles } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import StorageIcon from '@material-ui/icons/Storage';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import DescriptionIcon from '@material-ui/icons/Description';
import GitHubIcon from '@material-ui/icons/GitHub';
import ViewListIcon from '@material-ui/icons/ViewList';
import SecurityIcon from '@material-ui/icons/Security';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import TimelineIcon from '@material-ui/icons/Timeline';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { useEffect, useState } from 'react';
import { weniaColors as c } from '../theme';
import { ThirdPartyStatus } from './ThirdPartyStatus';

const useStyles = makeStyles({
  '@keyframes glow': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(45,212,191,0)' },
    '50%': { boxShadow: '0 0 18px 2px rgba(45,212,191,0.45)' },
  },
  '@keyframes dot': {
    '0%, 100%': { opacity: 0.4 },
    '50%': { opacity: 1 },
  },
  hero: {
    borderRadius: 16,
    padding: '22px 28px',
    color: '#fff',
    background: 'linear-gradient(120deg, #0f766e 0%, #1e3a8a 50%, #4338ca 100%)',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      right: -60,
      top: -60,
      width: 260,
      height: 260,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
    },
  },
  step: {
    flex: 1,
    minWidth: 120,
    textAlign: 'center',
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    background: c.paper,
    animation: '$glow 6s infinite',
  },
  tile: {
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    background: c.paper,
    height: '100%',
    transition: 'transform .15s, border-color .15s',
    '&:hover': { transform: 'translateY(-2px)', borderColor: c.teal },
  },
  dot: {
    display: 'inline-block',
    width: 9,
    height: 9,
    borderRadius: '50%',
    marginRight: 8,
    animation: '$dot 2s infinite',
  },
});

function Hero() {
  const classes = useStyles();
  return (
    <Box className={classes.hero}>
      <Typography variant="overline" style={{ opacity: 0.85, letterSpacing: 2 }}>
        Platform Engineering · Autoservicio
      </Typography>
      <Typography variant="h4" style={{ fontWeight: 800, margin: '2px 0 6px' }}>
        De la idea al servicio en producción, sin tickets
      </Typography>
      <Typography variant="body1" style={{ maxWidth: 680, opacity: 0.92 }}>
        Un formulario crea el repositorio, el catálogo, el CI/CD, el Terraform y la observabilidad
        de un microservicio Python, Node.js, Go o Java, listo para Lambda o Kubernetes.
      </Typography>
      <Box mt={2} display="flex" flexWrap="wrap" style={{ gap: 12 }}>
        <LinkButton to="/create" variant="contained" size="medium"
          startIcon={<AddCircleOutlineIcon />}
          style={{ background: c.teal, color: '#042f2e', fontWeight: 700 }}>
          Crear servicio
        </LinkButton>
        <LinkButton to="/catalog" variant="outlined" size="medium"
          startIcon={<StorageIcon />} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
          Catálogo
        </LinkButton>
        <LinkButton to="/docs" variant="outlined" size="medium"
          startIcon={<LibraryBooksIcon />} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
          Documentación
        </LinkButton>
      </Box>
      <Box mt={1.5} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
        {['Python', 'Node.js', 'Go', 'Java', 'AWS Lambda', 'Kubernetes', 'Terraform', 'New Relic'].map(t => (
          <Chip key={t} label={t} size="small"
            style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} />
        ))}
      </Box>
    </Box>
  );
}

const steps = [
  { icon: <DescriptionIcon />, title: 'Formulario', text: 'Nombre, lenguaje, equipo, APIs', color: c.teal },
  { icon: <GitHubIcon />, title: 'Repositorio', text: 'Código, Dockerfile, docs', color: c.blue },
  { icon: <ViewListIcon />, title: 'Catálogo', text: 'Component + API', color: c.violet },
  { icon: <SecurityIcon />, title: 'CI', text: 'Tests · seguridad · imagen', color: c.amber },
  { icon: <CloudUploadIcon />, title: 'CD', text: 'Terraform · ECR · Lambda', color: c.pink },
  { icon: <TimelineIcon />, title: 'Observabilidad', text: 'New Relic', color: c.teal },
];

function Flow() {
  const classes = useStyles();
  return (
    <Box>
      <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }}>
        {steps.map((s, i) => (
          <Box key={s.title} display="flex" alignItems="center" style={{ gap: 8, flex: 1 }}>
            <Box className={classes.step} style={{ animationDelay: `${i}s`, borderTop: `3px solid ${s.color}` }}>
              <Box style={{ color: s.color }}>{s.icon}</Box>
              <Typography variant="subtitle2" style={{ fontWeight: 700 }}>{s.title}</Typography>
              <Typography variant="caption" color="textSecondary">{s.text}</Typography>
            </Box>
            {i < steps.length - 1 && <ArrowForwardIcon style={{ color: c.border }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const countedKinds = [
  { kind: 'Component', label: 'Servicios', color: c.teal },
  { kind: 'API', label: 'APIs', color: c.blue },
  { kind: 'Group', label: 'Equipos', color: c.violet },
  { kind: 'Template', label: 'Plantillas', color: c.amber },
] as const;

function Metrics() {
  const catalog = useApi(catalogApiRef);
  const classes = useStyles();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<{ name: string; title?: string }[]>([]);
  const [up, setUp] = useState<boolean | undefined>();

  useEffect(() => {
    let active = true;
    Promise.all(
      countedKinds.map(async ({ kind }) => {
        const r = await catalog.getEntities({ filter: { kind } });
        return [kind, r.items] as const;
      }),
    )
      .then(pairs => {
        if (!active) return;
        setUp(true);
        setCounts(Object.fromEntries(pairs.map(([k, items]) => [k, items.length])));
        const comps = pairs.find(([k]) => k === 'Component')?.[1] ?? [];
        setRecent(comps.slice(-5).reverse().map(e => ({ name: e.metadata.name, title: e.metadata.title })));
      })
      .catch(() => active && setUp(false));
    return () => { active = false; };
  }, [catalog]);

  return (
    <Box>
      <Grid container spacing={2}>
        {countedKinds.map(({ kind, label, color }) => (
          <Grid item xs={6} md={3} key={kind}>
            <Box className={classes.tile} textAlign="center" style={{ borderTop: `3px solid ${color}` }}>
              <Typography variant="h3" style={{ color, fontWeight: 800 }}>{counts[kind] ?? '–'}</Typography>
              <Typography variant="body2" color="textSecondary">{label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box mt={2} className={classes.tile}>
        <Typography variant="subtitle2" style={{ fontWeight: 700 }}>Servicios recientes</Typography>
        {recent.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            {up === false ? 'El catálogo no responde.' : 'Aún no hay servicios. Crea el primero.'}
          </Typography>
        )}
        {recent.map(r => (
          <Box key={r.name} mt={0.5}>
            <Link to={`/catalog/default/component/${r.name}`}>{r.title ?? r.name}</Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const platform = [
  { name: 'Backstage', text: 'Portal en contenedor, login GitHub', color: c.teal, to: '/catalog', live: true },
  { name: 'GitHub', text: 'Repos y Actions (org jh-platform-lab)', color: c.blue, to: 'https://github.com/jh-platform-lab' },
  { name: 'AWS', text: 'Cuenta de reto · ECR, Lambda, Terraform', color: c.amber, to: 'https://console.aws.amazon.com' },
  { name: 'New Relic', text: 'APM, logs y alertas', color: c.pink, to: 'https://one.newrelic.com' },
];

function PlatformStatus() {
  const classes = useStyles();
  return (
    <Box>
      <Grid container spacing={2}>
        {platform.map(p => (
          <Grid item xs={12} sm={6} md={3} key={p.name}>
            <Link to={p.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box className={classes.tile}>
                <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                  <span className={classes.dot} style={{ background: p.color }} />
                  {p.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">{p.text}</Typography>
                <Typography variant="caption" style={{ color: p.color }}>
                  {p.live ? 'Operativo' : 'Configurado · abrir'}
                </Typography>
              </Box>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function Observability() {
  const classes = useStyles();
  return (
    <Box className={classes.tile} style={{ borderLeft: `4px solid ${c.pink}` }}>
      <Typography variant="h6" style={{ fontWeight: 700 }}>Observabilidad con New Relic</Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Cada servicio nace con el agente APM, logs estructurados y alertas NRQL versionadas en
        <code> observability/</code>. Los datos aparecen en New Relic al recibir tráfico.
      </Typography>
      <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
        <LinkButton to="https://one.newrelic.com" variant="outlined" size="small"
          style={{ color: c.pink, borderColor: c.pink }}>
          Abrir New Relic
        </LinkButton>
        <LinkButton to="/docs" variant="outlined" size="small">Guía de observabilidad</LinkButton>
        <LinkButton to="https://one.newrelic.com/dashboards?account=8689628" variant="outlined" size="small">Dashboard de altas</LinkButton>
      </Box>
    </Box>
  );
}

const widget = (name: string, title: string, description: string, Content: () => JSX.Element) =>
  HomePageWidgetBlueprint.make({
    name: `wenia-${name}`,
    params: {
      name: `Wenia${name[0].toUpperCase()}${name.slice(1)}`,
      title,
      description,
      components: async () => ({ Content }),
    },
  });

export const homeModule = createFrontendModule({
  pluginId: 'home',
  extensions: [
    widget('hero', 'Wenia Platform', 'Presentación y accesos rápidos', Hero),
    widget('flow', 'Flujo del reto', 'De formulario a observabilidad', Flow),
    widget('metrics', 'Catálogo en vivo', 'Contadores y servicios recientes', Metrics),
    widget('platform', 'Plataforma', 'Componentes de la plataforma', PlatformStatus),
    widget('observability', 'Observabilidad', 'New Relic', Observability),
    widget('status', 'Servicios de terceros', 'Estado de GitHub, AWS y New Relic', ThirdPartyStatus),
  ],
});
