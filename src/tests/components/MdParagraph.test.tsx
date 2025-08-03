import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdParagraph Component', () => {
  test('renders paragraph with text', () => {
    const content = 'This is a paragraph text.';
    const { container } = render(<Md content={content} />);
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent('This is a paragraph text.');
  });

  test('renders multiple paragraphs', () => {
    const content = 'First paragraph.\n\nSecond paragraph.';
    const { container } = render(<Md content={content} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('First paragraph.');
    expect(paragraphs[1]).toHaveTextContent('Second paragraph.');
  });
});