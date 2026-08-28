import { describe, expect, it } from 'vitest';
import { toggleAllSelection, visibleSelection } from '../utils/claimSelection';

describe('claim selection', () => {
  it('select all only selects visible tokens', () => {
    expect(toggleAllSelection(false, ['a', 'b'])).toEqual(['a', 'b']);
    expect(toggleAllSelection(true, ['a', 'b'])).toEqual([]);
  });

  it('drops hidden tokens from a selection before it is submitted', () => {
    // 'hidden' was selected before the user disliked it.
    expect(visibleSelection(['a', 'hidden', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
  });
});
