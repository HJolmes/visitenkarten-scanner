// Datei im Browser herunterladen
export function herunterladen(inhalt: Blob, dateiname: string): void {
  const url = URL.createObjectURL(inhalt);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
