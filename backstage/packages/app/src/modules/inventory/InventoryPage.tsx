import { useEffect, useState } from 'react';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { Link } from '@backstage/core-components';
import {
  Box,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { weniaColors as c } from '../theme';

const ORG = 'jh-platform-lab';

type Delivery = {
  repo: string;
  state: 'ok' | 'fail' | 'running';
  sha: string;
  at: string;
  url: string;
};

type Repo = {
  name: string;
  language: string | null;
  pushed_at: string;
  created_at: string;
  html_url: string;
  ci?: { state: 'ok' | 'fail' | 'running' | 'none'; url?: string };
};

const useStyles = makeStyles({
  tile: { padding: 16, borderRadius: 12, border: `1px solid ${c.border}`, background: c.paper, height: '100%' },
  section: { padding: 20, borderRadius: 12, border: `1px solid ${c.border}`, background: c.paper },
});

const ciColor = { ok: c.teal, fail: '#f87171', running: c.amber, none: '#94a3b8' };
const ciText = { ok: 'CI verde', fail: 'CI falla', running: 'En curso', none: 'Sin CI' };

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
};

function useInventory() {
  const catalog = useApi(catalogApiRef);
  const discovery = useApi(discoveryApiRef);
  const { fetch } = useApi(fetchApiRef);
  const [components, setComponents] = useState<Entity[]>([]);
  const [apis, setApis] = useState<Entity[]>([]);
  const [resources, setResources] = useState<Entity[]>([]);
  const [repos, setRepos] = useState<Repo[] | undefined>();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [comp, api, res] = await Promise.all(
        ['Component', 'API', 'Resource'].map(kind => catalog.getEntities({ filter: { kind } })),
      );
      if (!active) return;
      setComponents(comp.items);
      setApis(api.items);
      setResources(res.items);

      try {
        const base = await discovery.getBaseUrl('proxy');
        const list: Repo[] = await (await fetch(`${base}/github-api/orgs/${ORG}/repos?per_page=50&sort=created`)).json();
        const withCi = await Promise.all(
          list.map(async r => {
            try {
              const runs = await (await fetch(`${base}/github-api/repos/${ORG}/${r.name}/actions/runs?per_page=1`)).json();
              const run = runs.workflow_runs?.[0];
              if (!run) return { ...r, ci: { state: 'none' as const } };
              const state: 'ok' | 'fail' | 'running' =
                run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'ok' : 'fail';
              return { ...r, ci: { state, url: run.html_url } };
            } catch {
              return { ...r, ci: { state: 'none' as const } };
            }
          }),
        );
        if (active) setRepos(withCi);

        // Ultimo CD de cada repo que tenga cd.yml: su commit es el tag de la imagen subida a ECR.
        const cd = await Promise.all(
          list.map(async (r): Promise<Delivery | undefined> => {
            try {
              const res = await fetch(`${base}/github-api/repos/${ORG}/${r.name}/actions/workflows/cd.yml/runs?per_page=1`);
              if (!res.ok) return undefined;
              const run = (await res.json()).workflow_runs?.[0];
              if (!run) return undefined;
              const state: Delivery['state'] =
                run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'ok' : 'fail';
              return { repo: r.name, state, sha: String(run.head_sha).slice(0, 7), at: run.updated_at, url: run.html_url };
            } catch {
              return undefined;
            }
          }),
        );
        if (active) setDeliveries(cd.filter((d): d is Delivery => !!d));
      } catch {
        if (active) setError('No se pudo consultar GitHub.');
      }
    })();
    return () => {
      active = false;
    };
  }, [catalog, discovery, fetch]);

  return { components, apis, resources, repos, deliveries, error };
}

const Tile = ({ label, value, color }: { label: string; value: string | number; color: string }) => {
  const classes = useStyles();
  return (
    <Box className={classes.tile} textAlign="center" style={{ borderTop: `3px solid ${color}` }}>
      <Typography variant="h3" style={{ color, fontWeight: 800 }}>{value}</Typography>
      <Typography variant="body2" color="textSecondary">{label}</Typography>
    </Box>
  );
};

const Section = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => {
  const classes = useStyles();
  return (
    <Box className={classes.section} mb={2}>
      <Typography variant="h6" style={{ fontWeight: 700 }}>{title}</Typography>
      {note && <Typography variant="caption" color="textSecondary">{note}</Typography>}
      <Box mt={1.5} style={{ overflowX: 'auto' }}>{children}</Box>
    </Box>
  );
};

const refOf = (e: Entity) => `/catalog/${e.metadata.namespace ?? 'default'}/${e.kind.toLowerCase()}/${e.metadata.name}`;

