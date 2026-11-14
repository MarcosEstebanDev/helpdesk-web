import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounced } from './use-debounced';

describe('useDebounced', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('entrega el valor recién cuando deja de cambiar', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 'abc' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });
});
