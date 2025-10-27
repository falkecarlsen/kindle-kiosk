const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDashboardViews = (
  value: string | undefined
): Record<string, string> => {
  if (!value) return {};

  return value.split(",").reduce<Record<string, string>>((acc, entry) => {
    const [key, rawPath] = entry.split("=");
    if (!key || !rawPath) return acc;

    const trimmedKey = key.trim();
    const trimmedPath = rawPath.trim();
    if (!trimmedKey || !trimmedPath) return acc;

    acc[trimmedKey] = trimmedPath;
    return acc;
  }, {});
};

export const config = {
  haUrl: process.env.HA_URL ?? "http://localhost:8123",
  haToken: process.env.HA_TOKEN ?? "",
  refreshInterval: parseNumber(process.env.REFRESH_INTERVAL_MS, 5 * 60 * 1000),
  dashboardWidth: parseNumber(process.env.DASHBOARD_WIDTH, 1448),
  dashboardHeight: parseNumber(process.env.DASHBOARD_HEIGHT, 1072),
  touchMaxX: parseNumber(process.env.TOUCH_MAX_X, 1072),
  touchMaxY: parseNumber(process.env.TOUCH_MAX_Y, 1448),
  clickDelayMs: parseNumber(process.env.CLICK_DELAY_MS, 60),
  haDashboardPath: process.env.HA_DASHBOARD_PATH ?? "lovelace/kindle",
  haDashboardViews: parseDashboardViews(process.env.HA_DASHBOARD_VIEWS),
  defaultDashboardPage: process.env.HA_DEFAULT_PAGE ?? "main",
};

export function requireToken(): void {
  if (!config.haToken) {
    throw new Error(
      "HA_TOKEN must be set to control the Home Assistant dashboard"
    );
  }
}
