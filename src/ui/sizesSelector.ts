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
