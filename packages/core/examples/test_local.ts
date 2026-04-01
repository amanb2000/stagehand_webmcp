import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname, "../../../.env") });

import { Stagehand } from "../lib/v3/index.js";

async function getCdpWebSocketUrl(port = 9222): Promise<string> {
  const resp = await fetch(`http://localhost:${port}/json/version`);
  const info = (await resp.json()) as { webSocketDebuggerUrl: string };
  return info.webSocketDebuggerUrl;
}

(async () => {
  const cdpUrl = await getCdpWebSocketUrl();
  console.log("Connecting to CDP:", cdpUrl);

  const stagehand = new Stagehand({
    env: "LOCAL",
    model: "openai/gpt-4o-mini",
    verbose: 2,
    localBrowserLaunchOptions: {
      cdpUrl,
    },
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];
    await page.goto("https://travel-demo.bandarra.me/");

    const agent = stagehand.agent({
      model: "openai/gpt-4o-mini",
    });

    const result = await agent.execute({
      instruction:
        "Use the listWebMCPTools tool to discover what WebMCP tools are available on this page. Report back what you find.",
      maxSteps: 5,
    });

    console.log("\n=== AGENT RESULT ===");
    console.log("Success:", result.success);
    console.log("Message:", result.message);
    console.log("====================\n");
  } finally {
    await stagehand.close();
  }
})();
