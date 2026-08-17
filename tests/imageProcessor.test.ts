import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JPEG_FALLBACK_WIDTH, WEBP_WIDTHS, processImage } from '../src/core/imageProcessor';

function mockCanvas(): void {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = vi.fn(function toBlob(
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
  ) {
    callback(new Blob(['x'], { type: type ?? 'image/png' }));
  }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
}

function mockCreateImageBitmap(width: number, height: number): void {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close: vi.fn() })),
  );
}

describe('processImage', () => {
  beforeEach(() => {
    mockCanvas();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ne dépasse jamais la largeur de la source pour une image plus petite que "small"', async () => {
    mockCreateImageBitmap(300, 200);
    const file = new File(['data'], 'photo.png', { type: 'image/png' });

    const result = await processImage(file, { generateWebp: true });

    expect(result.jpeg.width).toBe(300);
    expect(result.jpeg.height).toBe(200);
    for (const variant of result.webpVariants) {
      expect(variant.width).toBe(300);
    }
  });

  it('génère les largeurs small/medium/large pour une image plus grande que "large"', async () => {
    mockCreateImageBitmap(2000, 1000);
    const file = new File(['data'], 'photo.png', { type: 'image/png' });

    const result = await processImage(file, { generateWebp: true });

    expect(result.jpeg.width).toBe(JPEG_FALLBACK_WIDTH);
    expect(result.jpeg.height).toBe(600);
    expect(result.webpVariants.map((v) => v.label)).toEqual(['small', 'medium', 'large']);
    expect(result.webpVariants.map((v) => v.width)).toEqual([
      WEBP_WIDTHS.small,
      WEBP_WIDTHS.medium,
      WEBP_WIDTHS.large,
    ]);
  });

  it('ne génère aucune variante WebP si generateWebp est false, mais génère toujours le JPEG', async () => {
    mockCreateImageBitmap(2000, 1000);
    const file = new File(['data'], 'photo.png', { type: 'image/png' });

    const result = await processImage(file, { generateWebp: false });

    expect(result.webpVariants).toHaveLength(0);
    expect(result.jpeg.blob.type).toBe('image/jpeg');
  });
});
