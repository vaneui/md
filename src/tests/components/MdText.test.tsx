import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdText Component', () => {
  test('renders plain text content', () => {
    const content = 'Simple text content';
    const { container } = render(<Md content={content} />);
    expect(container).toHaveTextContent('Simple text content');
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    // VaneUI Text component classes for paragraphs
    expect(paragraph).toHaveClass('p-0', 'm-0', 'w-fit');
    // Size is inherited from theme defaults, not always set explicitly
    expect(paragraph).toHaveClass('text-(length:--fs)'); // CSS variable font size
    expect(paragraph).toHaveClass('font-sans', 'text-left');
  });

  test('renders text with inline formatting', () => {
    const content = 'Text with **bold** and *italic* formatting';
    const { container } = render(<Md content={content} />);
    expect(container).toHaveTextContent('Text with bold and italic formatting');
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('em')).toHaveTextContent('italic');
  });

  test('renders text in paragraphs', () => {
    const content = 'First paragraph\n\nSecond paragraph';
    const { container } = render(<Md content={content} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('First paragraph');
    expect(paragraphs[1]).toHaveTextContent('Second paragraph');
  });
});