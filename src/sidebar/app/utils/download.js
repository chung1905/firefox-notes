/**
 * Hands a Blob to the browser as a download.
 *
 * Replaces file-saver, whose bulk was IE10 Blob shims and a msSaveBlob path
 * that Firefox never used.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking synchronously can cancel the download in flight.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export { saveFile };
