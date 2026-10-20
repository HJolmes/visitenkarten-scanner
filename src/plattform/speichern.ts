// Speichern in der Android-App. Zwei Wege, beide ohne Connector und ohne Kontaktberechtigung:
// 1. Kontakt-Editor des Telefons öffnet sich vorausgefüllt, Konto wählen (Outlook), Speichern.
// 2. vCard-Datei mit "Öffnen mit" an eine App übergeben (Kontakte, Outlook, …).
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { ACTION_INSERT, KONTAKT_MIME, insertExtras } from '../kern/android-kontakt';
import { Kontakt } from '../kern/kontakt';
import { dateinameFuer, erzeugeVCard } from '../kern/vcard';
import { SpeicherAktion } from './aktion';

async function inKontakteSpeichern(k: Kontakt): Promise<void> {
  await IntentLauncher.startActivityAsync(ACTION_INSERT, {
    type: KONTAKT_MIME,
    extra: insertExtras(k),
  });
}

function schreibeVCard(k: Kontakt): File {
  const datei = new File(Paths.cache, dateinameFuer(k));
  if (datei.exists) datei.delete();
  datei.create();
  datei.writeSync(erzeugeVCard(k));
  return datei;
}

async function alsVCardOeffnen(k: Kontakt): Promise<void> {
  const datei = schreibeVCard(k);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: datei.contentUri,
    type: 'text/x-vcard',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}

async function alsVCardTeilen(k: Kontakt): Promise<void> {
  const datei = schreibeVCard(k);
  await Sharing.shareAsync(datei.uri, { mimeType: 'text/x-vcard', dialogTitle: 'Kontakt teilen' });
}

export function speicherAktionen(): SpeicherAktion[] {
  return [
    { text: 'In Kontakte / Outlook speichern', ausfuehren: inKontakteSpeichern, haupt: true },
    { text: 'Als vCard öffnen mit …', ausfuehren: alsVCardOeffnen },
    { text: 'vCard teilen', ausfuehren: alsVCardTeilen },
  ];
}
