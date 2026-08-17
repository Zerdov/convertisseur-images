const WEBP_LABELS = ['small', 'medium', 'large'] as const;
type WebpLabel = (typeof WEBP_LABELS)[number];

export const WEBP_WIDTHS: Record<WebpLabel, number> = {
  small: 480,
  medium: 768,
  large: 1200,
};

export const JPEG_FALLBACK_WIDTH = 1200;

const JPEG_QUALITY = 0.8;
const WEBP_QUALITY = 0.8;

export interface ImageVariant {
  label: WebpLabel;
  width: number;
  height: number;
  blob: Blob;
}

export interface ProcessImageResult {
  jpeg: { width: number; height: number; blob: Blob };
  webpVariants: ImageVariant[];
}

async function resizeToBlob(
  source: ImageBitmap,
  targetWidth: number,
  mimeType: string,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const width = Math.min(targetWidth, source.width);
  const height = Math.round((source.height / source.width) * width);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Impossible d'obtenir le contexte 2D du canvas.");
  }
  ctx.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Échec de la génération du blob ${mimeType}.`));
          return;
        }
        resolve({ blob, width, height });
      },
      mimeType,
      quality,
    );
  });
}

export async function processImage(
  file: File,
  options: { generateWebp: boolean },
): Promise<ProcessImageResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const jpeg = await resizeToBlob(bitmap, JPEG_FALLBACK_WIDTH, 'image/jpeg', JPEG_QUALITY);

    const webpVariants: ImageVariant[] = [];
    if (options.generateWebp) {
      const emittedWidths = new Set<number>();
      for (const label of WEBP_LABELS) {
        const variant = await resizeToBlob(bitmap, WEBP_WIDTHS[label], 'image/webp', WEBP_QUALITY);
        if (emittedWidths.has(variant.width)) {
          continue;
        }
        emittedWidths.add(variant.width);
        webpVariants.push({ label, ...variant });
      }
    }

    return { jpeg, webpVariants };
  } finally {
    bitmap.close();
  }
}
