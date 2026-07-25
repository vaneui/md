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
    expect(code).toHaveClass('px-(--px)', 'py-(--py)');
    // Code uses local --spacing: 0.25em override so font-size resolves in em relative to parent
    expect(code).toHaveClass('text-(length:--fs)');
    expect(code).toHaveClass('bg-(--bg-color)', 'text-(--text-color)');
    expect(code).toHaveClass('inline', 'rounded-(--br)');
    expect(code).toHaveClass('font-mono', 'font-normal'); // monospace, normal weight for inline code
    expect(code).not.toHaveClass('ring-(--ring-color)'); // no ring by default now
  });
});