// Ordnet den erkannten Text einer Visitenkarte den Kontaktfeldern zu.
// Nur feste Regeln, keine KI: E-Mail, Web und Telefon über Muster, Adresse über
// die Postleitzahl, Firma über die Rechtsform, Name über Anrede, Titel und den
// Abgleich mit der E-Mail-Adresse. Was nicht zuordenbar ist, landet in der Notiz.
// Ergebnis ist immer ein Vorschlag, die Korrekturmaske ist Pflicht.

import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { Bereiche, Kontakt, Telefon, Telefonart, leererKontakt } from './kontakt';
import { OcrErgebnis, OcrWort, Rechteck, rohtextAus, vereinige } from './ocr';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
const WEB = /\b(?:https?:\/\/[^\s,;|]+|www\.[^\s,;|]+)/gi;
const NACKTE_DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:de|com|net|org|eu|info|biz|at|ch|nrw|nl|be|fr|it|es|pl|uk|io)\/?$/i;

// Zeilen, die keine Kontaktdaten sind, aber Ziffern enthalten (sonst als Telefon gelesen)
const AMTLICH = /\b(IBAN|BIC|USt|Ust|UStId|Steuer|St\.-?Nr|HRB|HRA|Amtsgericht|Registergericht|Handelsregister|Sitz der Gesellschaft|Geschäftsführung:|Bankverbindung)\b/i;

