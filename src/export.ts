import type { Project } from "./data.ts";

const fields = [
  "id",
  "name",
  "state",
  "ministry",
  "month",
  "original_cost",
  "revised_cost",
  "expenditure",
  "progress",
  "score",
  "band",
  "source_file",
  "source_page",
] as const;

export function portfolioCsv(projects: Project[]): string {
  const escape = (input: unknown) => {
    const value = String(input ?? "");
    const safe = /^\s*[=+@-]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return [
    fields.join(","),
    ...projects.map((p) =>
      fields
        .map((key) => escape(key === "score" && !p.eligible ? null : p[key]))
        .join(","),
    ),
  ].join("\r\n");
}
