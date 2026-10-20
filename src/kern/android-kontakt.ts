// Baut die Extras für den Android-Intent ACTION_INSERT (ContactsContract.Intents.Insert).
// Der Intent öffnet den Kontakt-Editor des Telefons mit allen Feldern vorausgefüllt.
// Dort wählt man das Konto (Outlook/Exchange oder Telefon) und tippt auf Speichern.
// Keine Berechtigung nötig, kein Connector.
//
// Grenzen des Intents: höchstens 3 Telefonnummern, 3 E-Mails, eine Adresse als
// Freitext. Webseite und Abteilung kennt er nicht, sie gehen in die Notiz.

import { Kontakt, Telefonart, anzeigename } from './kontakt';

export const ACTION_INSERT = 'android.intent.action.INSERT';
export const KONTAKT_MIME = 'vnd.android.cursor.dir/contact';

// ContactsContract.CommonDataKinds.Phone.TYPE_*
const PHONE_TYPE: Record<Telefonart, number> = { mobil: 2, arbeit: 3, fax: 4 };
const EMAIL_TYPE_WORK = 2; // CommonDataKinds.Email.TYPE_WORK
const POSTAL_TYPE_WORK = 2; // CommonDataKinds.StructuredPostal.TYPE_WORK

export function insertExtras(k: Kontakt): Record<string, string | number | boolean> {
  const e: Record<string, string | number | boolean> = {};
  const name = anzeigename(k);
  if (name) e.name = name;
  if (k.firma) e.company = k.firma;
  if (k.position) e.job_title = k.position;

  const telSchluessel = [
    ['phone', 'phone_type'],
    ['secondary_phone', 'secondary_phone_type'],
    ['tertiary_phone', 'tertiary_phone_type'],
  ];
  k.telefone.slice(0, 3).forEach((t, i) => {
    e[telSchluessel[i][0]] = t.nummer;
    e[telSchluessel[i][1]] = PHONE_TYPE[t.art];
  });

  const mailSchluessel = [
    ['email', 'email_type'],
    ['secondary_email', 'secondary_email_type'],
    ['tertiary_email', 'tertiary_email_type'],
  ];
  k.emails.slice(0, 3).forEach((m, i) => {
    e[mailSchluessel[i][0]] = m;
    e[mailSchluessel[i][1]] = EMAIL_TYPE_WORK;
  });

  const ortZeile = [k.plz, k.ort].filter(Boolean).join(' ');
  const adresse = [k.strasse, ortZeile, k.land].filter(Boolean).join('\n');
  if (adresse) {
    e.postal = adresse;
    e.postal_type = POSTAL_TYPE_WORK;
  }

  const notiz = [
    k.abteilung ? `Abteilung: ${k.abteilung}` : '',
    k.web ? `Web: ${k.web}` : '',
    k.telefone.length > 3 ? 'Weitere Nummern: ' + k.telefone.slice(3).map((t) => t.nummer).join(', ') : '',
    k.notiz,
  ]
    .filter(Boolean)
    .join('\n');
  if (notiz) e.notes = notiz;

  // Nach dem Speichern zurück in die App statt in die Kontaktliste
  e.finishActivityOnSaveCompleted = true;
  return e;
}

/**
 * Derselbe Intent als `intent:`-Adresse für Chrome auf Android (Web-App). Chrome startet
 * damit nur Apps, die Aufrufe aus dem Browser zulassen; ob der Kontakt-Editor dazugehört,
 * ist ungeprüft (Testplan).
 */
export function kontaktEditorIntentUrl(k: Kontakt): string {
  const teile = [`action=${ACTION_INSERT}`, `type=${KONTAKT_MIME}`];
  for (const [schluessel, wert] of Object.entries(insertExtras(k))) {
    const art = typeof wert === 'number' ? 'i' : typeof wert === 'boolean' ? 'B' : 'S';
    teile.push(`${art}.${schluessel}=${encodeURIComponent(String(wert))}`);
  }
  return `intent:#Intent;${teile.join(';')};end`;
}
