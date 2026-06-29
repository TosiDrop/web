import { describe, expect, it, vi } from 'vitest';
import { readResponseBodyWithLimit } from '../readLimitedBody';

describe('readResponseBodyWithLimit', () => {
  it('reads responses within the byte limit', async () => {
    const bytes = await readResponseBodyWithLimit(
      new Response(new Uint8Array([1, 2, 3])),
      3,
    );
    expect(bytes?.byteLength).toBe(3);
  });

  it('rejects declared oversized responses without reading the body', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([1]));
      },
      cancel,
    });
    const bytes = await readResponseBodyWithLimit(
      new Response(stream, { headers: { 'Content-Length': '4' } }),
      3,
    );
    expect(bytes).toBeNull();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('cancels streams once they exceed the byte limit', async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(2));
      },
      cancel,
    });
    const bytes = await readResponseBodyWithLimit(new Response(stream), 3);
    expect(bytes).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pulls).toBeLessThan(4);
  });
});
