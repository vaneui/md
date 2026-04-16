import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdBlockquote Component', () => {
  test('renders blockquote with content', () => {
    const content = '> This is a blockquote text';
    render(<Md content={content} />);
    const blockquoteText = screen.getByText('This is a blockquote text');
    expect(blockquoteText).toBeInTheDocument();

    // Find the Card container (blockquote is rendered as Card with left-border accent)
    const cardElement = blockquoteText.closest('div.flex');
    expect(cardElement).toBeInTheDocument();
    // VaneUI Card component classes with CSS variables
    expect(cardElement).toHaveClass('px-(--px)', 'py-(--py)', 'gap-(--gap)', 'flex');
    expect(cardElement).toHaveClass('rounded-(--br)');
    expect(cardElement).toHaveClass('flex-col');
    expect(cardElement).toHaveClass('bg-(--bg-color)', 'text-(--text-color)', 'border-(--border-color)');
    // borderL-only (noBorder suppresses full border, borderL adds left accent)
    expect(cardElement).toHaveClass('border-l-[length:var(--bw)]');
    expect(cardElement).not.toHaveClass('border-[length:var(--bw)]');
    // secondary appearance for subtle blockquote look
    expect(cardElement).toHaveAttribute('data-appearance', 'secondary');
  });
});