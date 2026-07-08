import React, { useContext } from "react";
import { Card } from "@vaneui/ui";
import { HighlightContext, ParserContext, RegistryContext, type HighlightFn } from "../../context";
import { RendererThemeContext, type MdRendererProps } from "../../rendererTheme";
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
  const { content, language, ...rest } = props as { content: string; language?: string } & Record<string, unknown>;
  const registry = useContext(RegistryContext);
  const parser = useContext(ParserContext);
  const theme = useContext(RendererThemeContext);
  const highlight = useContext(HighlightContext);

  if (language === "vaneui") {
    if (!parser) {
      return renderCodeBlock(content, language, rest, theme.mdFence, highlight);
    }
    try {
      const spec = parser(content);
      return <>{renderSpec(spec, registry)}</>;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return (
        <>
          <MdError>{`vaneui spec parse error: ${message}`}</MdError>
          {renderCodeBlock(content, language, rest, theme.mdFence, highlight)}
        </>
      );
    }
  }

  return renderCodeBlock(content, language, rest, theme.mdFence, highlight);
};
