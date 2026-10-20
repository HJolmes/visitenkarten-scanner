// Bild -> Kontakt. Zuerst QR-Code (fehlerfrei, wenn die Karte einen hat), sonst Texterkennung.
import { Kontakt } from './kern/kontakt';
import { parseVisitenkarte } from './kern/parser';
import { leseKontaktCode } from './kern/vcard';
import { erkenneText } from './plattform/ocr';
import { leseQrCodes } from './plattform/qr';

export async function bildAuswerten(bildUri: string): Promise<Kontakt> {
  try {
    for (const inhalt of await leseQrCodes(bildUri)) {
      const k = leseKontaktCode(inhalt);
      if (k) return k;
    }
  } catch {
    // Kein lesbarer QR-Code: weiter mit Texterkennung
  }
  const text = await erkenneText(bildUri);
  return parseVisitenkarte(text);
}
