import { describe, expect, it } from 'vitest';
import { limitSelection, toggleAllSelection, visibleSelection } from '../utils/claimSelection';

describe('claim selection', () => {
  it('select all only selects visible tokens', () => {
    expect(toggleAllSelection(false, ['a', 'b'])).toEqual(['a', 'b']);
    expect(toggleAllSelection(true, ['a', 'b'])).toEqual([]);
  });

  it('drops hidden tokens from a selection before it is submitted', () => {
    // 'hidden' was selected before the user disliked it.
    expect(visibleSelection(['a', 'hidden', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('prioritizes displayed tokens when capping a selection', () => {
    // Favorites are displayed first. They must remain counted when selected
    // after ordinary tokens have filled the request limit.
    const selected = visibleSelection(['a', 'b', 'favorite'], ['favorite', 'a', 'b']);
    expect(limitSelection(selected, 2)).toEqual(['favorite', 'a']);
  });

  it('limits selected tokens to the VM request maximum', () => {
    expect(limitSelection(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });
});
