export async function detectWebpSupport(): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob !== null && blob.type === 'image/webp');
    }, 'image/webp');
  });
}
