import { useEffect } from "react";
import { Project } from "./data";
type Registry = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function usePortfolioTools(projects: Project[]) {
  useEffect(() => {
    const ctx = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: "list_filtered_projects",
            description:
              "Read up to 20 projects from the currently visible filtered portfolio, in the selected sort order. Returns rule-based review priorities, not event probabilities.",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "integer", minimum: 1, maximum: 20 },
              },
              required: ["limit"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== "object" ||
                !("limit" in input) ||
                !Number.isInteger(input.limit) ||
                Number(input.limit) < 1 ||
                Number(input.limit) > 20 ||
                Object.keys(input).some((k) => k !== "limit")
              )
                throw new Error(
                  "limit must be an integer from 1 to 20; no other fields are accepted",
                );
              return {
                total: projects.length,
                projects: projects.slice(0, Number(input.limit)).map((p) => ({
                  id: p.id,
                  name: p.name,
                  month: p.month,
                  priority: p.band,
                  rule_index: p.eligible ? p.score : null,
                  source_file: p.source_file,
                  source_page: p.source_page,
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser capability; interface continues normally. */
    }
    return () => lifecycle.abort();
  }, [projects]);
}
