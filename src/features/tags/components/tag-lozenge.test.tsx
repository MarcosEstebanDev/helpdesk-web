import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TAG_COLORS } from '@/lib/api/types';
import { TagLozenge, clasesDeColor } from './tag-lozenge';

describe('TagLozenge', () => {
  it('muestra el nombre', () => {
    render(<TagLozenge tag={{ id: 't1', name: 'facturación', color: 'green' }} />);

    expect(screen.getByText('facturación')).toBeInTheDocument();
  });

  it('cada color de la paleta tiene su tono, con variante para el modo oscuro', () => {
    const clases = TAG_COLORS.map(clasesDeColor);

    expect(new Set(clases).size).toBe(TAG_COLORS.length);
    for (const c of clases) expect(c).toMatch(/dark:/);
  });

  it('un color desconocido (backend más nuevo) cae en gris en vez de romper', () => {
    expect(clasesDeColor('fucsia' as never)).toBe(clasesDeColor('gray'));
  });
});
