// Speichern in der Android-App (ruht). Ohne Connector und ohne Kontaktberechtigung:
// - ein Kontakt: Kontakt-Editor des Telefons öffnet sich vorausgefüllt, Konto wählen, Speichern
// - mehrere: eine vCard-Datei mit "Öffnen mit", die Kontakte-App importiert alle
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { ACTION_INSERT, KONTAKT_MIME, insertExtras } from '../kern/android-kontakt';
import { Kontakt } from '../kern/kontakt';
import { erzeugeVCard } from '../kern/vcard';

export async function speichereKontakte(kontakte: Kontakt[]): Promise<void> {
  if (!kontakte.length) return;
  if (kontakte.length === 1) {
    await IntentLauncher.startActivityAsync(ACTION_INSERT, { type: KONTAKT_MIME, extra: insertExtras(kontakte[0]) });
    return;
  }
  const datei = new File(Paths.cache, `Visitenkarten_${kontakte.length}.vcf`);
  if (datei.exists) datei.delete();
  datei.create();
  datei.writeSync(kontakte.map(erzeugeVCard).join(''));
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: datei.contentUri,
    type: 'text/x-vcard',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
