import { serve } from "bun";
import { handleInput } from "./handler/input";
import { getCurrentImage } from "./source/static";

let currentPage = "main"; // stateful page id

export const state = {
  get page() { return currentPage; },
  set page(p: string) { currentPage = p; },
};

serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/dashboard.png") {
      const img = await getCurrentImage(state.page);
      return new Response(img, {
        headers: { "Content-Type": "image/png" },
      });
    }

    if (req.method === "POST" && url.pathname === "/input") {
      return handleInput(req, state);
    }

    return new Response("not found", { status: 404 });
  },
});

console.log("📟 Kindle dashboard server running on :8080");
