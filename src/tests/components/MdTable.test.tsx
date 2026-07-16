import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTable Component', () => {
  test('renders the VaneUI Table inside an overflow-x scroll wrapper', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
    render(<Md content={content} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Header 2')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();

    // Renders the VaneUI Table (border-collapse, full width) — not a Card wrapper.
    expect(table).toHaveClass('vane-table', 'border-collapse', 'w-full');

    // Wrapped in an overflow-x-auto scroll container with a vertical margin.
    const wrapper = table.parentElement;
    expect(wrapper).toHaveClass('overflow-x-auto', 'my-4');
  });
});
