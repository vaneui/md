import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdDocument Component', () => {
  test('renders document container with content', () => {
    const content = '# Document Title\n\nThis is document content with **bold** and *italic* text.';
    render(<Md content={content} />);
    const title = screen.getByText('Document Title');
    const documentContent = screen.getByText(/This is document content/);
    expect(title).toBeInTheDocument();
    expect(documentContent).toBeInTheDocument();
  });
});