const TELEFON_LABEL: Array<[RegExp, Telefonart]> = [
  [/^(?:mobil(?:e|funk)?|handy|mob|cell|m)$/i, 'mobil'],
  [/^(?:fax|telefax|f)$/i, 'fax'],
  [/^(?:tel(?:efon)?|fon|phone|t|zentrale|durchwahl|büro|direkt|p)$/i, 'arbeit'],
];
// Label (optional) + Nummer. Nummer: beginnt mit + ( oder Ziffer, mindestens 7 Zeichen, endet mit Ziffer.
const TELEFON = /(?:\b([A-Za-zäöü]{1,9})\.?\s*:?\s*)?(\+?[\d(][\d\s()\/\-.]{5,}\d)/g;

const ORT = '([A-ZÄÖÜ][A-Za-zÄÖÜäöüß .\\-()\\/]*[A-Za-zäöüß)])\\s*$';
const PLZ_ORT = [
  new RegExp('(?:^|[\\s,])(?:(D|DE)\\s?-\\s?)?(\\d{5})\\s+' + ORT),
  new RegExp('(?:^|[\\s,])(A|AT|CH)\\s?-\\s?(\\d{4})\\s+' + ORT),
];
const STRASSE_ENDUNG = /(straße|strasse|str\.|weg|allee|platz|ring|gasse|damm|ufer|chaussee|pfad|steig|markt|wall|hof|feld|berg|graben|kamp|stieg|brücke|park)\b/i;
const HAUSNUMMER = /\b\d{1,4}\s?[a-zA-Z]?(?:\s?[-\/]\s?\d{1,4}\s?[a-zA-Z]?)?$/;

const RECHTSFORM = /\b(?:GmbH|gGmbH|mbH|AG|KG|KGaA|OHG|GbR|UG|SE|Ltd|Inc|PartG|PartGmbB|eG)\b|\be\.\s?(?:K|V|Kfm|Kfr)\.|&\s?Co\b/;
const FIRMENWORT = /\b(?:gruppe|group|holding|sparkasse|volksbank|raiffeisenbank|stadtwerke|klinikum|krankenhaus|universität|hochschule|kreisverwaltung|stadtverwaltung|wohnungsbau|immobilien|hausverwaltung)\b/i;

const POSITION = /(geschäftsführ|inhaber|leiter|leitung|manager|vertrieb|verkauf|einkauf|prokurist|vorstand|direktor|berater|referent|sachbearbeit|assistent|assistenz|sekretariat|ingenieur|meister|techniker|architekt|kundenbetreu|key account|account|sales|\bceo\b|\bcfo\b|\bcoo\b|\bcto\b|head of|gesellschafter|hausmeister|verwalter|disponent|koordinator|beauftragte|kaufm|consultant|director|owner|\bpartner\b|officer|fachkraft|fachwirt)/i;
const ABTEILUNG = /^(?:abteilung|abt\.|bereich|team|referat)\b/i;

const ANREDE = /^(Herr|Frau|Hr\.|Fr\.)\s+/i;
const TITEL = /\b(?:Prof\.(?:\s?Dr\.)?|Dr\.(?:\s?(?:med|rer\.\s?nat|phil|jur|ing|-Ing)\.?)?|Dipl\.-\s?[A-Za-zäöü]+\.?(?:\s?\(FH\))?|M\.\s?Sc\.|B\.\s?Sc\.|M\.\s?A\.|B\.\s?A\.|MBA|LL\.\s?M\.|Ing\.)/gi;
const NAMENSZUSATZ = /^(?:von|van|de|der|den|zu|vom|zum|ten|ter|di|da|du|le|la)$/i;

interface Zeile {
  text: string;
  benutzt: boolean;
  /** Nur bei Texterkennung mit Positionen: Wörter der Bildzeile und ihre Lage */
  woerter?: OcrWort[];
  box?: Rechteck;
}

/** Text oder Ergebnis der Texterkennung mit Positionen -> Kontakt (mit Bildbereichen je Feld) */
export function parseVisitenkarte(eingabe: string | OcrErgebnis): Kontakt {
  const k = leererKontakt();
  k.quelle = 'ocr';
  k.rohtext = typeof eingabe === 'string' ? eingabe : rohtextAus(eingabe);
  const bereiche: Bereiche = {};
  const merke = (feld: string, z: Zeile, quelltext: string) => {
    const box = boxFuer(z, quelltext);
    if (box) bereiche[feld] = box;
  };

  const zeilen = zeilenAus(eingabe);

  // 1. Amtliche Zeilen (Register, Bank) gleich in die Notiz, damit ihre Ziffern nicht als Telefon gelten
  const notizen: string[] = [];
  for (const z of zeilen) {
    if (AMTLICH.test(z.text)) {
      notizen.push(z.text);
      z.benutzt = true;
    }
  }

  // 2. E-Mail und Web: aus der Zeile herausschneiden, Rest bleibt für andere Regeln
  for (const z of zeilen) {
    if (z.benutzt) continue;
    let t = normalisiereEmail(z.text);
    const mails = t.match(EMAIL) ?? [];
    for (const m of mails) {
      if (k.emails.includes(m.toLowerCase())) continue;
      merke(`email${k.emails.length}`, z, m);
      k.emails.push(m.toLowerCase());
    }
    t = t.replace(EMAIL, ' ');
    const webs = t.match(WEB) ?? [];
    if (webs[0] && !k.web) {
      k.web = webs[0].replace(/[.,;]+$/, '');
      merke('web', z, webs[0]);
    }
    t = t.replace(WEB, ' ');
    t = ohneLabel(t, /\b(?:e-?mail|mail|email|web|internet|www|homepage)\b\s*:?/gi);
    if (!k.web && NACKTE_DOMAIN.test(t.trim())) {
      k.web = t.trim();
      merke('web', z, k.web);
      t = '';
    }
    z.text = aufraeumen(t);
    if (!z.text) z.benutzt = true;
  }

  // 3. Telefonnummern
  for (const z of zeilen) {
    if (z.benutzt) continue;
    const gefunden = findeTelefone(z.text);
    if (!gefunden.telefone.length) continue;
    for (const { roh, ...t } of gefunden.telefone) {
      if (k.telefone.some((x) => x.nummer === t.nummer)) continue;
      merke(`telefon${k.telefone.length}`, z, roh);
      k.telefone.push(t);
    }
    z.text = aufraeumen(gefunden.rest);
    if (!z.text) z.benutzt = true;
  }

  // 4. Adresse: Zeile mit PLZ + Ort, Straße davor in derselben Zeile oder in der Zeile darüber
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.benutzt) continue;
    const m = PLZ_ORT.map((re) => z.text.match(re)).find(Boolean);
    if (!m || m.index === undefined) continue;
    k.plz = m[2];
    k.ort = m[3].trim();
    k.land = landAusKuerzel(m[1]);
    merke('ort', z, `${m[2]} ${m[3]}`);
    const davor = aufraeumen(z.text.slice(0, m.index));
    z.benutzt = true;
    if (davor && istStrasse(davor)) {
      k.strasse = davor;
      merke('strasse', z, davor);
    } else {
      if (davor) notizen.push(davor);
      const vorher = zeilen[i - 1];
      if (vorher && !vorher.benutzt && istStrasse(vorher.text)) {
        k.strasse = vorher.text;
        merke('strasse', vorher, vorher.text);
        vorher.benutzt = true;
      }
    }
    break;
  }
  if (!k.strasse) {
    const z = zeilen.find((x) => !x.benutzt && STRASSE_ENDUNG.test(x.text) && HAUSNUMMER.test(x.text));
    if (z) {
      k.strasse = z.text;
      merke('strasse', z, z.text);
      z.benutzt = true;
    }
  }

  // 5. Firma: Rechtsform schlägt alles, sonst Firmenwort, sonst Abgleich mit der Mail-Domain
  const domainStamm = mailDomainStamm(k.emails[0] ?? k.web);
  let firma = zeilen.find((z) => !z.benutzt && RECHTSFORM.test(z.text));
  if (!firma) firma = zeilen.find((z) => !z.benutzt && FIRMENWORT.test(z.text) && !POSITION.test(z.text));
  if (!firma && domainStamm) {
    firma = zeilen.find((z) => !z.benutzt && !POSITION.test(z.text) && kompakt(z.text).includes(domainStamm));
  }

  // 6. Name: Kandidaten bewerten, die Firmenzeile ist ausgeschlossen
  // Personenbezogener Teil der Mail; Sammeladressen (info@, firma@firma.de) verraten keinen Namen
  const lokal = personenMailteil(k.emails, domainStamm);
  let besterName: Zeile | undefined;
  let besteWertung = 1;
  for (const z of zeilen) {
    if (z.benutzt || z === firma) continue;
    const w = nameWertung(z.text, lokal);
    if (w > besteWertung) {
      besteWertung = w;
      besterName = z;
    }
  }
  // Fällt die Firmenzeile nur über die Domain und ist zugleich der Name (Einzelunternehmer),
  // gewinnt der Name.
  if (!besterName && firma && !RECHTSFORM.test(firma.text) && nameWertung(firma.text, lokal) >= 5) {
    besterName = firma;
    firma = undefined;
  }
  if (firma) {
    k.firma = firma.text;
    merke('firma', firma, firma.text);
    firma.benutzt = true;
  }
  if (besterName) {
    Object.assign(k, zerlegeName(besterName.text));
    merke('name', besterName, besterName.text);
    besterName.benutzt = true;
  }

  // 7. Position und Abteilung
  for (const z of zeilen) {
    if (z.benutzt) continue;
    if (ABTEILUNG.test(z.text) && !k.abteilung) {
      k.abteilung = z.text;
      merke('abteilung', z, z.text);
      z.benutzt = true;
    } else if (POSITION.test(z.text) && !/\d/.test(z.text)) {
      if (!k.position) merke('position', z, z.text);
      k.position = k.position ? `${k.position} / ${z.text}` : z.text;
      z.benutzt = true;
    }
  }

  // 8. Rest in die Notiz; Splitter aus Logos und Sperrschrift ("HG", "TENE") bleiben weg
  for (const z of zeilen) if (!z.benutzt && !istSplitter(z.text)) notizen.push(z.text);
  k.notiz = notizen.join('\n');
  if (Object.keys(bereiche).length) k.bereiche = bereiche;
  return k;
}

