export interface WebpFileInfo {
  label: 'small' | 'medium' | 'large';
  width: number;
  filename: string;
}

export interface SnippetOptions {
  jpegFilename: string;
  jpegWidth: number;
  jpegHeight: number;
  webpFiles: WebpFileInfo[];
  sizes: string;
}

export function generateSnippet(options: SnippetOptions): string {
  const imgTag = `<img src="${options.jpegFilename}" alt="" width="${options.jpegWidth}" height="${options.jpegHeight}" loading="lazy">`;

  if (options.webpFiles.length === 0) {
    return imgTag;
  }

  const srcset = options.webpFiles.map((f) => `${f.filename} ${f.width}w`).join(', ');
  const sourceTag = `<source type="image/webp" srcset="${srcset}" sizes="${options.sizes}">`;

  return ['<picture>', `  ${sourceTag}`, `  ${imgTag}`, '</picture>'].join('\n');
}
