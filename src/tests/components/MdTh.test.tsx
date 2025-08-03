import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTh Component', () => {
  test('renders table header with content', () => {
    const content = '| Header content | Another header |\n|----------------|----------------|';
    render(<Md content={content} />);
    const th = screen.getByText('Header content');
    expect(th).toBeInTheDocument();
    expect(th.tagName).toBe('TH');
  });
});