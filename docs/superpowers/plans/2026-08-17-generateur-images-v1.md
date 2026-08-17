# Générateur d'images responsive (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 client-side web app that takes one image and generates 3 WebP variants (small/medium/large) + 1 JPEG fallback + a dynamically-generated `<picture>` HTML snippet, entirely in the browser, deployable to GitHub Pages.

**Architecture:** TypeScript + Vite, no UI framework, native Canvas API for image processing. Two-layer split: `core/` holds pure, DOM-light, independently-testable logic (image resizing/encoding, WebP capability detection, snippet string generation); `ui/` holds DOM orchestration that calls into `core/` and never contains conversion logic. `main.ts` wires the two together. Vitest (jsdom environment) covers `core/` only, per the design doc's stated test boundary — `ui/` modules are DOM glue verified manually in the browser.

**Tech Stack:** TypeScript, Vite, Vitest + jsdom, ESLint (flat config, typescript-eslint), native Canvas API (`canvas.toBlob`), GitHub Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`).

**Spec:** [SPEC.md](../../../SPEC.md), [docs/superpowers/specs/2026-08-17-generateur-images-responsive-design.md](../specs/2026-08-17-generateur-images-responsive-design.md)

## Global Constraints

- 100% client-side, no backend, no image ever leaves the browser (Canvas API only).
- No UI framework (React/Vue/Svelte) — vanilla TypeScript + DOM APIs, per the design doc's explicit rationale. Do not introduce one without re-confirming with the user.
- WebP encoding support is runtime-detected (`webpSupport.ts`); absence must produce an explicit user-facing message, never a silent failure or crash.
- The JPEG output is generated **unconditionally**, regardless of WebP support — it is the `<picture>`'s `<img>` fallback for the tool's own output consumers, not an internal fallback mechanism.
- The `sizes` attribute is **never omitted** from generated markup and is never a hardcoded/generic value — it always reflects the user's actual v1 choice ("pleine largeur" → `100vw`, or "conteneur limité" → `(max-width: Xpx) 100vw, Xpx`).
- The `<picture>` snippet is generated dynamically from the filenames/widths actually produced in that run — never a static example.
- Generated `<img>` always carries `alt=""` (HTML-required attribute, explicitly not framed as an accessibility feature) plus `width`/`height` (CLS mitigation).
- `core/` modules must stay framework/DOM-orchestration-free beyond the `<canvas>` they create internally, so they remain unit-testable in isolation from `ui/`.
- small/medium/large WebP widths (480/768/1200px) are an arbitrary convention, not a standard — must be documented as such in the README.
- Out of scope for v1 (do not build): accessibility as a dedicated feature, server-side processing, multiple `sizes` breakpoints, batch processing, full PWA.

---

## Task 1: Project scaffold (Vite + TypeScript + Vitest + ESLint)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/styles/main.css`
- Create: `src/main.ts` (placeholder, replaced fully in Task 8)

**Interfaces:**
- Produces: an `npm run dev` / `npm run build` / `npm test` / `npm run lint` toolchain that every later task relies on. `index.html` defines the DOM structure (`#dropzone`, `#sizes-selector`, `#generate-button`, `#status`, `#results`) that Tasks 6–8 attach behavior to — later tasks must not rename these IDs.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "convertisseur-images",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "eslint": "^9.9.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/convertisseur-images/',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ['dist/**'],
});
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
*.local
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Générateur d'images responsive</title>
  </head>
  <body>
    <main>
      <h1>Générateur de set d'images responsive</h1>

      <section id="dropzone" class="dropzone">
        <p>Glissez-déposez une image ici, ou cliquez pour en choisir une.</p>
      </section>

      <section id="sizes-selector"></section>

      <button id="generate-button" type="button" disabled>Générer</button>

      <p id="status" role="status"></p>

      <section id="results"></section>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `src/styles/main.css`**

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}

