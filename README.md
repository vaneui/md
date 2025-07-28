# @vaneui/md

A React component for rendering Markdown content using @vaneui/ui components.

## Installation

```bash
npm install @vaneui/md @vaneui/ui
```

## Usage

```tsx
import React from 'react';
import { Markdown } from '@vaneui/md';

const App = () => {
  const markdownContent = `
# Hello World

This is a **markdown** component that uses VaneUI components.

- Item 1
- Item 2
- Item 3

> This is a blockquote

\`\`\`
console.log('Code block');
\`\`\`
  `;

  return (
    <div>
      <Markdown content={markdownContent} />
    </div>
  );
};

export default App;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | - | The markdown content to render |
| `className` | `string` | - | Additional CSS class names |

## Features

- Renders headings using VaneUI `Title` component
- Renders paragraphs using VaneUI `Text` component
- Renders lists using VaneUI `List` and `ListItem` components
- Renders blockquotes using VaneUI `Card` component
- Renders horizontal rules using VaneUI `Divider` component
- Renders code blocks using VaneUI `Card` and `Text` components

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
```