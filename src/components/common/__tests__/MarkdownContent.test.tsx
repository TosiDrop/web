import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '../MarkdownContent';

describe('MarkdownContent', () => {
  it('renders formatting and links without interpreting embedded HTML', () => {
    render(<MarkdownContent content={'**Bold** [site](https://example.com) <img src=x onerror=alert(1)>\n\n- item'} />);
    expect(screen.getByText('Bold').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('item').tagName).toBe('LI');
    expect(document.querySelector('img')).toBeNull();
  });
});
