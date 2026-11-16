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
    expect(list).toHaveClass('list-disc', 'list-outside');
    // Size is inherited from theme defaults, not always set explicitly
    expect(list).toHaveClass('text-(length:--fs)'); // CSS variable font size
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
    expect(list).toHaveClass('list-decimal', 'list-outside');
    expect(list).toHaveClass('text-(length:--fs)'); // CSS variable font size
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
    expect(list).toHaveClass('list-disc', 'list-outside');
    expect(list).toHaveClass('text-(length:--fs)'); // CSS variable font size
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
    expect(unorderedList).toHaveClass('list-outside', 'font-sans', 'font-normal');
    expect(unorderedList).toHaveClass('text-(length:--fs)'); // CSS variable font size
    expect(orderedList).toHaveClass('list-outside', 'font-sans', 'font-normal');
    expect(orderedList).toHaveClass('text-(length:--fs)'); // CSS variable font size
  });

  test('starts an ordered list at the number it is written with', () => {
    const { container } = render(<Md content={'3. three\n4. four'} />);
    const list = container.querySelector('ol');
    expect(list).toHaveAttribute('start', '3');
    expect(list).toHaveClass('list-decimal');
    expect(Array.from(container.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['three', 'four']);
  });

  test('keeps the start number of a loose list, a nested list and a list with ")" markers', () => {
    const loose = render(<Md content={'5. five\n\n6. six'} />).container;
    expect(loose.querySelectorAll('ol')).toHaveLength(1);
    expect(loose.querySelector('ol')).toHaveAttribute('start', '5');

    const nested = render(<Md content={'1. one\n\n   7. seven\n   8. eight\n\n2. two'} />).container;
    expect(nested.querySelector('ol')).not.toHaveAttribute('start');
    expect(nested.querySelector('ol ol')).toHaveAttribute('start', '7');

    const parens = render(<Md content={'42) answer\n43) next'} />).container;
    expect(parens.querySelector('ol')).toHaveAttribute('start', '42');
  });

  test('adds no start attribute to a list that starts at 1 or to an unordered list', () => {
    const { container } = render(<Md content={'1. one\n2. two\n\ntext\n\n- a\n- b'} />);
    expect(container.querySelector('ol')).not.toHaveAttribute('start');
    expect(container.querySelector('ul')).not.toHaveAttribute('start');
  });

  test('passes start to a custom MdList component', () => {
    const seen: unknown[] = [];
    const CustomList = (props: { ordered?: boolean; start?: number; children?: React.ReactNode }) => {
      seen.push([props.ordered, props.start]);
      return <div>{props.children}</div>;
    };
    render(<Md content={'9. nine\n\ntext\n\n- a'} config={{ components: { MdList: CustomList } }} />);
    expect(seen).toEqual([[true, 9], [false, undefined]]);
  });

  test('ignores a start number on an unordered list and one that is not a whole number', () => {
    const { MdList } = jest.requireActual('../../components/lists/MdList') as typeof import('../../components/lists/MdList');
    const Loose = MdList as React.FC<Record<string, unknown>>;
    const unordered = render(<Loose start={3}><li>a</li></Loose>).container;
    expect(unordered.querySelector('ul')).not.toHaveAttribute('start');
    const fraction = render(<Loose ordered start={'2.5'}><li>a</li></Loose>).container;
    expect(fraction.querySelector('ol')).not.toHaveAttribute('start');
    const whole = render(<Loose ordered start={4}><li>a</li></Loose>).container;
    expect(whole.querySelector('ol')).toHaveAttribute('start', '4');
  });
});
