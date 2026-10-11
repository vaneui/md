import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';
import { MdErrorInline } from '../../components/md-components';
import { defaultComponents } from '../../config/default-config';

describe('MdErrorInline Component', () => {
  test('renders a labelled span inside the paragraph', () => {
    const { container } = render(<Md content={'Before {% partial file="missing.md" /%} after.'} />);
    const p = container.querySelector('p')!;
    const error = p.querySelector('span[data-appearance]')!;
    expect(error).toBeInTheDocument();
    expect(error.firstElementChild).toHaveTextContent('Error:');
    expect(error.firstElementChild?.tagName).toBe('SPAN');
    expect(error).toHaveTextContent('Partial "missing.md" not found.');
    expect(p.querySelector('div, p')).toBeNull();
  });

  test('is part of the default component mapping and can be replaced', () => {
    expect(defaultComponents.MdErrorInline).toBe(MdErrorInline);
    const Custom: React.FC<React.PropsWithChildren> = ({ children }) => <em className="custom-inline-error">{children}</em>;
    const { container } = render(
      <Md content={'Before {% partial file="missing.md" /%} after.'} config={{ components: { MdErrorInline: Custom } }} />,
    );
    expect(container.querySelector('p .custom-inline-error')).toHaveTextContent('Partial "missing.md" not found.');
  });
});
