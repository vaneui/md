import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTbody Component', () => {
  test('renders table body with content', () => {
    const content = '| Header |\n|--------|\n| Row 1  |\n| Row 2  |';
    render(<Md content={content} />);
    const tbody = screen.getByText('Row 1').closest('tbody');
    expect(tbody).toBeInTheDocument();
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 2')).toBeInTheDocument();
  });
});