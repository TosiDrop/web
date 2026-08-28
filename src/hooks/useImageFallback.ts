import { useState } from 'react';

// Walks candidate image srcs on <img> error: proxy → original → exhausted.
// Callers keyed by assetId remount per token, so the index never goes stale.
export function useImageFallback(candidates: Array<string | undefined>) {
  const sources = [...new Set(candidates.filter((s): s is string => !!s))];
  const [index, setIndex] = useState(0);
  return {
    src: index < sources.length ? sources[index] : undefined,
    failed: index >= sources.length,
    onError: () => setIndex((i) => i + 1),
  };
}
