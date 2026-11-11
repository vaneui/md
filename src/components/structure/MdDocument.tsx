import React from "react";
import { Col } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdDocument: React.FC<MdRendererBaseProps> = (props) => {
  const { className, mdContext, ...rest } = props as { className?: string; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  const slotClassName = (theme.mdDocument as { className?: string } | undefined)?.className;
  // `noGap` hands all inter-block spacing to the `.vaneui-md` prose-rhythm CSS
  // layer (styles/index.css) so headings/paragraphs get an asymmetric,
  // size-scaled rhythm instead of one uniform flex gap. A consumer can still
  // override via the mdDocument slot (e.g. `{ gap: true }`).
  return (
    <Col
      noGap
      {...theme.mdDocument}
      {...rest}
      className={["vaneui-md", slotClassName, className].filter(Boolean).join(" ")}
    />
  );
};
