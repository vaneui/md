import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdThead Component', () => {
  test('renders table head with content', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|';
    render(<Md content={content} />);
    const thead = screen.getByText('Header 1').closest('thead');
    expect(thead).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Header 2')).toBeInTheDocument();
  });
});