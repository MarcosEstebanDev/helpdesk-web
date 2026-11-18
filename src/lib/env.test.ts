import { describe, expect, it } from 'vitest';
import { apiHttpBase } from './env';

describe('apiHttpBase', () => {
  const API = 'https://api.example.test';

  it('sin proxy, HTTP va directo a la API', () => {
    expect(apiHttpBase({ NEXT_PUBLIC_API_URL: API })).toBe(API);
  });

  it('con proxy, HTTP va al mismo origen que la página (ADR-0035)', () => {
    expect(
      apiHttpBase({ NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_API_BASE: '/api' }),
    ).toBe('/api');
  });
});
