import { Link, Title, List } from "@vaneui/ui";
import Markdoc from "@markdoc/markdoc";
import React from "react";
import { Col } from "@vaneui/ui";

const MdHeading: React.FC<unknown> = (props) => {
  const {level, ...rest} = props as { level: number; } & Record<string, unknown>;
  const tag = `h${level}`;
  let size: { xs?: boolean; sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean } = {};
  switch (level) {
    case 1:
      size = {xl: true};
      break;
    case 2:
      size = {lg: true};
      break;
    case 3:
      size = {md: true};
      break;
    case 4:
      size = {sm: true};
      break;
    case 5:
      size = {xs: true};
      break;
  }
  return <Title {...rest} {...size} tag={tag}/>;
};

const MdLink: React.FC<unknown> = (props) => {
  const {href, title, ...rest} = props as { href: string; title: string; } & Record<string, unknown>;
  return <Link link {...rest} href={href} title={title} tag={Link}/>;
};

const MdImg: React.FC<unknown> = (props) => {
  const {src, alt, title, ...rest} = props as { src: string; alt: string; title: string; } & Record<string, unknown>;
  return (
    <img {...rest} title={title} src={src} alt={alt} className="w-fit rounded-lg"/>
  );
};

const MdContainer: React.FC<unknown> = (props) => <Col {...(props as Record<string, unknown>)} />;

const MdList: React.FC<unknown> = (props) => <List {...(props as Record<string, unknown>)} />;

export const Md: React.FC<{ content: string, frontmatter?: { [key: string]: unknown } }> = ({content, frontmatter}) => {
  const ast = Markdoc.parse(content);
  const config = {
    nodes: {
      document: {
        render: "MdContainer",
      },
      heading: {
        render: "MdHeading",
        attributes: {
          level: {type: Number},
        },
      },
      link: {
        render: "MdLink",
        attributes: {
          href: {type: String},
          title: {type: String},
        },
      },
      list: {
        render: "MdList",
      },
      image: {
        render: "MdImg",
        attributes: {
          src: {type: String},
          alt: {type: String},
          title: {type: String},
        },
      },
    },
    variables: {markdoc: {frontmatter}}
  }

  const transformed = Markdoc.transform(ast, config);

  return Markdoc.renderers.react(transformed, React, {
    components: {
      MdHeading: MdHeading,
      MdContainer: MdContainer,
      MdLink: MdLink,
      MdList: MdList,
      MdImg: MdImg,
    },
  });
};
