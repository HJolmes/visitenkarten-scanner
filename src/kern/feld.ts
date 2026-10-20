// Felder der Prüfmaske und die Übernahme von Text, der auf dem Kartenbild gewählt wurde.
import { Kontakt } from './kontakt';
import { Rechteck } from './ocr';
import { telefonAusText, zerlegeName } from './parser';

/** Schlüssel wie in Kontakt.bereiche: name, firma, …, telefon0, email1, notiz */
export type FeldSchluessel = string;

export const FELD_NAMEN: Record<string, string> = {
  name: 'Name',
  firma: 'Firma',
  abteilung: 'Abteilung',
  position: 'Position',
  strasse: 'Straße',
  ort: 'PLZ und Ort',
  web: 'Webseite',
  notiz: 'Notiz',
};

export function feldName(feld: FeldSchluessel): string {
  const nr = feld.match(/^(telefon|email)(\d+)$/);
  if (nr) return `${nr[1] === 'telefon' ? 'Telefon' : 'E-Mail'} ${Number(nr[2]) + 1}`;
  return FELD_NAMEN[feld] ?? feld;
}

/** Gewählten Text in ein Feld übernehmen; Name und Ort werden dabei zerlegt */
export function feldUebernehmen(k: Kontakt, feld: FeldSchluessel, text: string, box?: Rechteck): Kontakt {
  const n: Kontakt = { ...k, telefone: [...k.telefone], emails: [...k.emails], bereiche: { ...k.bereiche } };
  const t = text.replace(/\s+/g, ' ').trim();
  const nr = feld.match(/^(telefon|email)(\d+)$/);
  if (feld === 'name') {
    Object.assign(n, zerlegeName(t));
  } else if (feld === 'ort') {
    const m = t.match(/^(?:(?:D|DE|A|AT|CH)\s?-\s?)?(\d{4,5})\s+(.+)$/);
    n.plz = m ? m[1] : '';
    n.ort = m ? m[2] : t;
  } else if (feld === 'notiz') {
    n.notiz = [k.notiz, t].filter(Boolean).join('\n');
  } else if (nr?.[1] === 'telefon') {
    const i = Math.min(Number(nr[2]), n.telefone.length);
    const neu = telefonAusText(t);
    n.telefone[i] = { art: k.telefone[i]?.art ?? neu.art, nummer: neu.nummer };
  } else if (nr?.[1] === 'email') {
    const i = Math.min(Number(nr[2]), n.emails.length);
    n.emails[i] = t.replace(/\s/g, '').toLowerCase();
  } else if (feld in FELD_NAMEN) {
    (n as unknown as Record<string, string>)[feld] = t;
  }
  if (box && feld !== 'notiz') n.bereiche![feld] = box;
  return n;
}
