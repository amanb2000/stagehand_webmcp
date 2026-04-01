import { tool } from "ai";
import { z } from "zod";
import type { V3 } from "../../v3.js";

export const listWebMCPToolsTool = (v3: V3) =>
  tool({
    description:
      "Lists all WebMCP tools registered on the current page via navigator.modelContextTesting. " +
      "Returns tool names, descriptions, and input schemas. " +
      "Use this to discover what tools the current website provides.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        v3.logger({
          category: "agent",
          message: "Agent calling tool: listWebMCPTools",
          level: 1,
        });
        const page = await v3.context.awaitActivePage();
        const toolsJson = await page.evaluate(() => {
          const testing = (navigator as any).modelContextTesting;
          if (!testing) return "null";
          const toolList = testing.listTools();
          const plain = toolList.map((t: any) => ({
            name: String(t.name),
            description: String(t.description),
            inputSchema: t.inputSchema ? String(t.inputSchema) : null,
          }));
          return JSON.stringify(plain);
        });

        const tools = JSON.parse(toolsJson as string);

        v3.logger({
          category: "agent",
          message: "WebMCP tools found: " + toolsJson,
          level: 1,
        });

        if (tools === null) {
          return {
            success: false,
            error:
              "WebMCP (navigator.modelContextTesting) is not available on this page.",
            tools: [],
          };
        }
        return { success: true, tools };
      } catch (error) {
        return {
          success: false,
          error: (error as Error)?.message ?? String(error),
          tools: [],
        };
      }
    },
  });

export const callWebMCPToolTool = (v3: V3) =>
  tool({
    description:
      "Executes a WebMCP tool registered on the current page. " +
      "Use listWebMCPTools first to discover available tools and their input schemas.",
    inputSchema: z.object({
      name: z.string().describe("The name of the WebMCP tool to call."),
      argumentsJson: z
        .string()
        .optional()
        .describe(
          'A JSON string of the arguments to pass to the tool. Must be valid JSON matching the tool\'s inputSchema. Omit or pass "{}" for tools with no parameters. Example: \'{"origin":"SFO","destination":"JFK","tripType":"one-way","outboundDate":"2025-06-15","inboundDate":"2025-06-15","passengers":1}\'',
        ),
    }),
    execute: async ({ name, argumentsJson }) => {
      const argsJson =
        !argumentsJson || argumentsJson.trim() === "" ? "{}" : argumentsJson;
      try {
        v3.logger({
          category: "agent",
          message: `Agent calling WebMCP tool: ${name} with args: ${argsJson}`,
          level: 1,
        });
        const page = await v3.context.awaitActivePage();
        const script = `(async () => {
          const testing = navigator.modelContextTesting;
          if (!testing) return JSON.stringify({ error: "WebMCP not available" });
          try {
            const raw = await testing.executeTool(${JSON.stringify(name)}, ${JSON.stringify(argsJson)});
            return typeof raw === "string" ? raw : JSON.stringify(raw);
          } catch (e) {
            return JSON.stringify({ error: e?.message ?? String(e) });
          }
        })()`;
        const resultJson = await page.evaluate(script);

        v3.logger({
          category: "agent",
          message: `WebMCP tool ${name} returned: ${resultJson}`,
          level: 1,
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(resultJson as string);
        } catch {
          parsed = resultJson;
        }

        return { success: true, result: parsed };
      } catch (error) {
        return {
          success: false,
          error: (error as Error)?.message ?? String(error),
        };
      }
    },
  });
