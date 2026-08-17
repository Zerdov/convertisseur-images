import { describe, expect, it } from 'vitest';
import { generateSnippet } from '../src/core/snippetGenerator';

describe('generateSnippet', () => {
  it('génère un <picture> avec <source> WebP et <img> JPEG de secours', () => {
    const html = generateSnippet({
      jpegFilename: 'photo-fallback.jpg',
      jpegWidth: 1200,
      jpegHeight: 600,
      webpFiles: [
        { label: 'small', width: 480, filename: 'photo-small.webp' },
        { label: 'medium', width: 768, filename: 'photo-medium.webp' },
        { label: 'large', width: 1200, filename: 'photo-large.webp' },
      ],
      sizes: '100vw',
    });

    expect(html).toContain(
      '<source type="image/webp" srcset="photo-small.webp 480w, photo-medium.webp 768w, photo-large.webp 1200w" sizes="100vw">',
    );
    expect(html).toContain('<img src="photo-fallback.jpg" alt="" width="1200" height="600" loading="lazy">');
  });

  it("génère uniquement le <img> JPEG quand aucune variante WebP n'est fournie", () => {
    const html = generateSnippet({
      jpegFilename: 'photo-fallback.jpg',
      jpegWidth: 1200,
      jpegHeight: 600,
      webpFiles: [],
      sizes: '100vw',
    });

    expect(html).not.toContain('<picture>');
    expect(html).toContain('<img src="photo-fallback.jpg" alt="" width="1200" height="600" loading="lazy">');
  });

  it('reflète le choix sizes "conteneur limité" tel quel, sans valeur codée en dur', () => {
    const html = generateSnippet({
      jpegFilename: 'photo-fallback.jpg',
      jpegWidth: 600,
      jpegHeight: 400,
      webpFiles: [{ label: 'small', width: 480, filename: 'photo-small.webp' }],
      sizes: '(max-width: 600px) 100vw, 600px',
    });

    expect(html).toContain('sizes="(max-width: 600px) 100vw, 600px"');
  });
});
