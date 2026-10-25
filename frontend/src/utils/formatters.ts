/**
 * Utility functions for date and string formatting.
 */

export function formatUtcTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Unavailable';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toUTCString();
  } catch {
    return isoString;
  }
}

export function formatLocalTime(date?: Date | null): string {
  if (!date) return 'Pending';
  return date.toLocaleTimeString();
}

export function formatLatency(latencyMs?: number | null): string {
  if (latencyMs === null || latencyMs === undefined) return '--';
  return `${latencyMs} ms`;
}