export function InventoryPage() {
  const { components, apis, resources, repos, deliveries, error } = useInventory();
  const failing = repos?.filter(r => r.ci?.state === 'fail').length ?? 0;
  const recent = [...(repos ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);

  return (
    <Box p={3}>
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={6} md={2}><Tile label="Servicios" value={components.length} color={c.teal} /></Grid>
        <Grid item xs={6} md={2}><Tile label="APIs" value={apis.length} color={c.blue} /></Grid>
        <Grid item xs={6} md={2}><Tile label="Recursos" value={resources.length} color={c.violet} /></Grid>
        <Grid item xs={6} md={3}><Tile label="Repos en GitHub" value={repos?.length ?? '–'} color={c.amber} /></Grid>
        <Grid item xs={12} md={3}><Tile label="CI fallando" value={repos ? failing : '–'} color={failing ? '#f87171' : c.teal} /></Grid>
      </Grid>

      <Section title="Altas recientes" note="Repositorios creados en la organización, del más nuevo al más antiguo (fuente: GitHub).">
        {error && <Typography color="error">{error}</Typography>}
        {recent.map(r => (
          <Box key={r.name} display="flex" alignItems="center" py={0.8} style={{ gap: 12, borderBottom: `1px solid ${c.border}` }}>
            <span style={{ color: c.teal }}>●</span>
            <a href={r.html_url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{r.name}</a>
            <Typography variant="body2" color="textSecondary">{ago(r.created_at)}</Typography>
            <Box flexGrow={1} />
            <a href="https://one.newrelic.com" target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>New Relic</a>
          </Box>
        ))}
      </Section>

      <Section title="GitHub" note="Estado del último workflow de cada repositorio.">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Repositorio</TableCell><TableCell>Lenguaje</TableCell>
              <TableCell>Último push</TableCell><TableCell>CI</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(repos ?? []).map(r => (
              <TableRow key={r.name}>
                <TableCell><a href={r.html_url} target="_blank" rel="noreferrer">{r.name}</a></TableCell>
                <TableCell>{r.language ?? '–'}</TableCell>
                <TableCell>{ago(r.pushed_at)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ciText[r.ci?.state ?? 'none']}
                    component="a"
                    href={r.ci?.url}
                    clickable={!!r.ci?.url}
                    target="_blank"
                    style={{ background: 'transparent', border: `1px solid ${ciColor[r.ci?.state ?? 'none']}`, color: ciColor[r.ci?.state ?? 'none'] }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Imágenes en ECR"
        note="Último despliegue (cd.yml) de cada repositorio: el commit es el tag de la imagen publicada. Fuente: GitHub Actions."
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Repositorio ECR</TableCell><TableCell>Tag (commit)</TableCell>
              <TableCell>Publicada</TableCell><TableCell>Último CD</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.length === 0 && (
              <TableRow><TableCell colSpan={4}>Ningún repositorio ha ejecutado su CD todavía.</TableCell></TableRow>
            )}
            {deliveries.map(d => (
              <TableRow key={d.repo}>
                <TableCell>
                  <a href="https://us-east-1.console.aws.amazon.com/ecr/repositories?region=us-east-1" target="_blank" rel="noreferrer">
                    {d.repo}
                  </a>
                </TableCell>
                <TableCell><code>{d.sha}</code></TableCell>
                <TableCell>{ago(d.at)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={d.state === 'ok' ? 'Imagen publicada' : d.state === 'running' ? 'En curso' : 'CD falló'}
                    component="a"
                    href={d.url}
                    clickable
                    target="_blank"
                    style={{ background: 'transparent', border: `1px solid ${ciColor[d.state]}`, color: ciColor[d.state] }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" color="textSecondary">
          Si el CD falló, la imagen de ese commit no llegó a ECR. Esta tabla no consulta AWS.
        </Typography>
      </Section>

      <Section title="Servicios" note="Componentes registrados en el catálogo.">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Servicio</TableCell><TableCell>Tipo</TableCell><TableCell>Ciclo</TableCell>
              <TableCell>Dueño</TableCell><TableCell>Observabilidad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {components.map(e => (
              <TableRow key={e.metadata.name}>
                <TableCell><Link to={refOf(e)}>{e.metadata.title ?? e.metadata.name}</Link></TableCell>
                <TableCell>{String(e.spec?.type ?? '–')}</TableCell>
                <TableCell>{String(e.spec?.lifecycle ?? '–')}</TableCell>
                <TableCell>{String(e.spec?.owner ?? '–')}</TableCell>
                <TableCell><a href="https://one.newrelic.com" target="_blank" rel="noreferrer">New Relic</a></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="APIs" note="Entidades API del catálogo.">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>API</TableCell><TableCell>Tipo</TableCell><TableCell>Dueño</TableCell><TableCell>Descripción</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {apis.length === 0 && <TableRow><TableCell colSpan={4}>Aún no hay APIs registradas.</TableCell></TableRow>}
            {apis.map(e => (
              <TableRow key={e.metadata.name}>
                <TableCell><Link to={refOf(e)}>{e.metadata.name}</Link></TableCell>
                <TableCell>{String(e.spec?.type ?? '–')}</TableCell>
                <TableCell>{String(e.spec?.owner ?? '–')}</TableCell>
                <TableCell>{e.metadata.description ?? '–'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Box>
  );
}
