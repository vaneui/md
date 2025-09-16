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
    
    // Verify table is wrapped in Card component
    const cardWrapper = table.closest('div.px-6');
    expect(cardWrapper).toBeInTheDocument();
    // VaneUI Card component classes
    expect(cardWrapper).toHaveClass('px-6', 'py-6', 'gap-4', 'flex');
    expect(cardWrapper).toHaveClass('border', 'rounded-(--layout-br-md)');
    expect(cardWrapper).toHaveClass('flex-col');
    expect(cardWrapper).toHaveClass('bg-(--color-bg-layout-default)', 'text-(--color-text-default)', 'border-(--color-border-default)', 'font-normal');
    
    // Verify table styling
    expect(table).toHaveStyle('width: 100%');
    expect(table).toHaveStyle('border-collapse: collapse');
    
    // Verify card wrapper has overflow styling
    expect(cardWrapper).toHaveStyle('overflow: auto');
    expect(cardWrapper).toHaveStyle('margin: 1rem 0px');
  });
});