import { useCallback, useEffect, useState } from 'react';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { Box, Grid, Typography } from '@material-ui/core';
import { weniaColors as c } from '../theme';

type Level = 'ok' | 'warn' | 'down' | 'unknown';
type Item = { name: string; level: Level; text: string; link: string };

const levelColor: Record<Level, string> = {
  ok: c.teal,
  warn: c.amber,
  down: '#f87171',
  unknown: '#94a3b8',
};

// Statuspage (GitHub y New Relic): indicator = none | minor | major | critical.
const fromIndicator = (indicator: string): Level =>
  indicator === 'none' ? 'ok' : indicator === 'minor' ? 'warn' : 'down';

export function ThirdPartyStatus() {
  const discovery = useApi(discoveryApiRef);
  const { fetch } = useApi(fetchApiRef);
  const [items, setItems] = useState<Item[]>([]);
  const [checkedAt, setCheckedAt] = useState('');

  const load = useCallback(async () => {
    const base = await discovery.getBaseUrl('proxy');
    const statuspage = async (name: string, path: string, link: string): Promise<Item> => {
      try {
        const res = await fetch(`${base}/${path}/status.json`);
        const body = await res.json();
        return { name, level: fromIndicator(body.status.indicator), text: body.status.description, link };
      } catch {
        return { name, level: 'unknown', text: 'No se pudo consultar', link };
      }
    };
    const aws = async (): Promise<Item> => {
      const name = 'AWS (us-east-1)';
      const link = 'https://health.aws.amazon.com/health/status';
      try {
        const res = await fetch(`${base}/aws-health/currentevents`);
        // La API de AWS responde en UTF-16; el BOM indica el orden de bytes (FF FE = little endian).
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : 'utf-16be';
        const raw = new TextDecoder(encoding).decode(buf).replace(/^\uFEFF/, '');
        const events: { arn?: string }[] = JSON.parse(raw);
        const mine = events.filter(e => e.arn?.includes(':us-east-1:'));
        if (mine.length > 0) {
          return { name, level: 'warn', text: `${mine.length} evento(s) activo(s) en la región del reto`, link };
        }
        return {
          name,
          level: 'ok',
          text: events.length === 0 ? 'Sin eventos activos' : `Sin eventos en us-east-1 (${events.length} en otras regiones)`,
          link,
        };
      } catch {
        return { name, level: 'unknown', text: 'No se pudo consultar', link };
      }
    };
    setItems(
      await Promise.all([
        statuspage('GitHub · repos, Actions, GHCR', 'github-status', 'https://www.githubstatus.com'),
        aws(),
        statuspage('New Relic', 'newrelic-status', 'https://status.newrelic.com'),
      ]),
    );
    setCheckedAt(new Date().toLocaleTimeString());
  }, [discovery, fetch]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Box>
      <Grid container spacing={2}>
        {items.map(i => (
          <Grid item xs={12} md={4} key={i.name}>
            <a href={i.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box
                p={2}
                borderRadius={12}
                style={{ border: `1px solid ${c.border}`, borderLeft: `4px solid ${levelColor[i.level]}`, background: c.paper }}
              >
                <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                  <span style={{ color: levelColor[i.level] }}>●</span> {i.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">{i.text}</Typography>
              </Box>
            </a>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
        {checkedAt ? `Consultado a las ${checkedAt} · se actualiza cada minuto` : 'Consultando…'}
      </Typography>
    </Box>
  );
}
