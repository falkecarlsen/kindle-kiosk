import { fetchHomeAssistantImage } from "../sources/homeassistant";
import { logger } from "./logger";
import { config } from "./env";

export function startImageFetcher() {
  const run = async () => {
    try {
      await fetchHomeAssistantImage(config.defaultDashboardPage);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      logger.warn(`Image fetch failed: ${message}`);
    } finally {
      setTimeout(run, config.refreshInterval);
    }
  };
  run();
}
