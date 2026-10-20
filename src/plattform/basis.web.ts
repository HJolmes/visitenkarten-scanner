// Adresse einer mitgelieferten Datei relativ zur Seite. Die Web-App kann so unter einem
// Unterpfad liegen (GitHub Pages: /visitenkarten-scanner/) oder direkt auf einer Domain.
export function basisUrl(pfad: string): string {
  return new URL(pfad, document.baseURI).href;
}
