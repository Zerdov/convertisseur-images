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

  const downloadEntries: { url: string; filename: string }[] = [];

  const fileList = document.createElement('ul');
  fileList.className = 'result-files';
  for (const file of files) {
    const url = URL.createObjectURL(file.blob);
    downloadEntries.push({ url, filename: file.filename });
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.textContent = `Télécharger ${file.filename}`;
    item.appendChild(link);
    fileList.appendChild(item);
  }

  const downloadAllButton = document.createElement('button');
  downloadAllButton.type = 'button';
  downloadAllButton.className = 'download-all';
  downloadAllButton.textContent = 'Tout télécharger';
  downloadAllButton.addEventListener('click', () => {
    downloadEntries.forEach(({ url, filename }, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
      }, index * 250);
    });
  });
  container.appendChild(downloadAllButton);

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
