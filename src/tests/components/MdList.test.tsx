import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdList Component', () => {
  test('renders unordered list with children', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    const { container } = render(<Md content={content} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    
    const list = container.querySelector('ul');
    expect(list).toBeInTheDocument();
    // VaneUI List component classes for unordered lists (disc: true)
    expect(list).toHaveClass('list-disc', 'list-inside');
    // Size is inherited from theme defaults, not always set explicitly
    expect(list).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(list).toHaveClass('font-sans', 'font-normal');
  });

  test('renders ordered list with correct classes', () => {
    const content = '1. First item\n2. Second item';
    const { container } = render(<Md content={content} />);
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    
    // Check for ordered list - should have decimal styling
    const list = container.querySelector('ol');
    expect(list).toBeInTheDocument();
    // VaneUI List component classes for ordered lists (decimal: true)
    expect(list).toHaveClass('list-decimal', 'list-inside');
    expect(list).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(list).toHaveClass('font-sans', 'font-normal');
  });

  test('renders unordered list with disc styling', () => {
    const content = '- First item\n- Second item';
    const { container } = render(<Md content={content} />);
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    
    // Check for unordered list - should have disc styling
    const list = container.querySelector('ul');
    expect(list).toBeInTheDocument();
    // VaneUI List component classes for unordered lists (disc: true)
    expect(list).toHaveClass('list-disc', 'list-inside');
    expect(list).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(list).toHaveClass('font-sans', 'font-normal');
  });

  test('correctly differentiates between ordered and unordered lists', () => {
    const content = `Unordered list:
- Apple
- Banana

Ordered list:
1. First step
2. Second step`;

    const { container } = render(<Md content={content} />);
    
    // Should have both ul and ol elements
    const unorderedList = container.querySelector('ul');
    const orderedList = container.querySelector('ol');
    
    expect(unorderedList).toBeInTheDocument();
    expect(orderedList).toBeInTheDocument();
    
    // Verify different styling based on ordered attribute
    expect(unorderedList).toHaveClass('list-disc'); // disc: true
    expect(orderedList).toHaveClass('list-decimal'); // decimal: true
    
    // Both should have common List component classes
    expect(unorderedList).toHaveClass('list-inside', 'font-sans', 'font-normal');
    expect(unorderedList).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(orderedList).toHaveClass('list-inside', 'font-sans', 'font-normal');
    expect(orderedList).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
  });
});