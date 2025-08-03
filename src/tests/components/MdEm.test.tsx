import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdEm Component', () => {
  test('renders em element with content', () => {
    const content = 'This is *italic text* in markdown.';
    render(<Md content={content} />);
    const em = screen.getByText('italic text');
    expect(em).toBeInTheDocument();
    expect(em.tagName).toBe('EM');
    // VaneUI Text component classes for emphasized text
    expect(em).toHaveClass('italic'); // italic styling
    expect(em).toHaveClass('font-sans');
  });
});