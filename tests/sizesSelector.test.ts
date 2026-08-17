import { describe, expect, it } from 'vitest';
import { sizesChoiceToAttribute } from '../src/ui/sizesSelector';

describe('sizesChoiceToAttribute', () => {
  it('retourne "100vw" pour le mode pleine largeur', () => {
    expect(sizesChoiceToAttribute({ mode: 'full' })).toBe('100vw');
  });

  it('retourne une media query pour le mode conteneur limité', () => {
    expect(sizesChoiceToAttribute({ mode: 'contained', maxWidth: 600 })).toBe(
      '(max-width: 600px) 100vw, 600px',
    );
  });
});
