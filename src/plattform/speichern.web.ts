// Speichern in der Web-App. Alles über die vCard, ohne Connector:
// - Herunterladen: iPhone (Safari) zeigt sofort die Kontaktvorschau, "Neuen Kontakt
//   erstellen" legt ihn im Standardkonto an. Android (Chrome) lädt die Datei, ein Tipp auf
//   "Öffnen" fragt nach der App (Kontakte, Outlook …)
// - Teilen: Teilen-Menü des Telefons mit der vCard als Datei, wenn der Browser das kann
// - Android: Kontakt-Editor direkt über eine intent:-Adresse (ungeprüft, siehe Testplan)
import { kontaktEditorIntentUrl } from '../kern/android-kontakt';
import { Kontakt } from '../kern/kontakt';
import { dateinameFuer, erzeugeVCard } from '../kern/vcard';
import { SpeicherAktion } from './aktion';

function vcardDatei(k: Kontakt): File {
  return new File([erzeugeVCard(k)], dateinameFuer(k), { type: 'text/vcard' });
}

async function herunterladen(k: Kontakt): Promise<void> {
  const url = URL.createObjectURL(vcardDatei(k));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateinameFuer(k);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function teilen(k: Kontakt): Promise<void> {
  const datei = vcardDatei(k);
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: dateinameFuer(k) });
    } catch (e) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if ((e as Error).name !== 'AbortError') throw e;
    }
  } else {
    await herunterladen(k);
  }
}

async function kontaktEditor(k: Kontakt): Promise<void> {
  window.location.href = kontaktEditorIntentUrl(k);
}

function istAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

function kannDateienTeilen(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File(['x'], 'probe.vcf', { type: 'text/vcard' })] });
  } catch {
    return false;
  }
}

export function speicherAktionen(): SpeicherAktion[] {
  const aktionen: SpeicherAktion[] = [{ text: 'Als Kontakt speichern (vCard)', ausfuehren: herunterladen, haupt: true }];
  if (kannDateienTeilen()) aktionen.push({ text: 'Teilen …', ausfuehren: teilen });
  if (istAndroid()) aktionen.push({ text: 'Kontakt-Editor öffnen (Test)', ausfuehren: kontaktEditor });
  return aktionen;
}
