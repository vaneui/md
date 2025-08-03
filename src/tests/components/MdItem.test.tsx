import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdItem Component', () => {
  test('renders list item with content', () => {
    const content = '- List item content\n- Another item';
    render(<Md content={content} />);
    const item = screen.getByText('List item content');
    expect(item).toBeInTheDocument();
    expect(item.tagName).toBe('LI');
  });
});