// Bild -> Kontakt. Zuerst QR-Code (fehlerfrei, wenn die Karte einen hat), sonst Texterkennung.
import { Kontakt } from './kern/kontakt';
import { OcrErgebnis } from './kern/ocr';
import { parseVisitenkarte } from './kern/parser';
import { leseKontaktCode } from './kern/vcard';
import { Bild } from './plattform/bild';
import { erkenneText } from './plattform/ocr';
import { leseQrCodes } from './plattform/qr';

export async function bildAuswerten(bild: Bild): Promise<{ kontakt: Kontakt; ocr?: OcrErgebnis }> {
  try {
    for (const inhalt of await leseQrCodes(bild.uri)) {
      const kontakt = leseKontaktCode(inhalt);
      if (kontakt) return { kontakt };
    }
  } catch {
    // Kein lesbarer QR-Code: weiter mit Texterkennung
  }
  const ocr = await erkenneText(bild);
  return { kontakt: parseVisitenkarte(ocr), ocr };
}
