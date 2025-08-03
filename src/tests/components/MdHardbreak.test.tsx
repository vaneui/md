import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdHardbreak Component', () => {
  test('renders line break element', () => {
    const content = 'First line  \nSecond line';
    const { container } = render(<Md content={content} />);
    const br = container.querySelector('br');
    expect(br).toBeInTheDocument();
  });
});