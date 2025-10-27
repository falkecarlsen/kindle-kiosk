import { serve } from "bun";
import { handleInput } from "./handlers/input";
import { getHomeAssistantImage } from "./sources/homeassistant";
import { config } from "./core/env";
import { logger } from "./core/logger";

interface DashboardState {
  page: string;
}

let currentPage = config.defaultDashboardPage; // stateful page id
logger.debug(`current page=${currentPage}`);
export const state: DashboardState = {
  get page() {
    return currentPage;
  },
  set page(p: string) {
    currentPage = p;
  },
};

import sharp from "sharp";

export class KindleImageTransformer {
  /**
   * Convert to Kindle-compatible PNG: 8-bit grayscale, no alpha channel.
   * Optionally resize to a target resolution.
   */
  static async toKindleCompatible(
    input: Buffer | ArrayBufferLike,
    opts?: {
      width?: number;
      height?: number;
      fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    }
  ): Promise<Buffer> {
    const buf = Buffer.isBuffer(input)
      ? input
      : Buffer.from(input as ArrayBufferLike);

    let img = sharp(buf);

    return img
      .toColorspace("b-w") // 1 channel grayscale (alias: .toColorspace)
      .removeAlpha()        // ensure no alpha channel
      .png({ bitdepth: 8 }) // 8-bit grayscale PNG (color type 0)
      .rotate(90) // linter wrong, does exist
      .toBuffer();
  }
}

serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/dashboard.png") {
      try {
        const img = await getHomeAssistantImage(state.page);
        return new Response(img, {
          headers: { "Content-Type": "image/png" },
        });
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        logger.error(`Failed to serve dashboard image: ${message}`);
        return new Response("dashboard unavailable", { status: 502 });
      }
    }

    if (req.method === "GET" && url.pathname === "/dashboard-kindle.png") {
      try {
        const img = await getHomeAssistantImage(state.page);
        return new Response(await KindleImageTransformer.toKindleCompatible(img), {
          headers: { "Content-Type": "image/png" },
        });
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        logger.error(`Failed to serve dashboard image: ${message}`);
        return new Response("dashboard unavailable", { status: 502 });
      }
    }

    if (req.method === "POST" && url.pathname === "/input") {
      return handleInput(req, state);
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(
  `📟 Kindle dashboard server running on :8080 (default page: ${state.page})`
);
