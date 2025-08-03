import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdS Component', () => {
  test('renders s element with content', () => {
    const content = 'This is ~~strikethrough text~~ in markdown.';
    render(<Md content={content} />);
    const s = screen.getByText('strikethrough text');
    expect(s).toBeInTheDocument();
    expect(s.tagName).toBe('S');
  });
});