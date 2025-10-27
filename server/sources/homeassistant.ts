// src/sources/homeassistant.ts
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { config, requireToken } from "../core/env";
import { logger } from "../core/logger";

type DashboardPageId = string | undefined;

let browser: Browser | null = null;
let activePage: Page | null = null;
let activeDashboardPath: string | null = null;
let sessionPromise: Promise<Page> | null = null;
let sessionQueue: Promise<unknown> = Promise.resolve();

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
const PUBLIC_DASHBOARD_FILE = path.join("public", "dashboard.png");

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const run = sessionQueue.then(() => operation());
  sessionQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const sanitisePath = (value: string): string => value.replace(/^\/+/, "");

function resolveDashboardPath(pageId?: string): string {
  if (pageId) {
    const mapped = config.haDashboardViews[pageId];
    if (mapped) return sanitisePath(mapped);
  }
  return sanitisePath(config.haDashboardPath);
}

function buildDashboardUrl(pageId?: string): string {
  const base = config.haUrl.endsWith("/")
    ? config.haUrl
    : `${config.haUrl}`;

  const resolved = resolveDashboardPath(pageId);
  return new URL(resolved, base).toString();
}

async function launchBrowser(): Promise<Browser> {
  if (browser) return browser;
  browser = await puppeteer.launch({
    args: ["--disable-gpu"],
    headless: true,
  });
  return browser;
}

export async function initialisePage(
  page: Page,
  pageId?: string
): Promise<void> {
  await page.setViewport({
    width: config.dashboardWidth,
    height: config.dashboardHeight,
    deviceScaleFactor: 1,
  });

  const targetUrl = buildDashboardUrl(pageId);
  logger.info(`Connecting to Home Assistant dashboard at ${targetUrl}`);

  // Go to HA root page first — needed to bind to correct origin
  await page.goto(config.haUrl, { waitUntil: "domcontentloaded" });

  // Inject long-lived token into localStorage (runs in browser context)
  await page.evaluate((token) => {
    const hassUrl = window.location.origin;
    const expires = new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000
    ).toISOString(); // 10 years
    localStorage.setItem(
      "hassTokens",
      JSON.stringify({
        hassUrl,
        access_token: token,
        expires,
      })
    );
  }, config.haToken);

  // Now open the dashboard — authenticated session will be used
  await page.goto(targetUrl, {
    waitUntil: "networkidle2",
    timeout: 45_000,
  });

  activeDashboardPath = resolveDashboardPath(pageId);
  logger.info(`Dashboard initialised at ${activeDashboardPath}`);
}

async function startSession(pageId?: string): Promise<Page> {
  const instance = await launchBrowser();
  const page = await instance.newPage();
  await initialisePage(page, pageId);

  activePage = page;
  page.on("close", () => {
    if (activePage === page) {
      activePage = null;
      activeDashboardPath = null;
      sessionPromise = null;
    }
  });

  return page;
}

async function ensureDashboard(page: Page, pageId?: string): Promise<void> {
  const targetPath = resolveDashboardPath(pageId);
  if (activeDashboardPath === targetPath) return;

  const targetUrl = buildDashboardUrl(pageId);
  logger.info(`Switching Home Assistant dashboard to ${targetUrl}`);
  await page.goto(targetUrl, {
    waitUntil: "networkidle2",
    timeout: 45_000,
  });
  activeDashboardPath = targetPath;
}

async function ensurePage(pageId?: DashboardPageId): Promise<Page> {
  requireToken();

  if (activePage && !activePage.isClosed()) {
    await ensureDashboard(activePage, pageId);
    return activePage;
  }

  if (!sessionPromise) {
    sessionPromise = startSession(pageId).catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }

  const page = await sessionPromise;
  activePage = page;
  await ensureDashboard(page, pageId);
  return page;
}

async function resetSession(): Promise<void> {
  if (activePage && !activePage.isClosed()) {
    try {
      await activePage.close();
    } catch (err) {
      logger.debug(
        `Failed to close dashboard page cleanly: ${(err as Error).message}`
      );
    }
  }
  activePage = null;
  activeDashboardPath = null;
  sessionPromise = null;

  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      logger.debug(
        `Failed to close browser cleanly: ${(err as Error).message}`
      );
    }
  }
  browser = null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normaliseTouch(
  x: number,
  y: number
): { viewportX: number; viewportY: number } {
  const viewportX = Math.round((x / config.touchMaxX) * config.dashboardWidth);
  const viewportY = Math.round((y / config.touchMaxY) * config.dashboardHeight);
  return {
    viewportX: clamp(viewportX, 0, config.dashboardWidth - 1),
    viewportY: clamp(viewportY, 0, config.dashboardHeight - 1),
  };
}

