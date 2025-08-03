import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdSoftbreak Component', () => {
  test('renders space character', () => {
    const content = 'Word1\nWord2';
    const { container } = render(<Md content={content} />);
    expect(container.textContent).toBe('Word1 Word2');
  });
});