body {
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.dropzone {
  border: 2px dashed #888;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
}

.dropzone--active {
  border-color: #2b6cb0;
  background: rgba(43, 108, 176, 0.08);
}

.result-files {
  list-style: none;
  padding: 0;
}

.result-snippet pre {
  overflow-x: auto;
  background: #1112;
  padding: 1rem;
  border-radius: 8px;
}
```

- [ ] **Step 8: Create placeholder `src/main.ts`**

```ts
import './styles/main.css';

console.log("Convertisseur d'images — scaffold chargé.");
```

- [ ] **Step 9: Install dependencies and verify the scaffold**

Run:
```bash
npm install
npm run build
```
Expected: both commands complete with exit code 0; `dist/` is created.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts eslint.config.js .gitignore index.html src/styles/main.css src/main.ts
git commit -m "chore: scaffold Vite + TypeScript + Vitest + ESLint project"
```

---

## Task 2: `core/webpSupport.ts` — runtime WebP encoding capability detection

**Files:**
- Create: `src/core/webpSupport.ts`
- Test: `tests/webpSupport.test.ts`

**Interfaces:**
- Consumes: nothing (browser `canvas.toBlob` only).
- Produces: `detectWebpSupport(): Promise<boolean>` — used by `main.ts` (Task 8) once at page load.

- [ ] **Step 1: Write the failing test**

Create `tests/webpSupport.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- webpSupport`
Expected: FAIL — `src/core/webpSupport.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/core/webpSupport.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- webpSupport`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/webpSupport.ts tests/webpSupport.test.ts
git commit -m "feat: add runtime WebP encoding capability detection"
```

---

## Task 3: `core/imageProcessor.ts` — Canvas resizing + WebP/JPEG blob generation

**Files:**
- Create: `src/core/imageProcessor.ts`
- Test: `tests/imageProcessor.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone `core/` module).
- Produces:
  - `WEBP_WIDTHS: Record<'small' | 'medium' | 'large', number>` = `{ small: 480, medium: 768, large: 1200 }`
  - `JPEG_FALLBACK_WIDTH: number` = `1200`
  - `interface ImageVariant { label: 'small' | 'medium' | 'large'; width: number; height: number; blob: Blob }`
  - `interface ProcessImageResult { jpeg: { width: number; height: number; blob: Blob }; webpVariants: ImageVariant[] }`
  - `processImage(file: File, options: { generateWebp: boolean }): Promise<ProcessImageResult>`
  - These are consumed by `main.ts` (Task 8) and by `snippetGenerator.ts`'s `WebpFileInfo` shape (Task 4, which reuses the `label`/`width` fields).

- [ ] **Step 1: Write the failing test**

Create `tests/imageProcessor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- imageProcessor`
Expected: FAIL — `src/core/imageProcessor.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/imageProcessor.ts`:

```ts
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
      for (const label of WEBP_LABELS) {
        const variant = await resizeToBlob(bitmap, WEBP_WIDTHS[label], 'image/webp', WEBP_QUALITY);
        webpVariants.push({ label, ...variant });
      }
    }

    return { jpeg, webpVariants };
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- imageProcessor`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/imageProcessor.ts tests/imageProcessor.test.ts
git commit -m "feat: add Canvas-based image resizing and WebP/JPEG blob generation"
```

---

## Task 4: `core/snippetGenerator.ts` — dynamic `<picture>` HTML generation

**Files:**
- Create: `src/core/snippetGenerator.ts`
- Test: `tests/snippetGenerator.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks directly, but its `WebpFileInfo.label`/`width` fields are filled from `ImageVariant.label`/`width` (Task 3), and `sizes` is produced by `sizesChoiceToAttribute` (Task 5) at call sites.
- Produces:
  - `interface WebpFileInfo { label: 'small' | 'medium' | 'large'; width: number; filename: string }`
  - `interface SnippetOptions { jpegFilename: string; jpegWidth: number; jpegHeight: number; webpFiles: WebpFileInfo[]; sizes: string }`
  - `generateSnippet(options: SnippetOptions): string`
  - Consumed by `main.ts` (Task 8).

- [ ] **Step 1: Write the failing test**