// ---------- Zerlegen und Aufräumen ----------

const SPALTENTRENNER = /\s+[|·•]\s+|\s{3,}|\t/;

function zeilenAus(eingabe: string | OcrErgebnis): Zeile[] {
  const quellen: Array<{ text: string; woerter?: OcrWort[]; box?: Rechteck }> =
    typeof eingabe === 'string' ? eingabe.replace(/\r/g, '').split('\n').map((text) => ({ text })) : eingabe.zeilen;
  return quellen.flatMap((q) =>
    ocrFehlerKorrigieren(q.text)
      .split(SPALTENTRENNER)
      .map(aufraeumen)
      .filter((t) => t.length > 1)
      .map((text) => ({ text, benutzt: false, woerter: q.woerter, box: q.box })),
  );
}

export function zerlegeZeilen(roh: string): string[] {
  return zeilenAus(roh).map((z) => z.text);
}

/**
 * Typische Lesefehler der Texterkennung, die auf Visitenkarten praktisch nie echt sind:
 * - "!" zwischen Buchstaben ("Großhande!l" -> "Großhandel", ein "l" wird als "!l" gelesen)
 * - einzelne Anführungszeichen und Striche als eigenes Wort (Reste von Logos)
 */
export function ocrFehlerKorrigieren(t: string): string {
  return t
    .replace(/\b[Ww]{3,5}\.(?=[A-Za-z0-9])/g, 'www.')
    .replace(/([A-Za-zÄÖÜäöüß])!(?=[A-Za-zÄÖÜäöüß])/g, '$1')
    .replace(/\s?[”“"'‚„`´|]+(?=\s|$)/g, (treffer, stelle: number, ganz: string) =>
      // nur freistehende Zeichen entfernen, nicht das schließende Anführungszeichen eines Worts
      stelle === 0 || /\s/.test(ganz[stelle]) ? '' : treffer,
    );
}

/** Kurzer Rest ohne Ziffern, z. B. aus einem Logo in Sperrschrift */
function istSplitter(t: string): boolean {
  return !/\d/.test(t) && t.replace(/[^A-Za-zÄÖÜäöüß]/g, '').length <= 4;
}

/** Bildbereich zu einem Feldwert: die Wörter der Zeile, die im Wert vorkommen */
function boxFuer(z: Zeile, quelltext: string): Rechteck | undefined {
  if (!z.woerter) return z.box;
  const q = kompakt(quelltext);
  const treffer = z.woerter.filter((w) => {
    const kw = kompakt(w.text);
    return kw.length > 0 && q.includes(kw);
  });
  return treffer.length ? vereinige(treffer.map((w) => w.box)) : z.box;
}

function aufraeumen(t: string): string {
  return t
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:|·•\-–]+|[\s,;:|·•\-–]+$/g, '')
    .trim();
}

