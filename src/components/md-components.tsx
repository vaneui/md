import React from "react";
import { Link, Title, List, Col, Row, Text } from "@vaneui/ui";

// Document & Structure Components
export const MdDocument: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  return <Col {...(props as Record<string, unknown>)} />;
};

// Heading Component
export const MdHeading: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { level, children, ...rest } = props as { level: number; children: React.ReactNode } & Record<string, unknown>;
  const tag = `h${level}`;
  let size: { xs?: boolean; sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean } = {};
  switch (level) {
    case 1:
      size = { xl: true };
      break;
    case 2:
      size = { lg: true };
      break;
    case 3:
      size = { md: true };
      break;
    case 4:
      size = { sm: true };
      break;
    case 5:
    case 6:
      size = { xs: true };
      break;
  }
  return <Title {...rest} {...size} tag={tag}>{children}</Title>;
};

// Text Components
export const MdParagraph: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="p">{children}</Text>;
};

export const MdText: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  // Markdoc passes text content in the 'content' prop for text nodes
  return <>{content || children}</>;
};

export const MdStrong: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="strong" bold>{children}</Text>;
};

export const MdEm: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="em" italic>{children}</Text>;
};

export const MdS: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="s" style={{ textDecoration: 'line-through' }}>{children}</Text>;
};

export const MdCode: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="code" className="md-code">{children}</Text>;
};

// Link Component
export const MdLink: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { href, title, children, ...rest } = props as { href: string; title?: string; children: React.ReactNode } & Record<string, unknown>;
  return <Link link {...rest} href={href} title={title}>{children}</Link>;
};

// Image Component
export const MdImage: React.FC<unknown> = (props) => {
  const { src, alt, title, ...rest } = props as { src: string; alt?: string; title?: string } & Record<string, unknown>;
  return (
    <img {...rest} title={title} src={src} alt={alt || ""} className="md-image" />
  );
};

// List Components
export const MdList: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <List {...rest} className="md-list">{children}</List>;
};

export const MdItem: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <li {...rest} className="md-list-item">{children}</li>;
};

// Block Components
export const MdBlockquote: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <blockquote {...rest} className="md-blockquote">
      {children}
    </blockquote>
  );
};

export const MdHr: React.FC<unknown> = (props) => {
  return <hr {...(props as Record<string, unknown>)} className="md-hr" />;
};

// Code Block Component
export const MdFence: React.FC<unknown> = (props) => {
  const { content, language, ...rest } = props as { content: string; language?: string } & Record<string, unknown>;
  return (
    <div {...rest} className="md-fence">
      <pre>
        <code className={language ? `language-${language}` : ""}>
          {content}
        </code>
      </pre>
    </div>
  );
};

// Table Components
export const MdTable: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <div className="md-table-container">
      <table {...rest} className="md-table">
        {children}
      </table>
    </div>
  );
};

export const MdThead: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <thead {...rest}>{children}</thead>;
};

export const MdTbody: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tbody {...rest}>{children}</tbody>;
};

export const MdTr: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tr {...rest}>{children}</tr>;
};

export const MdTd: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, align, colspan, rowspan, ...rest } = props as { 
    children: React.ReactNode; 
    align?: string; 
    colspan?: number; 
    rowspan?: number 
  } & Record<string, unknown>;
  
  return (
    <td 
      {...rest} 
      style={{ textAlign: align as any }}
      colSpan={colspan}
      rowSpan={rowspan}
    >
      {children}
    </td>
  );
};

export const MdTh: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, align, width, ...rest } = props as { 
    children: React.ReactNode; 
    align?: string; 
    width?: string | number 
  } & Record<string, unknown>;
  
  return (
    <th 
      {...rest} 
      style={{ textAlign: align as any, width }}
    >
      {children}
    </th>
  );
};

// Inline Component
export const MdInline: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <span {...rest}>{children}</span>;
};

// Break Components
export const MdHardbreak: React.FC<unknown> = () => {
  return <br />;
};

export const MdSoftbreak: React.FC<unknown> = () => {
  return <> </>;
};

// Error Component
export const MdError: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <div {...rest} className="md-error">
      <Text bold>Error:</Text> {children}
    </div>
  );
};