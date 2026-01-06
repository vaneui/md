import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTable Component', () => {
  test('renders table with content', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
    const { container } = render(<Md content={content} />);
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Header 2')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
    
    // Verify table is wrapped in Card component with CSS variables
    const cardWrapper = table.closest('div.flex');
    expect(cardWrapper).toBeInTheDocument();
    // VaneUI Card component classes with CSS variables
    expect(cardWrapper).toHaveClass('px-(--px-desktop)', 'py-(--py-desktop)');
    expect(cardWrapper).toHaveClass('gap-(--gap-desktop)', 'flex');
    expect(cardWrapper).toHaveClass('border-[length:var(--bw)]', 'rounded-(--br)');
    expect(cardWrapper).toHaveClass('flex-col');
    expect(cardWrapper).toHaveClass('[background:var(--bg-color)]', 'text-(--text-color)', 'border-(--border-color)');

    // Verify table styling
    expect(table).toHaveStyle('width: 100%');
    expect(table).toHaveStyle('border-collapse: collapse');

    // Verify card wrapper has overflow styling
    expect(cardWrapper).toHaveStyle('overflow: auto');
    expect(cardWrapper).toHaveStyle('margin: 1rem 0px');
  });
});