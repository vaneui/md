import React, { useContext } from "react";
import { Card } from "@vaneui/ui";
import { ParserContext, RegistryContext } from "../../context";
import { RendererThemeContext } from "../../rendererTheme";
import { renderSpec } from "../../spec";
import { MdError } from "../errors/MdError";

const renderCodeBlock = (
  content: string,
  language: string | undefined,
  rest: Record<string, unknown>,
  fenceProps: Record<string, unknown> | undefined
) => (
  <Card {...fenceProps} {...rest}>
    <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.875rem" }}>
      <code className={language ? `language-${language}` : ""}>{content}</code>
    </pre>
  </Card>
);

export const MdFence: React.FC<unknown> = (props) => {
  const { content, language, ...rest } = props as { content: string; language?: string } & Record<string, unknown>;
  const registry = useContext(RegistryContext);
  const parser = useContext(ParserContext);
  const theme = useContext(RendererThemeContext);

  if (language === "vaneui") {
    if (!parser) {
      return renderCodeBlock(content, language, rest, theme.fence);
    }
    try {
      const spec = parser(content);
      return <>{renderSpec(spec, registry)}</>;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return (
        <>
          <MdError>{`vaneui spec parse error: ${message}`}</MdError>
          {renderCodeBlock(content, language, rest, theme.fence)}
        </>
      );
    }
  }

  return renderCodeBlock(content, language, rest, theme.fence);
};
