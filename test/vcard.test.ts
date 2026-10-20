import { describe, expect, it } from 'vitest';
import { insertExtras } from '../src/kern/android-kontakt';
import { Kontakt, leererKontakt } from '../src/kern/kontakt';
import { dateinameFuer, erzeugeVCard, leseKontaktCode } from '../src/kern/vcard';

function beispiel(): Kontakt {
  return {
    ...leererKontakt(),
    titel: 'Dr.',
    vorname: 'Erika',
    nachname: 'Beispiel',
    position: 'Leiterin Einkauf; Technik',
    firma: 'Beispiel GmbH, Paderborn',
    abteilung: 'Einkauf',
    strasse: 'Musterstraße 12',
    plz: '33100',
    ort: 'Paderborn',
    land: 'Deutschland',
    telefone: [
      { art: 'arbeit', nummer: '+49 5251 123456' },
      { art: 'mobil', nummer: '+49 171 2345678' },
      { art: 'fax', nummer: '+49 5251 123457' },
    ],
    emails: ['erika.beispiel@beispiel.de'],
    web: 'www.beispiel.de',
    notiz: 'Messe Oktober',
  };
}

describe('erzeugeVCard', () => {
  it('schreibt alle Felder, maskiert Komma und Semikolon, CRLF', () => {
    const v = erzeugeVCard(beispiel());
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(v).toContain('N:Beispiel;Erika;;Dr.;\r\n');
    expect(v).toContain('FN:Dr. Erika Beispiel\r\n');
    expect(v).toContain('ORG:Beispiel GmbH\\, Paderborn;Einkauf\r\n');
    expect(v).toContain('TITLE:Leiterin Einkauf\\; Technik\r\n');
    expect(v).toContain('TEL;TYPE=CELL,VOICE:+49 171 2345678\r\n');
    expect(v).toContain('TEL;TYPE=WORK,FAX:+49 5251 123457\r\n');
    expect(v).toContain('ADR;TYPE=WORK:;;Musterstraße 12;Paderborn;;33100;Deutschland\r\n');
    expect(v).toContain('URL;TYPE=WORK:https://www.beispiel.de\r\n');
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
  });

  it('faltet lange Zeilen und liest sie verlustfrei zurück', () => {
    const k = { ...beispiel(), notiz: 'Ä'.repeat(100) };
    const v = erzeugeVCard(k);
    for (const zeile of v.split('\r\n')) expect(new TextEncoder().encode(zeile).length).toBeLessThanOrEqual(75);
    const zurueck = leseKontaktCode(v)!;
    expect(zurueck.notiz).toBe('Ä'.repeat(100));
  });

  it('Rundlauf erzeugen -> lesen', () => {
    const zurueck = leseKontaktCode(erzeugeVCard(beispiel()))!;
    expect(zurueck).toMatchObject({
      titel: 'Dr.',
      vorname: 'Erika',
      nachname: 'Beispiel',
      firma: 'Beispiel GmbH, Paderborn',
      abteilung: 'Einkauf',
      position: 'Leiterin Einkauf; Technik',
      plz: '33100',
      ort: 'Paderborn',
      emails: ['erika.beispiel@beispiel.de'],
      quelle: 'qr',
    });
    expect(zurueck.telefone.map((t) => t.art)).toEqual(['arbeit', 'mobil', 'fax']);
  });

  it('Dateiname ohne Sonderzeichen', () => {
    expect(dateinameFuer(beispiel())).toBe('Beispiel_Erika.vcf');
  });
});

describe('leseKontaktCode', () => {
  it('MECARD', () => {
    const k = leseKontaktCode('MECARD:N:Mustermann,Max;TEL:+4952511234;EMAIL:max@muster.de;ORG:Muster GmbH;;')!;
    expect(k).toMatchObject({ vorname: 'Max', nachname: 'Mustermann', firma: 'Muster GmbH', emails: ['max@muster.de'] });
  });
  it('vCard 2.1 mit Gruppenpräfix und TYPE ohne Schlüssel', () => {
    const k = leseKontaktCode('BEGIN:VCARD\nVERSION:2.1\nN:Muster;Max\nitem1.TEL;CELL:0171 1234567\nEND:VCARD')!;
    expect(k.telefone).toEqual([{ art: 'mobil', nummer: '0171 1234567' }]);
  });
  it('anderer QR-Inhalt ergibt null', () => {
    expect(leseKontaktCode('https://www.beispiel.de')).toBeNull();
  });
});

describe('insertExtras (Android)', () => {
  it('füllt Name, Firma, Nummern mit Typ, Adresse und Notiz', () => {
    const e = insertExtras(beispiel());
    expect(e).toMatchObject({
      name: 'Dr. Erika Beispiel',
      company: 'Beispiel GmbH, Paderborn',
      job_title: 'Leiterin Einkauf; Technik',
      phone: '+49 5251 123456',
      phone_type: 3,
      secondary_phone: '+49 171 2345678',
      secondary_phone_type: 2,
      tertiary_phone: '+49 5251 123457',
      tertiary_phone_type: 4,
      email: 'erika.beispiel@beispiel.de',
      email_type: 2,
      postal: 'Musterstraße 12\n33100 Paderborn\nDeutschland',
      postal_type: 2,
      finishActivityOnSaveCompleted: true,
    });
    expect(e.notes).toBe('Abteilung: Einkauf\nWeb: www.beispiel.de\nMesse Oktober');
  });
});
