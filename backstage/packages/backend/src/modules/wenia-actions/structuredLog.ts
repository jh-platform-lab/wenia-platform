type Level = 'info' | 'warn' | 'error';

interface LogTarget {
  info(message: string): unknown;
  warn(message: string): unknown;
  error(message: string): unknown;
}

/**
 * Structured (one JSON object per line) logger for the custom scaffolder actions.
 *
 * `requestId` is the scaffolder task id: it identifies one generation request across
 * every step, the task log in the UI and the backend log. To follow a request:
 *   GET /api/scaffolder/v2/tasks/<requestId>/eventstream   (or the task page in the UI)
 *   grep '"requestId":"<requestId>"' in the backend output
 */
export function createActionLogger(
  target: LogTarget,
  base: { action: string; requestId: string; service: string },
) {
  const emit = (level: Level, event: string, fields: Record<string, unknown> = {}) => {
    target[level](
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        ...base,
        event,
        ...fields,
      }),
    );
  };

  return {
    info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
    warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
    error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),
  };
}
