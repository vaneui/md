import React from 'react';
import { render } from '@testing-library/react';
import { MdStream, splitBlocks } from '../stream';

describe('splitBlocks', () => {
  it('splits on blank lines', () => {
    expect(splitBlocks('a\n\nb')).toEqual(['a', 'b']);
  });

  it('does not split inside a fenced code block', () => {
    const src = 'a\n\n```js\ncode\n\nmore\n```\n\nb';
    expect(splitBlocks(src)).toEqual(['a', '```js\ncode\n\nmore\n```', 'b']);
  });

  it('keeps an unterminated (still streaming) fence as one trailing block', () => {
    expect(splitBlocks('```js\ncode')).toEqual(['```js\ncode']);
  });
});

describe('MdStream', () => {
  it('renders every complete block', () => {
    const { container } = render(<MdStream content={'# A\n\n# B'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(2);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });

  it('renders appended content after the stream grows', () => {
    const { container, rerender } = render(<MdStream content={'# A'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    rerender(<MdStream content={'# A\n\n# B\n\n# C'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(3);
    expect(container.textContent).toContain('C');
  });
});