async function withSession<T>(
  pageId: DashboardPageId,
  operation: (page: Page) => Promise<T>
): Promise<T> {
  return runExclusive(async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const page = await ensurePage(pageId);
        return await operation(page);
      } catch (err) {
        lastError = err;
        if (attempt === 2) break;

        const message = (err as Error).message ?? String(err);
        logger.warn(
          `Home Assistant session attempt ${attempt} failed: ${message}; resetting session`
        );
        await resetSession();
      }
    }

    throw lastError ?? new Error("Home Assistant session failed");
  });
}

async function persistScreenshot(buffer: Buffer): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PUBLIC_DASHBOARD_FILE), { recursive: true });
    await fs.writeFile(PUBLIC_DASHBOARD_FILE, buffer);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    logger.warn(`Failed to persist dashboard screenshot: ${message}`);
  }
}

// export async function fetchHomeAssistantImage(
//   pageId?: string
// ): Promise<Buffer> {
//   const buffer = await withSession(pageId, async (page) => {
//     await page.reload({ waitUntil: "networkidle2", timeout: 45_000 });
//     return (await page.screenshot({ type: "png" })) as Buffer;
//   });

//   await persistScreenshot(buffer);
//   logger.info("Dashboard image updated");
//   return buffer;
// }


export async function fetchHomeAssistantImage(pageId?: string): Promise<Buffer> {

  const buffer = await withSession(pageId, async (page) => {
    await page.reload({ waitUntil: "networkidle2", timeout: 45_000 });

    await page.evaluate(() => {
      function adjustLayout(root: Document | Element | ShadowRoot | null): void {
        if (!root) return;

        root.querySelectorAll("*").forEach((el) => {
          const tag = el.tagName.toLowerCase();

          // Collapse sidebar area — don't hide drawer itself
          if (tag === "ha-drawer") {
            const shadow = (el as HTMLElement).shadowRoot;
            if (shadow) {
              const sidebar = shadow.querySelector("div[slot='sidebar'], ha-sidebar") as HTMLElement | null;
              const main = shadow.querySelector("div[slot='main']") as HTMLElement | null;

              if (sidebar) {
                sidebar.style.width = "0";
                sidebar.style.minWidth = "0";
                sidebar.style.maxWidth = "0";
                sidebar.style.overflow = "hidden";
              }

              if (main) {
                main.style.width = "100vw";
                main.style.maxWidth = "100vw";
                main.style.margin = "0";
                main.style.flex = "1 1 auto";
              }
            }
          }

          // hide any standalone header bars
          if (["app-header", "app-toolbar"].includes(tag)) {
            (el as HTMLElement).style.display = "none";
          }

          // recurse into shadow DOM
          const shadow = (el as HTMLElement).shadowRoot;
          if (shadow) adjustLayout(shadow);
        });
      }

      adjustLayout(document);

      document.body.style.margin = "0";
      document.body.style.background = "white";
      document.documentElement.style.overflow = "hidden";
    });

    await new Promise((res) => setTimeout(res, 500));

    return (await page.screenshot({ type: "png", fullPage: false })) as Buffer;
  });

  await persistScreenshot(buffer);
  logger.info("Dashboard image updated");
  return buffer;
}



export async function getHomeAssistantImage(pageId?: string): Promise<Buffer> {
  try {
    return await fetchHomeAssistantImage(pageId);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    logger.error(`Home Assistant screenshot failed: ${message}`);

    try {
      return await fs.readFile(PUBLIC_DASHBOARD_FILE);
    } catch (readErr) {
      const readMessage = (readErr as Error).message ?? String(readErr);
      logger.error(`Unable to load cached dashboard image: ${readMessage}`);
      throw err;
    }
  }
}

export async function relayTouchToDashboard(
  x: number,
  y: number,
  pageId?: string
): Promise<{ viewportX: number; viewportY: number }> {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(
      `Touch coordinates must be numeric, received x=${x}, y=${y}`
    );
  }

  return withSession(pageId, async (page) => {
    const { viewportX, viewportY } = normaliseTouch(x, y);
    logger.debug(
      `Relaying touch at (${x}, ${y}) -> viewport (${viewportX}, ${viewportY})`
    );

    await page.bringToFront();
    await page.mouse.click(viewportX, viewportY, {
      delay: config.clickDelayMs,
    });
    await delay(config.clickDelayMs);

    return { viewportX, viewportY };
  });
}
