export async function handleInput(req: Request, state: any): Promise<Response> {
  try {
    const data = await req.json();
    console.log("[INPUT]", data);

    // Simple interaction: toggle between pages when power pressed
    if (data.src === "power") {
      state.page = state.page === "main" ? "alt" : "main";
      console.log("Switched page to", state.page);
    }

    // Example touch zones
    if (data.src === "touch") {
      if (data.y < 700) console.log("Top touch");
      else console.log("Bottom touch");
    }

    return new Response("ok");
  } catch (err) {
    console.error("Input error:", err);
    return new Response("bad request", { status: 400 });
  }
}
