import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectWebpSupport } from '../src/core/webpSupport';

function mockToBlob(resultType: string | null): void {
  HTMLCanvasElement.prototype.toBlob = vi.fn(function toBlob(
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    if (resultType === null) {
      callback(null);
    } else {
      callback(new Blob(['x'], { type: resultType }));
    }
  }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
}

describe('detectWebpSupport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne true quand toBlob produit un blob de type image/webp', async () => {
    mockToBlob('image/webp');
    await expect(detectWebpSupport()).resolves.toBe(true);
  });

  it('retourne false quand toBlob retourne null (pas de support)', async () => {
    mockToBlob(null);
    await expect(detectWebpSupport()).resolves.toBe(false);
  });

  it('retourne false quand toBlob produit un type différent (fallback silencieux du navigateur)', async () => {
    mockToBlob('image/png');
    await expect(detectWebpSupport()).resolves.toBe(false);
  });
});