Create `tests/snippetGenerator.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- snippetGenerator`
Expected: FAIL — `src/core/snippetGenerator.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/snippetGenerator.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- snippetGenerator`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/snippetGenerator.ts tests/snippetGenerator.test.ts
git commit -m "feat: add pure <picture> snippet generator"
```

---

## Task 5: `ui/sizesSelector.ts` — sizes choice UI + pure attribute mapping

**Files:**
- Create: `src/ui/sizesSelector.ts`
- Test: `tests/sizesSelector.test.ts` (covers the pure helper only, per the design's "tests reserved for pure logic" boundary)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type SizesChoice = { mode: 'full' } | { mode: 'contained'; maxWidth: number }`
  - `sizesChoiceToAttribute(choice: SizesChoice): string`
  - `initSizesSelector(container: HTMLElement, onChange: (choice: SizesChoice) => void): void`
  - Consumed by `main.ts` (Task 8): `sizesChoiceToAttribute` feeds `generateSnippet`'s `sizes` field (Task 4).

- [ ] **Step 1: Write the failing test**

Create `tests/sizesSelector.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sizesSelector`
Expected: FAIL — `src/ui/sizesSelector.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/sizesSelector.ts`:

```ts
export type SizesChoice = { mode: 'full' } | { mode: 'contained'; maxWidth: number };

export function sizesChoiceToAttribute(choice: SizesChoice): string {
  if (choice.mode === 'full') {
    return '100vw';
  }
  return `(max-width: ${choice.maxWidth}px) 100vw, ${choice.maxWidth}px`;
}

export function initSizesSelector(
  container: HTMLElement,
  onChange: (choice: SizesChoice) => void,
): void {
  container.innerHTML = `
    <fieldset>
      <legend>Attribut sizes</legend>
      <label>
        <input type="radio" name="sizes-mode" value="full" checked>
        Pleine largeur
      </label>
      <label>
        <input type="radio" name="sizes-mode" value="contained">
        Conteneur limité
      </label>
      <label>
        Largeur max (px)
        <input type="number" id="sizes-max-width" min="1" value="600" disabled>
      </label>
    </fieldset>
  `;

  const radios = container.querySelectorAll<HTMLInputElement>('input[name="sizes-mode"]');
  const maxWidthInput = container.querySelector<HTMLInputElement>('#sizes-max-width');
  if (!maxWidthInput) {
    throw new Error('Champ de largeur max introuvable dans le DOM.');
  }

  const emitChange = () => {
    const mode = container.querySelector<HTMLInputElement>('input[name="sizes-mode"]:checked')?.value;
    if (mode === 'contained') {
      maxWidthInput.disabled = false;
      onChange({ mode: 'contained', maxWidth: Number(maxWidthInput.value) || 1 });
    } else {
      maxWidthInput.disabled = true;
      onChange({ mode: 'full' });
    }
  };

  for (const radio of radios) {
    radio.addEventListener('change', emitChange);
  }
  maxWidthInput.addEventListener('input', emitChange);

  emitChange();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sizesSelector`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/sizesSelector.ts tests/sizesSelector.test.ts
git commit -m "feat: add sizes choice UI and pure sizes-attribute mapping"
```

---

## Task 6: `ui/dropzone.ts` — drag & drop + file picker input handling

**Files:**
- Create: `src/ui/dropzone.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface DropzoneCallbacks { onFileAccepted: (file: File) => void; onError: (message: string) => void }`
  - `initDropzone(container: HTMLElement, callbacks: DropzoneCallbacks): void`
  - Consumed by `main.ts` (Task 8).
- No automated test: per the design doc, Vitest coverage is reserved for `core/` pure logic; this module is DOM event-wiring, verified manually in the browser in Task 8's manual QA step.

- [ ] **Step 1: Create `src/ui/dropzone.ts`**

```ts
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo — limite arbitraire, documentée dans le README

export interface DropzoneCallbacks {
  onFileAccepted: (file: File) => void;
  onError: (message: string) => void;
}

