const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const configuredIdleMinutes = parseNumber(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES);
const configuredWarningSeconds = parseNumber(import.meta.env.VITE_IDLE_WARNING_SECONDS);

export const IDLE_TIMEOUT_MINUTES = Math.max(configuredIdleMinutes || 10, 5);
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

const warningSeconds = configuredWarningSeconds && configuredWarningSeconds > 0 ? configuredWarningSeconds : 60;
export const IDLE_WARNING_MS = Math.min(warningSeconds * 1000, Math.max(IDLE_TIMEOUT_MS - 1000, 0));
