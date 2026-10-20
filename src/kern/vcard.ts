// vCard 3.0 schreiben (für Android-Kontakte, Outlook und das iPhone) und
// vCard/MECARD lesen (für den QR-Code auf der Karte).

import { Kontakt, Telefon, Telefonart, leererKontakt } from './kontakt';

const CRLF = '\r\n';

function esc(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

// Zeilen über 75 Byte falten (RFC 6350/2426). Outlook liest ungefaltete Zeilen zwar,
// andere Programme nicht immer.
function falten(zeile: string): string {
  const bytes = new TextEncoder().encode(zeile);
  if (bytes.length <= 75) return zeile;
  const teile: string[] = [];
  let aktuell = '';
  let laenge = 0;
  for (const zeichen of zeile) {
    const l = new TextEncoder().encode(zeichen).length;
    if (laenge + l > (teile.length ? 74 : 75)) {
      teile.push(aktuell);
      aktuell = '';
      laenge = 0;
    }
    aktuell += zeichen;
    laenge += l;
  }
  teile.push(aktuell);
  return teile.join(CRLF + ' ');
}

const TEL_TYP: Record<Telefonart, string> = {
  arbeit: 'WORK,VOICE',
  mobil: 'CELL,VOICE',
  fax: 'WORK,FAX',
};

export function erzeugeVCard(k: Kontakt): string {
  const z: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  z.push(`N:${esc(k.nachname)};${esc(k.vorname)};;${esc(k.titel)};`);
  const fn = [k.titel, k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || 'Unbekannt';
  z.push(`FN:${esc(fn)}`);
  if (k.firma || k.abteilung) z.push(`ORG:${esc(k.firma)}${k.abteilung ? ';' + esc(k.abteilung) : ''}`);
  if (k.position) z.push(`TITLE:${esc(k.position)}`);
  for (const t of k.telefone) z.push(`TEL;TYPE=${TEL_TYP[t.art]}:${t.nummer}`);
  k.emails.forEach((m, i) => z.push(`EMAIL;TYPE=INTERNET,WORK${i === 0 ? ',PREF' : ''}:${m}`));
  if (k.strasse || k.plz || k.ort || k.land) {
    z.push(`ADR;TYPE=WORK:;;${esc(k.strasse)};${esc(k.ort)};;${esc(k.plz)};${esc(k.land)}`);
  }
  if (k.web) z.push(`URL;TYPE=WORK:${k.web.startsWith('http') ? k.web : 'https://' + k.web}`);
  const notiz = [k.anrede ? `Anrede: ${k.anrede}` : '', k.notiz].filter(Boolean).join('\n');
  if (notiz) z.push(`NOTE:${esc(notiz)}`);
  if (k.foto) z.push(`PHOTO;ENCODING=b;TYPE=JPEG:${k.foto}`);
  z.push('END:VCARD');
  return z.map(falten).join(CRLF) + CRLF;
}

export function dateinameFuer(k: Kontakt): string {
  const basis = [k.nachname, k.vorname].filter(Boolean).join('_') || k.firma || 'kontakt';
  return basis.replace(/[^\wäöüÄÖÜß-]+/g, '_').slice(0, 60) + '.vcf';
}

// ---------- Lesen (QR-Code) ----------

function unesc(t: string): string {
  return t.replace(/\\n/gi, '\n').replace(/\\([,;:\\])/g, '$1');
}

function splitUnescaped(t: string, trenner: string): string[] {
  const teile: string[] = [];
  let aktuell = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && i + 1 < t.length) {
      aktuell += t[i] + t[i + 1];
      i++;
    } else if (t[i] === trenner) {
      teile.push(aktuell);
      aktuell = '';
    } else aktuell += t[i];
  }
  teile.push(aktuell);
  return teile;
}

function telefonArtAusTyp(typ: string): Telefonart {
  if (/FAX/i.test(typ)) return 'fax';
  if (/CELL|MOBILE/i.test(typ)) return 'mobil';
  return 'arbeit';
}

/** Liest vCard (2.1/3.0/4.0) oder MECARD. Gibt null zurück, wenn der Text keins von beiden ist. */
export function leseKontaktCode(text: string): Kontakt | null {
  const t = text.trim();
  if (/^BEGIN:VCARD/i.test(t)) return leseVCard(t);
  if (/^MECARD:/i.test(t)) return leseMeCard(t);
  return null;
}

function leseVCard(text: string): Kontakt {
  const k = leererKontakt();
  k.quelle = 'qr';
  k.rohtext = text;
  // Faltung aufheben
  const zeilen = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  for (const zeile of zeilen) {
    const doppelpunkt = zeile.indexOf(':');
    if (doppelpunkt < 0) continue;
    const kopf = zeile.slice(0, doppelpunkt);
    const wert = zeile.slice(doppelpunkt + 1);
    const [nameMitGruppe, ...params] = kopf.split(';');
    const name = nameMitGruppe.replace(/^.*\./, '').toUpperCase();
    const typ = params.join(';');
    switch (name) {
      case 'N': {
        const [nach, vor, , titel] = splitUnescaped(wert, ';').map(unesc);
        k.nachname = nach ?? '';
        k.vorname = vor ?? '';
        k.titel = titel ?? '';
        break;
      }
      case 'FN':
        if (!k.nachname && !k.vorname) {
          const teile = unesc(wert).split(' ');
          k.nachname = teile.pop() ?? '';
          k.vorname = teile.join(' ');
        }
        break;
      case 'ORG': {
        const [firma, abteilung] = splitUnescaped(wert, ';').map(unesc);
        k.firma = firma ?? '';
        k.abteilung = abteilung ?? '';
        break;
      }
      case 'TITLE':
        k.position = unesc(wert);
        break;
      case 'TEL':
        k.telefone.push({ art: telefonArtAusTyp(typ), nummer: wert.replace(/^tel:/i, '').trim() });
        break;
      case 'EMAIL':
        k.emails.push(wert.trim().toLowerCase());
        break;
      case 'ADR': {
        const [, , strasse, ort, , plz, land] = splitUnescaped(wert, ';').map(unesc);
        k.strasse = strasse ?? '';
        k.ort = ort ?? '';
        k.plz = plz ?? '';
        k.land = land ?? '';
        break;
      }
      case 'URL':
        k.web = wert.trim();
        break;
      case 'NOTE':
        k.notiz = unesc(wert);
        break;
    }
  }
  return k;
}

function leseMeCard(text: string): Kontakt {
  const k = leererKontakt();
  k.quelle = 'qr';
  k.rohtext = text;
  const inhalt = text.replace(/^MECARD:/i, '').replace(/;;\s*$/, '');
  for (const feld of splitUnescaped(inhalt, ';')) {
    const i = feld.indexOf(':');
    if (i < 0) continue;
    const name = feld.slice(0, i).toUpperCase();
    const wert = unesc(feld.slice(i + 1));
    if (name === 'N') {
      const [nach, vor] = wert.split(',');
      k.nachname = (nach ?? '').trim();
      k.vorname = (vor ?? '').trim();
    } else if (name === 'TEL') {
      k.telefone.push({ art: 'arbeit', nummer: wert } as Telefon);
    } else if (name === 'EMAIL') k.emails.push(wert.toLowerCase());
    else if (name === 'ORG') k.firma = wert;
    else if (name === 'URL') k.web = wert;
    else if (name === 'NOTE') k.notiz = wert;
    else if (name === 'ADR') k.notiz = [k.notiz, wert].filter(Boolean).join('\n');
  }
  return k;
}
