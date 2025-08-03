import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdInline Component', () => {
  test('renders inline span with content', () => {
    const content = 'This has **bold**, *italic*, and `code` inline elements.';
    render(<Md content={content} />);
    const boldText = screen.getByText('bold');
    const italicText = screen.getByText('italic');
    const codeText = screen.getByText('code');
    expect(boldText).toBeInTheDocument();
    expect(italicText).toBeInTheDocument();
    expect(codeText).toBeInTheDocument();
  });
});