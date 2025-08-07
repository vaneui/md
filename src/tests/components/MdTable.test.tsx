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
    const cardWrapper = table.closest('div.px-4');
    expect(cardWrapper).toBeInTheDocument();
    // VaneUI Card component classes
    expect(cardWrapper).toHaveClass('px-4', 'py-4', 'gap-4', 'flex');
    expect(cardWrapper).toHaveClass('border', 'rounded-(--layout-border-radius-md)');
    expect(cardWrapper).toHaveClass('flex-col');
    
    // Verify table styling
    expect(table).toHaveStyle('width: 100%');
    expect(table).toHaveStyle('border-collapse: collapse');
    
    // Verify card wrapper has overflow styling
    expect(cardWrapper).toHaveStyle('overflow: auto');
    expect(cardWrapper).toHaveStyle('margin: 1rem 0px');
  });
});