// Speichern in der Web-App: vCard herunterladen, ohne Connector.
// - iPhone (Safari) zeigt sofort die Kontaktvorschau, "Neuen Kontakt erstellen" legt ihn im
//   Standardkonto an
// - Android lädt die Datei, ein Tipp auf die Download-Meldung fragt nach der App (Kontakte …)
//
// Gerätetest 20.10.2026 (Android, Edge): Download und "Öffnen mit > Kontakte" gehen. Teilen
// der vCard (Web Share) und der Kontakt-Editor über eine intent:-Adresse gingen nicht und
// sind deshalb entfernt.
import { Kontakt } from '../kern/kontakt';
import { dateinameFuer, erzeugeVCard } from '../kern/vcard';
import { SpeicherAktion } from './aktion';

async function herunterladen(k: Kontakt): Promise<void> {
  const datei = new File([erzeugeVCard(k)], dateinameFuer(k), { type: 'text/vcard' });
  const url = URL.createObjectURL(datei);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateinameFuer(k);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function speicherAktionen(): SpeicherAktion[] {
  return [{ text: 'Als Kontakt speichern (vCard)', ausfuehren: herunterladen, haupt: true }];
}
