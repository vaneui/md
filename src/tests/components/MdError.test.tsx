import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdError Component', () => {
  test('renders invalid HTML tags as text content', () => {
    // Test with invalid markdown that might trigger error handling
    const content = '<invalid>markdown</invalid>';
    const { container } = render(<Md content={content} />);
    // The Md component should handle invalid content gracefully by rendering as text
    expect(container).toHaveTextContent('<invalid>markdown</invalid>');
  });

  test('renders unclosed code block gracefully', () => {
    // Test with another type of potentially problematic content
    const content = '```\nunclosed code block';
    const { container } = render(<Md content={content} />);
    // Should render as code block even if unclosed
    expect(container).toHaveTextContent('unclosed code block');
    expect(container.querySelector('code')).toBeInTheDocument();
  });
});