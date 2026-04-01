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
          'JSON string of arguments to pass to the tool, e.g. \'{"query":"flights"}\'. Defaults to "{}".',
        ),
    }),
    execute: async ({ name, argumentsJson }) => {
      try {
        v3.logger({
          category: "agent",
          message: `Agent calling WebMCP tool: ${name}`,
          level: 1,
        });
        const page = await v3.context.awaitActivePage();
        const argsJson = argumentsJson ?? "{}";
        const result = await page.evaluate(
          (toolName: string, toolArgs: string) => {
            const testing = (navigator as any).modelContextTesting;
            if (!testing) return { error: "WebMCP not available" };
            return testing.executeTool(toolName, toolArgs);
          },
          name,
          argsJson,
        );

        return { success: true, result };
      } catch (error) {
        return {
          success: false,
          error: (error as Error)?.message ?? String(error),
        };
      }
    },
  });