function ohneLabel(t: string, label: RegExp): string {
  return t.replace(label, ' ');
}

function normalisiereEmail(t: string): string {
  return t
    .replace(/\s*[([]\s*at\s*[)\]]\s*/gi, '@')
    .replace(/\s+@\s+/g, '@')
    .replace(/(\S)@\s+(\S)/g, '$1@$2');
}

function kompakt(t: string): string {
  return t
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function mailDomainStamm(mailOderWeb: string): string {
  if (!mailOderWeb) return '';
  const host = mailOderWeb.includes('@') ? mailOderWeb.split('@')[1] : mailOderWeb.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const teile = host.split('/')[0].split('.');
  const stamm = kompakt(teile.length >= 2 ? teile[teile.length - 2] : teile[0]);
  // Freemailer verraten keine Firma
  if (['gmail', 'gmx', 'web', 'tonline', 'outlook', 'hotmail', 'yahoo', 'icloud', 'freenet', 'posteo', 'aol'].includes(stamm)) return '';
  return stamm.length >= 3 ? stamm : '';
}

function landAusKuerzel(kz: string | undefined): string {
  if (!kz) return '';
  if (/^(A|AT)$/i.test(kz)) return 'Österreich';
  if (/^CH$/i.test(kz)) return 'Schweiz';
  return 'Deutschland';
}

function istStrasse(t: string): boolean {
  if (/\d{5}/.test(t)) return false;
  if (/^postfach\b/i.test(t)) return true;
  return HAUSNUMMER.test(t) && (STRASSE_ENDUNG.test(t) || /^[A-ZÄÖÜ][\wäöüß.\- ]+\s\d/.test(t));
}

// ---------- Telefon ----------

function findeTelefone(zeile: string): { telefone: Array<Telefon & { roh: string }>; rest: string } {
  const telefone: Array<Telefon & { roh: string }> = [];
  const vorbereitet = zeile.replace(/(\+\d{1,3})\s*\(0\)\s*/g, '$1 ');
  let rest = vorbereitet;
  TELEFON.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TELEFON.exec(vorbereitet))) {
    const label = m[1];
    const roh = m[2].trim();
    const ziffern = roh.replace(/\D/g, '');
    if (ziffern.length < 6 || ziffern.length > 15) continue;
    let art = label ? artAusLabel(label) : undefined;
    const nummer = formatiere(roh);
    if (!art) art = istMobilnummer(nummer) ? 'mobil' : 'arbeit';
    telefone.push({ art, nummer, roh });
    rest = rest.replace(m[0], ' ');
  }
  rest = rest.replace(/\b(?:tel(?:efon)?|fon|phone|mobil(?:e)?|handy|fax|telefax|zentrale|durchwahl)\b\.?\s*:?/gi, ' ');
  return { telefone, rest };
}

/** Eine Nummer aus freiem Text (z. B. auf dem Bild gewählt), mit Art aus Label oder Vorwahl */
export function telefonAusText(text: string): Telefon {
  const gefunden = findeTelefone(text).telefone[0];
  if (gefunden) return { art: gefunden.art, nummer: gefunden.nummer };
  return { art: 'arbeit', nummer: aufraeumen(text) };
}

function artAusLabel(label: string): Telefonart | undefined {
  for (const [re, art] of TELEFON_LABEL) if (re.test(label)) return art;
  return undefined;
}

function formatiere(roh: string): string {
  const p = parsePhoneNumberFromString(roh, 'DE');
  if (p && p.isValid()) return p.formatInternational();
  return roh.replace(/\s+/g, ' ').trim();
}

function istMobilnummer(nummer: string): boolean {
  const p = parsePhoneNumberFromString(nummer, 'DE');
  if (!p || p.countryCallingCode !== '49') return false;
  return /^1[5-7]/.test(p.nationalNumber);
}

// ---------- Name ----------

