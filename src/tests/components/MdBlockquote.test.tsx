import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdBlockquote Component', () => {
  test('renders blockquote with content', () => {
    const content = '> This is a blockquote text';
    const { container } = render(<Md content={content} />);
    const blockquoteText = screen.getByText('This is a blockquote text');
    expect(blockquoteText).toBeInTheDocument();
    
    // Find the Card container (blockquote is now rendered as Card)
    const cardElement = blockquoteText.closest('div[style*="border-left"]');
    expect(cardElement).toBeInTheDocument();
    // VaneUI Card component classes with CSS variables
    expect(cardElement).toHaveClass('px-(--px-desktop)', 'py-(--py-desktop)', 'gap-(--gap-desktop)', 'flex');
    expect(cardElement).toHaveClass('border-[length:var(--bw)]', 'rounded-(--br)');
    expect(cardElement).toHaveClass('flex-col'); // Card layout
    expect(cardElement).toHaveClass('bg-(--bg-color)', 'text-(--text-color)', 'border-(--border-color)', 'font-normal');
    // Verify custom border-left styling for blockquotes
    expect(cardElement).toHaveStyle('border-left: 4px solid #d1d5db');
    expect(cardElement).toHaveStyle('padding-left: 1rem');
  });
});