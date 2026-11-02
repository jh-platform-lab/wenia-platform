import { useEffect, useState } from 'react';
import { CatalogClient } from '@backstage/catalog-client';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  ApiBlueprint,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { useApi } from '@backstage/core-plugin-api';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@material-ui/core';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';

const KEY = 'wenia.hiddenTemplates';

export const getHidden = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};

const setHidden = (names: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(names));
  } catch {
    // Sin almacenamiento local no se puede recordar la preferencia.
  }
};

// Cliente del catalogo que oculta las plantillas elegidas por la persona (solo en su navegador).
// No borra nada de backstage-templates ni del catalogo.
export class FilteredCatalogClient extends CatalogClient {
  async queryEntities(request?: any, options?: any) {
    const res = await super.queryEntities(request, options);
    const hidden = getHidden();
    if (hidden.length === 0) return res;
    return {
      ...res,
      items: res.items.filter(e => !(e.kind === 'Template' && hidden.includes(e.metadata.name))),
    };
  }

  async allTemplates() {
    const res = await super.queryEntities({ filter: { kind: 'Template' } });
    return res.items;
  }
}

export const filteredCatalogApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: catalogApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new FilteredCatalogClient({ discoveryApi, fetchApi }),
    }),
});

export const HideTemplatesButton = () => {
  const catalog = useApi(catalogApiRef) as unknown as FilteredCatalogClient;
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<{ name: string; title: string }[]>([]);
  const [hidden, setHiddenState] = useState<string[]>(getHidden());

  useEffect(() => {
    if (!open) return;
    const list = typeof catalog.allTemplates === 'function'
      ? catalog.allTemplates()
      : Promise.resolve([] as any[]);
    list.then(items =>
      setNames(items.map(e => ({ name: e.metadata.name, title: e.metadata.title ?? e.metadata.name }))),
    );
  }, [open, catalog]);

  const toggle = (name: string) =>
    setHiddenState(h => (h.includes(name) ? h.filter(x => x !== name) : [...h, name]));

  const apply = () => {
    setHidden(hidden);
    window.location.reload();
  };

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<VisibilityOffIcon />} onClick={() => setOpen(true)}>
        Ocultar plantillas
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ocultar plantillas</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>
            Marca las plantillas que no quieres ver en esta pantalla. Solo afecta a tu navegador: no se
            borra nada.
          </Typography>
          {names.length === 0 && <Typography variant="body2">No hay plantillas para mostrar.</Typography>}
          {names.map(t => (
            <div key={t.name}>
              <FormControlLabel
                control={<Checkbox checked={hidden.includes(t.name)} onChange={() => toggle(t.name)} />}
                label={t.title}
              />
            </div>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHiddenState([])}>Mostrar todas</Button>
          <Button color="primary" variant="contained" onClick={apply}>Aplicar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
