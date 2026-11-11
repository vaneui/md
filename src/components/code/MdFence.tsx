import React from "react";
import { Card } from "@vaneui/ui";
import { rendererThemeOf, type HighlightFn, type MdRenderContext } from "../../renderContext";
import type { MdRendererProps } from "../../rendererTheme";
import { renderSpec } from "../../spec";
import { MdError } from "../errors/MdError";

const renderCodeBlock = (
  content: string,
  language: string | undefined,
  rest: Record<string, unknown>,
  fenceProps: MdRendererProps | undefined,
  highlight?: HighlightFn,
) => (
  <Card {...fenceProps} {...rest}>
    {highlight ? (
      highlight(content, language)
    ) : (
      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.875rem" }}>
        <code className={language ? `language-${language}` : ""}>{content}</code>
      </pre>
    )}
  </Card>
);

export const MdFence: React.FC<unknown> = (props) => {
  const { content, language, mdContext, ...rest } = props as { content: string; language?: string; mdContext?: MdRenderContext } & Record<string, unknown>;
  const registry = mdContext?.registry ?? {};
  const parser = mdContext?.parseFrontmatter;
  const theme = rendererThemeOf(mdContext);
  const highlight = mdContext?.highlight;
  const sanitize = mdContext?.sanitize;

  if (language === "vaneui") {
    if (!parser) {
      return renderCodeBlock(content, language, rest, theme.mdFence, highlight);
    }
    try {
      const spec = parser(content);
      return <>{renderSpec(spec, registry, { sanitize })}</>;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return (
        <>
          <MdError mdContext={mdContext}>{`vaneui spec parse error: ${message}`}</MdError>
          {renderCodeBlock(content, language, rest, theme.mdFence, highlight)}
        </>
      );
    }
  }

  return renderCodeBlock(content, language, rest, theme.mdFence, highlight);
};
