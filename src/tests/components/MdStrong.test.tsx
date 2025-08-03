import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdStrong Component', () => {
  test('renders strong element with content', () => {
    const content = 'This is **bold text** in markdown.';
    render(<Md content={content} />);
    const strong = screen.getByText('bold text');
    expect(strong).toBeInTheDocument();
    expect(strong.tagName).toBe('STRONG');
    // VaneUI Text component classes for strong text
    expect(strong).toHaveClass('font-bold'); // strong styling
    expect(strong).toHaveClass('font-sans');
  });
});