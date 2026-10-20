// Profilbild aus dem Kartenfoto. Kontakte-Apps schneiden das Bild rund zu. Damit die ganze
// Karte lesbar bleibt, passt sie mit ihren Ecken in den Kreis (Diagonale = Durchmesser) und
// sitzt mittig auf weißem Grund.
import { Bild } from './bild';

const KANTE = 600;

export async function profilbildAus(bild: Bild): Promise<string | undefined> {
  const quelle = await createImageBitmap(await (await fetch(bild.uri)).blob());
  try {
    const leinwand = document.createElement('canvas');
    leinwand.width = KANTE;
    leinwand.height = KANTE;
    const g = leinwand.getContext('2d');
    if (!g) return undefined;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, KANTE, KANTE);
    const faktor = (KANTE * 0.97) / Math.hypot(quelle.width, quelle.height);
    const b = quelle.width * faktor;
    const h = quelle.height * faktor;
    g.drawImage(quelle, (KANTE - b) / 2, (KANTE - h) / 2, b, h);
    return leinwand.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally {
    quelle.close();
  }
}
