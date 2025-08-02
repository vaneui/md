import React from "react";
import { Link, Title, List, Col, Row, Text, Badge, Card, Divider, ListItem } from "@vaneui/ui";

// Utility function to extract plain text from nested components (for headings)
const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (React.isValidElement(node)) {
    // Always try to extract from children for any React element
    const props = node.props as { children?: React.ReactNode; content?: string };
    // Check for content prop first (for MdText/MdCode), then children
    if (props.content) {
      return props.content;
    }
    return extractText(props.children) || '';
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  return '';
};


// Document & Structure Components
export const MdDocument: React.FC<React.PropsWithChildren> = (props) => {
  return <Col {...(props as Record<string, unknown>)} />;
};

// Heading Component
export const MdHeading: React.FC<React.PropsWithChildren> = (props) => {
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
export const MdParagraph: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="p">{children}</Text>;
};

export const MdStrong: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="strong" bold>{children}</Text>;
};

export const MdEm: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="em" italic>{children}</Text>;
};

export const MdS: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="s" style={{ textDecoration: 'line-through' }}>{children}</Text>;
};

export const MdCode: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  return <Badge {...rest}>{content || children}</Badge>;
};

// Link Component
export const MdLink: React.FC<React.PropsWithChildren> = (props) => {
  const { href, title, children, ...rest } = props as { href: string; title?: string; children: React.ReactNode } & Record<string, unknown>;
  return <Link link {...rest} href={href} title={title}>{children}</Link>;
};

// Image Component
export const MdImage: React.FC<unknown> = (props) => {
  const { src, alt, title, ...rest } = props as { src: string; alt?: string; title?: string } & Record<string, unknown>;
  return (
    <img {...rest} title={title} src={src} alt={alt || ""} style={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: '0.5rem' }} />
  );
};

// List Components
export const MdList: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <List {...rest}>{children}</List>;
};

export const MdItem: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <ListItem {...rest}>{children}</ListItem>;
};

// Block Components
export const MdBlockquote: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card {...rest} style={{ borderLeft: '4px solid #d1d5db', paddingLeft: '1rem' }}>
      {children}
    </Card>
  );
};

export const MdHr: React.FC<unknown> = (props) => {
  return <Divider {...(props as Record<string, unknown>)} />;
};

// Code Block Component
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

// Table Components
export const MdTable: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card style={{ overflow: 'auto', margin: '1rem 0' }}>
      <table {...rest} style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </Card>
  );
};

export const MdThead: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <thead {...rest}>{children}</thead>;
};

export const MdTbody: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tbody {...rest}>{children}</tbody>;
};

export const MdTr: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tr {...rest}>{children}</tr>;
};

export const MdTd: React.FC<React.PropsWithChildren> = (props) => {
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

export const MdTh: React.FC<React.PropsWithChildren> = (props) => {
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

// Break Components
export const MdHardbreak: React.FC<unknown> = () => {
  return <br />;
};

export const MdSoftbreak: React.FC<unknown> = () => {
  return <> </>;
};

// Error Component
export const MdError: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card {...rest} style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626', margin: '1rem 0' }}>
      <Text bold>Error:</Text> {children}
    </Card>
  );
};