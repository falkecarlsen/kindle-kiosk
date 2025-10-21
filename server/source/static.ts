import { readFile } from "node:fs/promises";
import path from "node:path";

export async function getCurrentImage(page: string): Promise<Buffer> {
  const file = path.join("public", `${page}.png`);
  try {
    return await readFile(file);
  } catch {
    return await readFile(path.join("public", "dashboard.png"));
  }
}
