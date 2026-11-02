import { useState } from 'react';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';

type Row = {
  ref: string;
  name: string;
  slug?: string;
  state: 'ok' | 'missing' | 'no-repo' | 'error';
};

const stateLabel: Record<Row['state'], { text: string; color: string }> = {
  ok: { text: 'OK', color: '#2dd4bf' },
  missing: { text: 'Repo no existe', color: '#f87171' },
  'no-repo': { text: 'Sin repo asociado', color: '#fbbf24' },
  error: { text: 'No se pudo comprobar', color: '#fbbf24' },
};

export const ValidateCatalogButton = () => {
  const catalog = useApi(catalogApiRef);
  const discovery = useApi(discoveryApiRef);
  const { fetch } = useApi(fetchApiRef);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const validate = async () => {
    setBusy(true);
    setConfirm(false);
    setMessage('');
    try {
      const base = await discovery.getBaseUrl('proxy');
      const { items } = await catalog.getEntities({ filter: { kind: 'Component' } });
      const result = await Promise.all(
        items.map(async (e): Promise<Row> => {
          const ref = `component:${e.metadata.namespace ?? 'default'}/${e.metadata.name}`;
          const slug = e.metadata.annotations?.['github.com/project-slug'];
          if (!slug) return { ref, name: e.metadata.name, state: 'no-repo' };
          try {
            const res = await fetch(`${base}/github-api/repos/${slug}`);
            if (res.status === 404) return { ref, name: e.metadata.name, slug, state: 'missing' };
            return { ref, name: e.metadata.name, slug, state: res.ok ? 'ok' : 'error' };
          } catch {
            return { ref, name: e.metadata.name, slug, state: 'error' };
          }
        }),
      );
      setRows(result);
    } finally {
      setBusy(false);
    }
  };

  const refreshAll = async () => {
    setBusy(true);
    await Promise.all(rows.map(r => catalog.refreshEntity(r.ref).catch(() => undefined)));
    setBusy(false);
    setMessage('Refresco solicitado para todos los servicios.');
  };

  const removeOrphans = async () => {
    setBusy(true);
    let removed = 0;
    for (const r of rows.filter(x => x.state === 'missing')) {
      const location = await catalog.getLocationByEntity(r.ref).catch(() => undefined);
      if (location) {
        await catalog.removeLocationById(location.id);
        removed += 1;
      }
    }
    setBusy(false);
    setConfirm(false);
    setMessage(`Se quitaron ${removed} servicio(s) huérfano(s) del catálogo.`);
    await validate();
  };

  const orphans = rows.filter(r => r.state === 'missing').length;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CheckCircleOutlineIcon />}
        onClick={() => {
          setOpen(true);
          validate();
        }}
      >
        Validar catálogo
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Validar catálogo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>
            Comprueba que el repositorio de cada servicio todavía existe en GitHub. Los huérfanos se
            pueden quitar del catálogo (no se borra ningún repositorio).
          </Typography>
          {busy && <CircularProgress size={24} />}
          {!busy && rows.length === 0 && <Typography>No hay servicios registrados.</Typography>}
          {rows.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Servicio</TableCell>
                  <TableCell>Repositorio</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.ref}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.slug ?? '–'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={stateLabel[r.state].text}
                        style={{ background: 'transparent', border: `1px solid ${stateLabel[r.state].color}`, color: stateLabel[r.state].color }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {message && <Typography style={{ marginTop: 12 }}>{message}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={validate} disabled={busy}>Volver a validar</Button>
          <Button onClick={refreshAll} disabled={busy || rows.length === 0}>Refrescar todo</Button>
          {!confirm ? (
            <Button color="secondary" disabled={busy || orphans === 0} onClick={() => setConfirm(true)}>
              Quitar huérfanos ({orphans})
            </Button>
          ) : (
            <Button color="secondary" variant="contained" disabled={busy} onClick={removeOrphans}>
              Confirmar: quitar {orphans}
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
