import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTr Component', () => {
  test('renders table row with content', () => {
    const content = '| Header |\n|--------|\n| Cell 1 |\n| Cell 2 |';
    render(<Md content={content} />);
    const tr = screen.getByText('Cell 1').closest('tr');
    expect(tr).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
  });
});