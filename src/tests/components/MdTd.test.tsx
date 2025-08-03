import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdTd Component', () => {
  test('renders table cell with content', () => {
    const content = '| Header |\n|--------|\n| Cell content |';
    const { container } = render(<Md content={content} />);
    const td = container.querySelector('td');
    expect(td).toBeInTheDocument();
    expect(td).toHaveTextContent('Cell content');
  });

  test('renders table with alignment', () => {
    const content = '| Left | Center | Right |\n|:-----|:------:|------:|\n| L1 | C1 | R1 |';
    const { container } = render(<Md content={content} />);
    const tds = container.querySelectorAll('td');
    expect(tds).toHaveLength(3);
    expect(tds[0]).toHaveTextContent('L1');
    expect(tds[1]).toHaveTextContent('C1');
    expect(tds[2]).toHaveTextContent('R1');
  });

  test('renders complex table correctly', () => {
    const content = '| Name | Age | City |\n|------|-----|------|\n| John | 25 | NY |\n| Jane | 30 | LA |';
    const { container } = render(<Md content={content} />);
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    const tds = container.querySelectorAll('tbody td');
    expect(tds).toHaveLength(6);
    expect(tds[0]).toHaveTextContent('John');
    expect(tds[3]).toHaveTextContent('Jane');
  });
});