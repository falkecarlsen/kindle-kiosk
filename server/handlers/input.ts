import { relayTouchToDashboard } from "../sources/homeassistant";
import { logger } from "../core/logger";

type InputPayload = {
  src: string;
  x?: number;
  y?: number;
  action?: string;
};

const isInputPayload = (value: unknown): value is InputPayload => {
  if (typeof value !== "object" || value === null) return false;
  if (typeof (value as { src?: unknown }).src !== "string") return false;
  return true;
};

export async function handleInput(req: Request, state: { page: string }): Promise<Response> {
  try {
    const body = await req.json();
    if (!isInputPayload(body)) {
      logger.warn(`Invalid input payload: ${JSON.stringify(body)}`);
      return new Response("bad payload", { status: 400 });
    }

    const data = body;
    logger.info(`[INPUT] ${JSON.stringify(data)}`);

    // Simple interaction: toggle between pages when power pressed
    if (data.src === "power") {
      state.page = state.page === "main" ? "alt" : "main";
      logger.info(`Switched page to ${state.page}`);
    }

    // Relay touchscreen taps into the Home Assistant dashboard session
    if (data.src === "touch") {
      const x = Number(data.x);
      const y = Number(data.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        logger.warn(`Invalid touch payload: ${JSON.stringify(data)}`);
        return new Response("bad touch payload", { status: 400 });
      }

      try {
        const { viewportX, viewportY } = await relayTouchToDashboard(x, y, state.page);
        logger.info(`Relayed touch to dashboard at ${viewportX},${viewportY}`);
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        logger.error(`Touch relay failed: ${message}`);
        return new Response("home assistant dashboard unavailable", { status: 502 });
      }
    }

    return new Response("ok");
  } catch (err) {
    logger.error(`Input error: ${(err as Error).message ?? String(err)}`);
    return new Response("bad request", { status: 400 });
  }
}
