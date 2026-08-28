import { describe, it, expect } from 'vitest';
import { tokenImageSrc } from '../tokenImage';

describe('tokenImageSrc', () => {
  it('routes http(s) logos through the proxy', () => {
    expect(tokenImageSrc('pol.aaaa', 'https://img.example/a.png')).toBe(
      '/api/tokenImage?id=pol.aaaa',
    );
    expect(tokenImageSrc('a b', 'http://x/y.png')).toBe('/api/tokenImage?id=a%20b');
  });

  it('passes data URIs and other non-http values through', () => {
    expect(tokenImageSrc('pol.aaaa', 'data:image/png;base64,xyz')).toBe(
      'data:image/png;base64,xyz',
    );
  });

  it('returns undefined for a missing logo', () => {
    expect(tokenImageSrc('pol.aaaa', undefined)).toBeUndefined();
    expect(tokenImageSrc('pol.aaaa', '')).toBeUndefined();
  });
});
