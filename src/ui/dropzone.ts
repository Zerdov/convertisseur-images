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