export function initDropzone(container: HTMLElement, callbacks: DropzoneCallbacks): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  container.appendChild(input);

  const handleFile = (file: File | undefined): void => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      callbacks.onError("Le fichier sélectionné n'est pas une image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      callbacks.onError('Le fichier dépasse la taille maximale autorisée (15 Mo).');
      return;
    }
    callbacks.onFileAccepted(file);
  };

  container.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handleFile(input.files?.[0]));

  container.addEventListener('dragover', (event) => {
    event.preventDefault();
    container.classList.add('dropzone--active');
  });
  container.addEventListener('dragleave', () => {
    container.classList.remove('dropzone--active');
  });
  container.addEventListener('drop', (event) => {
    event.preventDefault();
    container.classList.remove('dropzone--active');
    handleFile(event.dataTransfer?.files?.[0]);
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/dropzone.ts
git commit -m "feat: add drag-and-drop and file-picker dropzone"
```

---

## Task 7: `ui/resultView.ts` — render downloadable files + copyable snippet

**Files:**
- Create: `src/ui/resultView.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface GeneratedFile { filename: string; blob: Blob }`
  - `renderResults(container: HTMLElement, files: GeneratedFile[], snippetHtml: string): void`
  - Consumed by `main.ts` (Task 8), fed with files built from `ProcessImageResult` (Task 3) and the string from `generateSnippet` (Task 4).
- No automated test, same rationale as Task 6.

- [ ] **Step 1: Create `src/ui/resultView.ts`**

```ts
export interface GeneratedFile {
  filename: string;
  blob: Blob;
}

export function renderResults(
  container: HTMLElement,
  files: GeneratedFile[],
  snippetHtml: string,
): void {
  container.innerHTML = '';

  const fileList = document.createElement('ul');
  fileList.className = 'result-files';
  for (const file of files) {
    const url = URL.createObjectURL(file.blob);
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.textContent = `Télécharger ${file.filename}`;
    item.appendChild(link);
    fileList.appendChild(item);
  }
  container.appendChild(fileList);

  const snippetBlock = document.createElement('div');
  snippetBlock.className = 'result-snippet';

  const pre = document.createElement('pre');
  pre.textContent = snippetHtml;
  snippetBlock.appendChild(pre);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'Copier le snippet';
  copyButton.addEventListener('click', () => {
    void navigator.clipboard.writeText(snippetHtml);
  });
  snippetBlock.appendChild(copyButton);

  container.appendChild(snippetBlock);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/resultView.ts
git commit -m "feat: add result view for downloadable files and copyable snippet"
```

---

## Task 8: `main.ts` orchestration — wire dropzone, sizes, processing, results together

**Files:**
- Modify: `src/main.ts` (replace the Task 1 placeholder entirely)

**Interfaces:**
- Consumes: `initDropzone`/`DropzoneCallbacks` (Task 6), `initSizesSelector`/`sizesChoiceToAttribute`/`SizesChoice` (Task 5), `processImage`/`ProcessImageResult` (Task 3), `detectWebpSupport` (Task 2), `generateSnippet`/`SnippetOptions` (Task 4), `renderResults`/`GeneratedFile` (Task 7).
- Produces: the running application; no further task consumes this file.

- [ ] **Step 1: Replace `src/main.ts` with the full orchestration**

```ts
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
```

- [ ] **Step 2: Run the full test suite and type check**

Run:
```bash
npm test
npx tsc -b --noEmit
npm run lint
```
Expected: all tests pass, no type errors, no lint errors.

- [ ] **Step 3: Manual browser QA**

Run: `npm run dev`, open the printed local URL, and verify by hand:
- Dropping/selecting an image enables the "Générer" button and shows its name in `#status`.
- Selecting a non-image file shows the explicit error message and keeps the button disabled.
- Clicking "Générer" produces 4 downloadable files (JPEG fallback + 3 WebP, or JPEG only if the browser lacks WebP support) and a `<picture>` snippet reflecting the actual filenames/widths/`sizes` choice.
- Switching "Conteneur limité" and setting a max width changes the generated `sizes` attribute accordingly on the next generation.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire dropzone, sizes selector, image processing and results into main.ts"
```

---

## Task 9: CI/CD — GitHub Actions build + deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run lint`, `npm test`, `npm run build` scripts (Task 1).
- Produces: nothing consumed by other tasks; this is the deployment pipeline.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the workflow is syntactically valid YAML**

Run: `python -c "import yaml, sys; yaml.safe_load(open('.github/workflows/deploy.yml'))"` (or any available YAML linter)
Expected: no error raised.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions build and GitHub Pages deploy workflow"
```

**Note:** GitHub Pages must be enabled for this repository with source "GitHub Actions" (Settings → Pages) for the `deploy` job to succeed — this is a one-time manual step outside the repo, not something this plan's tasks can perform.

---

## Task 10: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Create `README.md`**

```markdown
# Générateur de set d'images responsive

Outil web qui prend une image en entrée et génère automatiquement, **entièrement dans le navigateur**, un set d'images prêt à l'emploi pour le développement web responsive et mobile-first :

- 3 variantes WebP : small / medium / large (480 / 768 / 1200 px)
- 1 JPEG allégé (image de secours)
- Un snippet HTML `<picture>` généré **dynamiquement** à partir des fichiers et largeurs réellement produits

## Pourquoi 100% côté client ?

Aucune image n'est envoyée à un serveur : tout le traitement (redimensionnement, encodage WebP/JPEG) passe par l'API Canvas du navigateur (`canvas.toBlob()`). Deux raisons à ce choix :

- **Confidentialité** : les images de l'utilisateur ne quittent jamais son navigateur.
- **Contrainte d'hébergement** : le site est déployé sur GitHub Pages, qui n'héberge que du contenu statique — un backend n'est donc pas une option ici.

## Limites connues

- **Support WebP non garanti** : la spécification `canvas.toBlob()` garantit uniquement l'encodage PNG ; le support de l'encodage WebP dépend du navigateur. L'outil détecte cette capacité au chargement de la page. Si elle est absente, un message explicite est affiché et seul le JPEG de secours est généré (jamais d'échec silencieux).
- **Largeurs small/medium/large (480/768/1200 px)** : ce ne sont pas des valeurs standardisées, seulement une convention courante chez les développeurs front-end. Choix arbitraire assumé pour ce v1.
- **Attribut `sizes`** : le v1 ne propose qu'un choix simple ("pleine largeur" ou "conteneur limité" avec une largeur max) plutôt qu'un système de breakpoints multiples. `vw` est toujours relatif au viewport, jamais au conteneur parent — c'est pourquoi "conteneur limité" nécessite une saisie explicite de l'utilisateur.
- **`alt=""`** : le markup généré inclut un attribut `alt` vide parce qu'il est requis par la norme HTML, pas parce que ce projet traite l'accessibilité comme une fonctionnalité — à compléter par le développeur qui utilise l'outil.
- **Taille de fichier max (15 Mo)** : limite arbitraire côté validation d'entrée, pour éviter de bloquer le navigateur sur un fichier démesuré.

## Utilisation

1. Déposez ou sélectionnez une image.
2. Choisissez le mode `sizes` ("pleine largeur" ou "conteneur limité" + largeur max).
3. Cliquez sur "Générer".
4. Téléchargez les fichiers produits et copiez le snippet `<picture>` généré.

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests Vitest (logique métier pure, dossier core/)
npm run lint     # ESLint
npm run build    # build de production dans dist/
```

## Stack

TypeScript + Vite, sans framework UI (choix volontaire pour ce premier projet front-end : démontrer la maîtrise du DOM et des API natives — Canvas ici, Web Workers/Service Worker dans les évolutions futures — avant de s'appuyer sur un framework). CSS natif (pas de préprocesseur). Tests unitaires avec Vitest, limités à la logique métier pure du dossier `core/`.

## Roadmap

- **v2** : traitement par lot (Web Workers), seuils de tailles configurables.
- **v3** : PWA complète (installable, hors-ligne).

## Usage de l'IA pendant le développement

_À compléter avant publication : préciser ce qui a été assisté par IA (scaffolding, structure des modules, tests), ce qui a été compris et ajusté manuellement, et les difficultés rencontrées. Section pensée comme un signal de discernement, pas une faiblesse à masquer._
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with rationale, limitations and usage"
```

---

## Post-plan note

The README's "Usage de l'IA" section is intentionally left as an explicit to-fill marker (not a plan placeholder — it's user-authored content about the user's own development experience, which no engineer executing this plan can honestly write on the user's behalf). The user should fill it in before making the repo public, based on their actual experience running this plan.
