import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdFence Component', () => {
  test('renders code block with content', () => {
    const content = '```\nconst x = 42;\n```';
    render(<Md content={content} />);
    const codeBlock = screen.getByText('const x = 42;');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock.tagName).toBe('CODE');
  });

  test('renders code block with language class', () => {
    const content = '```javascript\nfunction test() {}\n```';
    render(<Md content={content} />);
    const codeBlock = screen.getByText('function test() {}');
    expect(codeBlock).toHaveClass('language-javascript');
  });

  test('renders code block without language class when not provided', () => {
    const content = '```\nplain code\n```';
    render(<Md content={content} />);
    const codeBlock = screen.getByText('plain code');
    expect(codeBlock).not.toHaveClass('language-javascript');
  });
});