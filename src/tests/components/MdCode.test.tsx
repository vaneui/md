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
    expect(code).toHaveClass('px-1.5', 'py-1', 'text-sm', 'gap-1.5');
    expect(code).toHaveClass('bg-(--background-color-secondary)', 'text-(--text-color-secondary)');
    expect(code).toHaveClass('border-(--border-color-secondary)', 'ring-(--border-color-secondary)');
    expect(code).toHaveClass('inline', 'rounded-(--ui-border-radius-md)');
    expect(code).toHaveClass('font-mono'); // monospace font for code
  });
});