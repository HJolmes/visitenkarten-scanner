// Bild -> Kontakt. Zuerst QR-Code (fehlerfrei, wenn die Karte einen hat), sonst Texterkennung.
import { scanFromURLAsync } from 'expo-camera';
import { Platform } from 'react-native';
import { Kontakt } from './kern/kontakt';
import { parseVisitenkarte } from './kern/parser';
import { leseKontaktCode } from './kern/vcard';
import { erkenneText } from './plattform/ocr';

export async function bildAuswerten(bildUri: string): Promise<Kontakt> {
  // Im Browser lädt die QR-Erkennung von expo-camera ihr WASM aus dem Netz (jsdelivr),
  // das widerspricht "offline". Dort bis auf Weiteres nur Texterkennung.
  if (Platform.OS !== 'web') {
    try {
      const codes = await scanFromURLAsync(bildUri, ['qr']);
      for (const c of codes) {
        const k = leseKontaktCode(c.data);
        if (k) return k;
      }
    } catch {
      // Kein lesbarer QR-Code: weiter mit Texterkennung
    }
  }
  const text = await erkenneText(bildUri);
  return parseVisitenkarte(text);
}
