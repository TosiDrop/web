import { describe, expect, it } from 'vitest';
import { normalizeDeploymentNetwork } from '../network';

describe('normalizeDeploymentNetwork', () => {
  it('selects mainnet only for the exact mainnet value', () => {
    expect(normalizeDeploymentNetwork('mainnet')).toBe('mainnet');
  });

  it.each([undefined, '', 'preview', 'MAINNET', 'invalid'])(
    'defaults %j to preview',
    (value) => {
      expect(normalizeDeploymentNetwork(value)).toBe('preview');
    },
  );
});
