// Speichern in der Web-App: vCard herunterladen, ohne Connector.
// - iPhone (Safari) zeigt sofort die Kontaktvorschau, "Neuen Kontakt erstellen" legt ihn im
//   Standardkonto an
// - Android lädt die Datei, ein Tipp auf die Download-Meldung fragt nach der App (Kontakte …)
//   Samsung Kontakte importiert auch mehrere Kontakte aus einer Datei
//
// Gerätetest 20.10.2026 (Android, Edge): Download und "Öffnen mit > Kontakte" gehen. Teilen
// der vCard (Web Share) und der Kontakt-Editor über eine intent:-Adresse gingen nicht und
// sind deshalb entfernt.
import { Kontakt } from '../kern/kontakt';
import { dateinameFuer, erzeugeVCard } from '../kern/vcard';
import { herunterladen } from './herunterladen.web';

/** Ein oder mehrere Kontakte als eine .vcf-Datei */
export async function speichereKontakte(kontakte: Kontakt[]): Promise<void> {
  if (!kontakte.length) return;
  const name = kontakte.length === 1 ? dateinameFuer(kontakte[0]) : `Visitenkarten_${new Date().toISOString().slice(0, 10)}_${kontakte.length}.vcf`;
  herunterladen(new Blob([kontakte.map(erzeugeVCard).join('')], { type: 'text/vcard' }), name);
}
