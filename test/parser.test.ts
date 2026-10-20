// Alle Karten sind erfunden. Echte Karten nicht ins Repo, sie enthalten Personendaten.
import { describe, expect, it } from 'vitest';
import { parseVisitenkarte, zerlegeName } from '../src/kern/parser';

describe('parseVisitenkarte', () => {
  it('klassische Karte mit Rechtsform, Position, Adresse und beschrifteten Nummern', () => {
    const k = parseVisitenkarte(
      [
        'Muster Facility Services GmbH',
        'Max Mustermann',
        'Geschäftsführer',
        'Musterstraße 12',
        '33100 Paderborn',
        'Tel. 05251 123456',
        'Mobil 0171 2345678',
        'Fax 05251 123457',
        'max.mustermann@muster-fs.de',
        'www.muster-fs.de',
      ].join('\n'),
    );
    expect(k.firma).toBe('Muster Facility Services GmbH');
    expect(k.vorname).toBe('Max');
    expect(k.nachname).toBe('Mustermann');
    expect(k.position).toBe('Geschäftsführer');
    expect(k.strasse).toBe('Musterstraße 12');
    expect(k.plz).toBe('33100');
    expect(k.ort).toBe('Paderborn');
    expect(k.emails).toEqual(['max.mustermann@muster-fs.de']);
    expect(k.web).toBe('www.muster-fs.de');
    expect(k.telefone).toEqual([
      { art: 'arbeit', nummer: '+49 5251 123456' },
      { art: 'mobil', nummer: '+49 171 2345678' },
      { art: 'fax', nummer: '+49 5251 123457' },
    ]);
    expect(k.notiz).toBe('');
  });

  it('Titel, Anrede, Großschreibung und Einbuchstaben-Labels', () => {
    const k = parseVisitenkarte(
      [
        'DR. ERIKA BEISPIEL',
        'Leiterin Gebäudemanagement',
        'Beispiel Klinikum Ostwestfalen',
        'Am Beispielweg 3a · 32756 Detmold',
        'T +49 (0) 5231 98765-0 | M +49 160 1112223',
        'E erika.beispiel@klinikum-beispiel.de',
      ].join('\n'),
    );
    expect(k.titel).toBe('Dr.');
    expect(k.vorname).toBe('Erika');
    expect(k.nachname).toBe('Beispiel');
    expect(k.position).toBe('Leiterin Gebäudemanagement');
    expect(k.firma).toBe('Beispiel Klinikum Ostwestfalen');
    expect(k.strasse).toBe('Am Beispielweg 3a');
    expect(k.plz).toBe('32756');
    expect(k.ort).toBe('Detmold');
    expect(k.telefone.map((t) => t.art)).toEqual(['arbeit', 'mobil']);
    expect(k.telefone[1].nummer).toBe('+49 160 1112223');
    expect(k.emails).toEqual(['erika.beispiel@klinikum-beispiel.de']);
  });

  it('unbeschriftete Mobilnummer wird an der Vorwahl erkannt, Registerzeilen gehen in die Notiz', () => {
    const k = parseVisitenkarte(
      [
        'Hans-Peter von Testhausen',
        'Vertrieb Nord',
        'Testbau AG',
        'Postfach 1234, 33098 Paderborn',
        '0151 98765432',
        'hp.testhausen@testbau.de',
        'Amtsgericht Paderborn HRB 12345',
      ].join('\n'),
    );
    expect(k.vorname).toBe('Hans-Peter');
    expect(k.nachname).toBe('von Testhausen');
    expect(k.firma).toBe('Testbau AG');
    expect(k.position).toBe('Vertrieb Nord');
    expect(k.strasse).toBe('Postfach 1234');
    expect(k.telefone).toEqual([{ art: 'mobil', nummer: '+49 1519 8765432' }]);
    expect(k.notiz).toContain('HRB 12345');
  });

  it('ohne Rechtsform: Firma über die Mail-Domain, (at)-Schreibweise', () => {
    const k = parseVisitenkarte(
      ['Malerbetrieb Pinselstrich', 'Frau Anna Farbe', 'Inhaberin', 'anna (at) pinselstrich.de', 'Tel: 05252 / 4711'].join('\n'),
    );
    expect(k.firma).toBe('Malerbetrieb Pinselstrich');
    expect(k.anrede).toBe('Frau');
    expect(k.vorname).toBe('Anna');
    expect(k.nachname).toBe('Farbe');
    expect(k.position).toBe('Inhaberin');
    expect(k.emails).toEqual(['anna@pinselstrich.de']);
    expect(k.telefone).toEqual([{ art: 'arbeit', nummer: '+49 5252 4711' }]);
  });

  it('Freemailer liefert keine Firma, Österreich-PLZ mit Länderkürzel', () => {
    const k = parseVisitenkarte(['Karl Beispielmann', 'Beratung', 'Probegasse 7', 'A-1010 Wien', 'karl.beispielmann@gmail.com'].join('\n'));
    expect(k.firma).toBe('');
    expect(k.nachname).toBe('Beispielmann');
    expect(k.strasse).toBe('Probegasse 7');
    expect(k.plz).toBe('1010');
    expect(k.ort).toBe('Wien');
    expect(k.land).toBe('Österreich');
  });
});

describe('zerlegeName', () => {
  it('Nachname, Vorname', () => {
    expect(zerlegeName('Mustermann, Max')).toMatchObject({ vorname: 'Max', nachname: 'Mustermann' });
  });
  it('mehrere Titel', () => {
    expect(zerlegeName('Prof. Dr. Max Mustermann')).toMatchObject({ titel: 'Prof. Dr.', vorname: 'Max', nachname: 'Mustermann' });
  });
  it('Dipl.-Ing. und Anrede Herr', () => {
    expect(zerlegeName('Herr Dipl.-Ing. Jan van Beispiel')).toEqual({ anrede: 'Herr', titel: 'Dipl.-Ing.', vorname: 'Jan', nachname: 'van Beispiel' });
  });
});
