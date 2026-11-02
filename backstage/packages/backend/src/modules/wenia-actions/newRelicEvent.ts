import type { LoggerService } from '@backstage/backend-plugin-api';

type Attributes = Record<string, string | number | boolean>;

// Sends a custom event to the New Relic Event API. It is best effort: a missing configuration or a
// failed call never breaks the scaffolder task, it is only logged. The key is never logged.
export async function emitNewRelicEvent(
  logger: LoggerService,
  eventType: string,
  attributes: Attributes,
): Promise<string> {
  const accountId = process.env.NEW_RELIC_ACCOUNT_ID;
  const key = process.env.NEW_RELIC_LICENSE_KEY;
  if (!accountId || !key) {
    return 'skipped: NEW_RELIC_ACCOUNT_ID or NEW_RELIC_LICENSE_KEY is not set';
  }

  const host =
    process.env.NEW_RELIC_REGION?.toLowerCase() === 'eu'
      ? 'insights-collector.eu01.nr-data.net'
      : 'insights-collector.newrelic.com';
  // NEW_RELIC_EVENTS_URL lets tests point at a local server.
  const url =
    process.env.NEW_RELIC_EVENTS_URL ?? `https://${host}/v1/accounts/${encodeURIComponent(accountId)}/events`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': key },
      body: JSON.stringify([{ eventType, ...attributes }]),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? 'sent' : `failed: HTTP ${response.status}`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`New Relic event ${eventType} not sent: ${reason}`);
    return `failed: ${reason}`;
  }
}
