/**
 * Parses duration strings like "15m", "7d", "1h", "30s"
 * into seconds or milliseconds.
 */

/**
 * Parse a duration string into **seconds**.
 * Supported suffixes: s, m, h, d.
 * Returns 7 days in seconds on invalid input.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600; // default 7 days
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 7 * 86400;
  }
}

/**
 * Parse a duration string into **milliseconds**.
 * Supported suffixes: s, m, h, d.
 * Returns 7 days in ms on invalid input.
 */
export function parseDurationMs(duration: string): number {
  return parseDuration(duration) * 1000;
}
