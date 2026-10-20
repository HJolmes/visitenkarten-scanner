// Web-App: Bild einmal neu zeichnen. Damit ist die Drehung aus den Kameradaten (EXIF) fest
// eingerechnet, Anzeige, Texterkennung und Bildausschnitte nutzen dieselben Koordinaten.
// Große Fotos werden verkleinert, das spart Zeit bei der Erkennung.
export interface Bild {
  uri: string;
  breite: number;
  hoehe: number;
}

const MAX_KANTE = 2000;

export async function bildVorbereiten(asset: { uri: string }): Promise<Bild> {
  const quelle = await createImageBitmap(await (await fetch(asset.uri)).blob());
  try {
    const faktor = Math.min(1, MAX_KANTE / Math.max(quelle.width, quelle.height));
    const breite = Math.round(quelle.width * faktor);
    const hoehe = Math.round(quelle.height * faktor);
    const leinwand = document.createElement('canvas');
    leinwand.width = breite;
    leinwand.height = hoehe;
    leinwand.getContext('2d')!.drawImage(quelle, 0, 0, breite, hoehe);
    const blob = await new Promise<Blob>((ok, fehler) =>
      leinwand.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild nicht lesbar'))), 'image/jpeg', 0.92),
    );
    return { uri: URL.createObjectURL(blob), breite, hoehe };
  } finally {
    quelle.close();
  }
}
