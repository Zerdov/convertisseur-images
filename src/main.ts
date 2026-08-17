import './styles/main.css';
import { initDropzone } from './ui/dropzone';
import { initSizesSelector, sizesChoiceToAttribute, type SizesChoice } from './ui/sizesSelector';
import { renderResults, type GeneratedFile } from './ui/resultView';
import { processImage } from './core/imageProcessor';
import { detectWebpSupport } from './core/webpSupport';
import { generateSnippet } from './core/snippetGenerator';

let selectedFile: File | null = null;
let sizesChoice: SizesChoice = { mode: 'full' };
let webpSupported = false;

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

async function handleGenerate(): Promise<void> {
  const statusEl = document.querySelector<HTMLElement>('#status');
  const resultsEl = document.querySelector<HTMLElement>('#results');
  if (!selectedFile || !statusEl || !resultsEl) return;

  statusEl.textContent = 'Génération en cours...';

  try {
    const result = await processImage(selectedFile, { generateWebp: webpSupported });
    const name = baseName(selectedFile.name);
    const jpegFilename = `${name}-fallback.jpg`;

    const files: GeneratedFile[] = [
      { filename: jpegFilename, blob: result.jpeg.blob },
      ...result.webpVariants.map((variant) => ({
        filename: `${name}-${variant.label}.webp`,
        blob: variant.blob,
      })),
    ];

    const snippet = generateSnippet({
      jpegFilename,
      jpegWidth: result.jpeg.width,
      jpegHeight: result.jpeg.height,
      webpFiles: result.webpVariants.map((variant) => ({
        label: variant.label,
        width: variant.width,
        filename: `${name}-${variant.label}.webp`,
      })),
      sizes: sizesChoiceToAttribute(sizesChoice),
    });

    renderResults(resultsEl, files, snippet);
    statusEl.textContent = webpSupported
      ? 'Génération terminée.'
      : 'Génération terminée (WebP non supporté par ce navigateur : seul le JPEG a été produit).';
  } catch (error) {
    statusEl.textContent = `Erreur lors de la génération : ${(error as Error).message}`;
  }
}

async function bootstrap(): Promise<void> {
  const dropzoneEl = document.querySelector<HTMLElement>('#dropzone');
  const sizesEl = document.querySelector<HTMLElement>('#sizes-selector');
  const generateButton = document.querySelector<HTMLButtonElement>('#generate-button');
  const statusEl = document.querySelector<HTMLElement>('#status');
  if (!dropzoneEl || !sizesEl || !generateButton || !statusEl) {
    throw new Error('Structure HTML attendue introuvable.');
  }

  webpSupported = await detectWebpSupport();
  statusEl.textContent = webpSupported
    ? 'WebP supporté par ce navigateur.'
    : 'WebP non supporté par ce navigateur : seul le JPEG sera généré.';

  initDropzone(dropzoneEl, {
    onFileAccepted: (file) => {
      selectedFile = file;
      generateButton.disabled = false;
      statusEl.textContent = `Fichier sélectionné : ${file.name}`;
    },
    onError: (message) => {
      selectedFile = null;
      generateButton.disabled = true;
      statusEl.textContent = message;
    },
  });

  initSizesSelector(sizesEl, (choice) => {
    sizesChoice = choice;
  });

  generateButton.addEventListener('click', () => {
    void handleGenerate();
  });
}

void bootstrap();
