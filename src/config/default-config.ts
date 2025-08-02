import { MdNodesConfig, MdComponents } from "../types";
import * as Components from "../components/md-components";

// Default node configuration for Markdoc
export const defaultNodesConfig: MdNodesConfig = {
  document: {
    render: "MdDocument",
  },
  heading: {
    render: "MdHeading",
    attributes: {
      level: { type: Number, required: true },
    },
  },
  paragraph: {
    render: "MdParagraph",
  },
  hr: {
    render: "MdHr",
  },
  image: {
    render: "MdImage",
    attributes: {
      src: { type: String, required: true },
      alt: { type: String },
      title: { type: String },
    },
  },
  fence: {
    render: "MdFence",
    attributes: {
      content: { type: String },
      language: { type: String },
    },
  },
  blockquote: {
    render: "MdBlockquote",
  },
  list: {
    render: "MdList",
  },
  item: {
    render: "MdItem",
  },
  table: {
    render: "MdTable",
  },
  thead: {
    render: "MdThead",
  },
  tbody: {
    render: "MdTbody",
  },
  tr: {
    render: "MdTr",
  },
  td: {
    render: "MdTd",
    attributes: {
      align: { type: String },
      colspan: { type: Number },
      rowspan: { type: Number },
    },
  },
  th: {
    render: "MdTh",
    attributes: {
      align: { type: String },
      width: { type: String },
    },
  },
  strong: {
    render: "MdStrong",
  },
  em: {
    render: "MdEm",
  },
  s: {
    render: "MdS",
  },
  link: {
    render: "MdLink",
    attributes: {
      href: { type: String, required: true },
      title: { type: String },
    },
  },
  code: {
    render: "MdCode",
    attributes: {
      content: { type: String }
    }
  },
  hardbreak: {
    render: "MdHardbreak",
  },
  softbreak: {
    render: "MdSoftbreak",
  },
  error: {
    render: "MdError",
  },
};

// Default component mapping
export const defaultComponents: MdComponents = {
  MdDocument: Components.MdDocument,
  MdHeading: Components.MdHeading,
  MdParagraph: Components.MdParagraph,
  MdHr: Components.MdHr,
  MdImage: Components.MdImage,
  MdFence: Components.MdFence,
  MdBlockquote: Components.MdBlockquote,
  MdList: Components.MdList,
  MdItem: Components.MdItem,
  MdTable: Components.MdTable,
  MdThead: Components.MdThead,
  MdTbody: Components.MdTbody,
  MdTr: Components.MdTr,
  MdTd: Components.MdTd,
  MdTh: Components.MdTh,
  MdStrong: Components.MdStrong,
  MdEm: Components.MdEm,
  MdS: Components.MdS,
  MdLink: Components.MdLink,
  MdCode: Components.MdCode,
  MdHardbreak: Components.MdHardbreak,
  MdSoftbreak: Components.MdSoftbreak,
  MdError: Components.MdError,
};