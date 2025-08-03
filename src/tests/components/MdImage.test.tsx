import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdImage Component', () => {
  test('renders image with src and alt', () => {
    const content = '![Test image](https://example.com/image.jpg)';
    render(<Md content={content} />);
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    
    // Image styling (direct inline styles from MdImage component)
    expect(img).toHaveStyle('display: block');
    expect(img).toHaveStyle('max-width: 100%');
    expect(img).toHaveStyle('height: auto');
    expect(img).toHaveStyle('border-radius: 0.5rem');
  });

  test('renders image with title', () => {
    const content = '![Test](test.jpg "Image title")';
    render(<Md content={content} />);
    const img = screen.getByAltText('Test');
    expect(img).toHaveAttribute('title', 'Image title');
    expect(img).toHaveAttribute('src', 'test.jpg');
  });

  test('renders image with empty alt', () => {
    const content = '![](test.jpg)';
    const { container } = render(<Md content={content} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', 'test.jpg');
  });
});