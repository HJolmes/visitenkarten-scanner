// Speichern im Browser (iPhone-Weg): vCard herunterladen. Safari auf dem iPhone zeigt die
// Kontaktvorschau, "Neuen Kontakt erstellen" legt ihn im Standardkonto an. Ist dort das
// Exchange-Konto Standard (Einstellungen > Kontakte > Standardaccount), landet er in Outlook.
import { Kontakt } from '../kern/kontakt';
import { dateinameFuer, erzeugeVCard } from '../kern/vcard';

export const WEGE = ['vcard'] as const;

export async function inKontakteSpeichern(k: Kontakt): Promise<void> {
  await alsVCardOeffnen(k);
}

export async function alsVCardOeffnen(k: Kontakt): Promise<void> {
  const blob = new Blob([erzeugeVCard(k)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateinameFuer(k);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function alsVCardTeilen(k: Kontakt): Promise<void> {
  await alsVCardOeffnen(k);
}
