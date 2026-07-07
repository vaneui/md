import React, { useContext } from "react";
import { Col } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdDocument: React.FC<React.PropsWithChildren> = (props) => {
  const theme = useContext(RendererThemeContext);
  const { className, ...rest } = props as { className?: string } & Record<string, unknown>;
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
