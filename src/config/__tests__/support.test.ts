import { describe, expect, it } from 'vitest';
import { buildFeedbackMailto, isSafeExternalUrl } from '@/config/support';

describe('support links and feedback', () => {
  it('only accepts HTTPS external links', () => {
    expect(isSafeExternalUrl('https://docs.tosidrop.me/')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
  });

  it('encodes feedback for the email client', () => {
    const mailto = buildFeedbackMailto({
      category: 'Bug report',
      message: 'The claim button is not working.',
      email: 'user@example.com',
    });

    expect(mailto).toContain('mailto:support@tosidrop.me');
    expect(mailto).toContain(encodeURIComponent('TosiDrop feedback: Bug report'));
    expect(mailto).toContain(encodeURIComponent('The claim button is not working.'));
    expect(mailto).toContain(encodeURIComponent('Reply-to: user@example.com'));
  });
});
