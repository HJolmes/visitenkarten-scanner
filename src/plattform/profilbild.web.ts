// Profilbild aus dem Kartenfoto. Quadratisch, weil Kontakte-Apps das Bild rund oder
// quadratisch zuschneiden: Die ganze Karte wird mittig auf weißen Grund gesetzt, damit
// nichts abgeschnitten wird. Klein gehalten (360 px, JPEG), damit die vCard handlich bleibt
// und der Abgleich mit Exchange das Bild nicht ablehnt.
const KANTE = 360;

export async function profilbildAus(bildUri: string): Promise<string | undefined> {
  const bild = await createImageBitmap(await (await fetch(bildUri)).blob());
  try {
    const leinwand = document.createElement('canvas');
    leinwand.width = KANTE;
    leinwand.height = KANTE;
    const g = leinwand.getContext('2d');
    if (!g) return undefined;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, KANTE, KANTE);
    const faktor = Math.min(KANTE / bild.width, KANTE / bild.height);
    const b = bild.width * faktor;
    const h = bild.height * faktor;
    g.drawImage(bild, (KANTE - b) / 2, (KANTE - h) / 2, b, h);
    return leinwand.toDataURL('image/jpeg', 0.8).split(',')[1];
  } finally {
    bild.close();
  }
}
