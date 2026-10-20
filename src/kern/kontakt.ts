// Ein erkannter Kontakt. Alle Felder sind Text, leer heißt "nicht erkannt".
// Bewusst flach gehalten: so passt es in die Korrekturmaske, in die vCard und
// später als Vorschlag ins CRM.

import { Rechteck } from './ocr';

/**
 * Wo ein Feld auf dem Kartenbild steht. Schlüssel: name, firma, position, abteilung, strasse,
 * ort, web, telefon0…, email0…
 */
export type Bereiche = Partial<Record<string, Rechteck>>;

export type Telefonart = 'arbeit' | 'mobil' | 'fax';

export interface Telefon {
  art: Telefonart;
  /** Für die Anzeige, z. B. "+49 5251 123456" */
  nummer: string;
}

export interface Kontakt {
  anrede: string; // Herr, Frau
  titel: string; // Dr., Prof., Dipl.-Ing.
  vorname: string;
  nachname: string;
  position: string;
  firma: string;
  abteilung: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  telefone: Telefon[];
  emails: string[];
  web: string;
  notiz: string;
  /** Wo der Kontakt herkommt: QR-Code auf der Karte oder Texterkennung */
  quelle: 'qr' | 'ocr' | 'hand';
  /** Der erkannte Rohtext, bleibt zur Kontrolle erhalten */
  rohtext: string;
  /** Profilbild als JPEG in Base64 (ohne "data:"-Vorsatz), z. B. das Foto der Karte */
  foto?: string;
  /** Lage der erkannten Felder auf dem Kartenbild (nur bei Texterkennung) */
  bereiche?: Bereiche;
}

export function leererKontakt(): Kontakt {
  return {
    anrede: '',
    titel: '',
    vorname: '',
    nachname: '',
    position: '',
    firma: '',
    abteilung: '',
    strasse: '',
    plz: '',
    ort: '',
    land: '',
    telefone: [],
    emails: [],
    web: '',
    notiz: '',
    quelle: 'hand',
    rohtext: '',
  };
}

export function anzeigename(k: Kontakt): string {
  return [k.titel, k.vorname, k.nachname].filter(Boolean).join(' ').trim();
}
