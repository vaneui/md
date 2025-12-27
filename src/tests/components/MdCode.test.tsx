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
    expect(code).toHaveClass('px-(--ui-px)', 'py-(--ui-py)');
    expect(code).toHaveClass('[--fs-unit:7]'); // sm size
    expect(code).toHaveClass('text-(length:--fs)'); // CSS variable font size
    expect(code).toHaveClass('[background:var(--color-bg-secondary)]', 'text-(--color-text-secondary)');
    expect(code).toHaveClass('ring-(--color-border-secondary)');
    expect(code).toHaveClass('inline', 'rounded-(--ui-br)');
    expect(code).toHaveClass('ring', 'ring-inset', 'font-mono', 'font-semibold'); // monospace font for code
  });
});