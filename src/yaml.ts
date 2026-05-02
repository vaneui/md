import { parse } from "yaml";

export const parseYamlFrontmatter = (raw: string): Record<string, unknown> => {
  const result = parse(raw);
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return {};
};
