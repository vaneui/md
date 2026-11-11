import React from "react";
import { Col } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdDocument: React.FC<MdRendererBaseProps> = (props) => {
  const { className, mdContext, ...rest } = props as { className?: string; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  const slotClassName = (theme.mdDocument as { className?: string } | undefined)?.className;
  // `noGap` leaves block spacing to the `.vaneui-md` prose-rhythm CSS; the mdDocument slot can override it.
  return (
    <Col
      noGap
      {...theme.mdDocument}
      {...rest}
      className={["vaneui-md", slotClassName, className].filter(Boolean).join(" ")}
    />
  );
};