const SAMMELADRESSE = /^(?:info|kontakt|contact|mail|email|office|buero|service|zentrale|vertrieb|verkauf|sales|post|team|hallo|hello|anfrage|anfragen|empfang|verwaltung)$/;

function personenMailteil(emails: string[], domainStamm: string): string {
  for (const m of emails) {
    const lokal = kompakt(m.split('@')[0]);
    if (lokal.length < 3 || SAMMELADRESSE.test(lokal)) continue;
    if (domainStamm && domainStamm.includes(lokal)) continue;
    return lokal;
  }
  return '';
}

function nameWertung(t: string, mailLokal: string): number {
  if (/\d|@/.test(t)) return -10;
  // Logo- und Scanreste ("J” HEMPELMANN"): Namen bestehen nur aus Buchstaben, Bindestrich, Punkt
  if (/[^A-Za-zÄÖÜäöüßÀ-ÿ'’.,\- ]/.test(t)) return -5;
  if (RECHTSFORM.test(t) || FIRMENWORT.test(t)) return -10;
  const ohneTitel = t.replace(ANREDE, '').replace(TITEL, ' ').replace(/,/g, ' ');
  const woerter = ohneTitel.split(/\s+/).filter(Boolean);
  if (woerter.length < 2 || woerter.length > 5) return -5;
  if (woerter.some((x) => x.length === 1)) return -3;
  let w = 0;
  if (POSITION.test(t)) w -= 6;
  if (ANREDE.test(t)) w += 3;
  TITEL.lastIndex = 0;
  if (TITEL.test(t)) w += 2;
  TITEL.lastIndex = 0;
  const gross = woerter.filter((x) => /^[A-ZÄÖÜ][a-zäöüß'\-]+$/.test(x) || NAMENSZUSATZ.test(x)).length;
  if (gross === woerter.length && woerter.length <= 4) w += 2;
  if (woerter.every((x) => /^[A-ZÄÖÜ'\-]+$/.test(x)) && woerter.length <= 4) w += 1;
  if (mailLokal) {
    const treffer = woerter.filter((x) => kompakt(x).length >= 3 && mailLokal.includes(kompakt(x))).length;
    if (treffer >= 2) w += 6;
    else if (treffer === 1) w += 4;
  }
  return w;
}

export function zerlegeName(t: string): Pick<Kontakt, 'anrede' | 'titel' | 'vorname' | 'nachname'> {
  let rest = t.trim();
  let anrede = '';
  const a = rest.match(ANREDE);
  if (a) {
    anrede = /^(Herr|Hr\.)$/i.test(a[1]) ? 'Herr' : 'Frau';
    rest = rest.slice(a[0].length);
  }
  // "DR." -> "Dr.", "DIPL.-ING." -> "Dipl.-Ing."; Abkürzungen ohne Punkt (MBA) bleiben
  const titel = (rest.match(TITEL) ?? []).map((x) => (x.includes('.') ? schreibweise(x.trim()) : x.trim()));
  rest = rest.replace(TITEL, ' ');
  TITEL.lastIndex = 0;

  // "Mustermann, Max" -> umdrehen; "Max Mustermann, MBA" wurde oben schon bereinigt
  const teile = rest.split(',').map((x) => x.trim()).filter(Boolean);
  if (teile.length === 2 && !teile[0].includes(' ') && teile[1].split(/\s+/).length <= 2) {
    rest = `${teile[1]} ${teile[0]}`;
  } else {
    rest = teile.join(' ');
  }

  const woerter = rest.split(/\s+/).filter(Boolean).map(schreibweise);
  if (woerter.length === 0) return { anrede, titel: titel.join(' '), vorname: '', nachname: '' };
  if (woerter.length === 1) return { anrede, titel: titel.join(' '), vorname: '', nachname: woerter[0] };

  // Nachname = letztes Wort plus vorangestellte Namenszusätze (von, van, de …)
  let start = woerter.length - 1;
  while (start > 1 && NAMENSZUSATZ.test(woerter[start - 1])) start--;
  return {
    anrede,
    titel: titel.join(' '),
    vorname: woerter.slice(0, start).join(' '),
    nachname: woerter.slice(start).join(' '),
  };
}

// "MAX MUSTERMANN" -> "Max Mustermann", gemischte Schreibung bleibt
function schreibweise(w: string): string {
  if (NAMENSZUSATZ.test(w)) return w.toLowerCase();
  if (w.length > 1 && w === w.toUpperCase()) {
    return w
      .toLowerCase()
      .replace(/(^|[-'])([a-zäöü])/g, (_, p, c) => p + c.toUpperCase());
  }
  return w;
}
