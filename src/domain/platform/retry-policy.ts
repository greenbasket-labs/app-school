export const RETRY_BASE_DELAY_MS = 30_000;
export const RETRY_MAX_DELAY_MS = 10 * 60_000;

export function retryDelayMs(attemptCount: number) {
  const safeAttempt = Math.max(1, Math.floor(attemptCount));
  const delay = RETRY_BASE_DELAY_MS * 2 ** (safeAttempt - 1);
  return Math.min(delay, RETRY_MAX_DELAY_MS);
}

export function nextRetryAt(attemptCount: number, now = new Date()) {
  return new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString();
}
