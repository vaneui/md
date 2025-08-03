import React from "react";
import { Card } from "@vaneui/ui";

export const MdFence: React.FC<unknown> = (props) => {
  const { content, language, ...rest } = props as { content: string; language?: string } & Record<string, unknown>;
  return (
    <Card {...rest}>
      <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
        <code className={language ? `language-${language}` : ""}>
          {content}
        </code>
      </pre>
    </Card>
  );
};