import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdCode Component', () => {
  test('renders code element with content and CSS class', () => {
    const content = 'This has `code snippet` inline.';
    render(<Md content={content} />);
    const code = screen.getByText('code snippet');
    expect(code).toBeInTheDocument();
    // VaneUI Code component with secondary prop has these classes
    expect(code).toHaveClass('px-(--px-desktop)', 'py-(--py-desktop)');
    // Code size is managed by CSS variables, may not be explicit as class
    expect(code).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(code).toHaveClass('bg-(--bg-color)', 'text-(--text-color)');
    expect(code).toHaveClass('ring-(--ring-color)');
    expect(code).toHaveClass('inline', 'rounded-(--br)');
    expect(code).toHaveClass('ring-[length:var(--rw)]', 'ring-inset', 'font-mono', 'font-semibold'); // monospace font for code
  });
});