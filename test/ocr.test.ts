// Erfundene Karte als Texterkennung mit Positionen
import { describe, expect, it } from 'vitest';
import { OcrErgebnis, OcrWort, zeilenAusWoertern } from '../src/kern/ocr';
import { ocrFehlerKorrigieren, parseVisitenkarte } from '../src/kern/parser';

// Wörter einer Bildzeile: [text, x, breite], alle auf Höhe y, 20 px hoch
function zeile(y: number, ...woerter: Array<[string, number, number]>): OcrWort[] {
  return woerter.map(([text, x, b]) => ({ text, box: { x, y, b, h: 20 } }));
}

const karte: OcrErgebnis = {
  breite: 1000,
  hoehe: 600,
  zeilen: [
    // zwei Spalten in einer Bildzeile: Firma links, Telefon rechts
    ...zeilenAusWoertern(zeile(300, ['Musterfirma', 40, 150], ['GmbH', 200, 70], ['Tel.:', 600, 50], ['0521', 660, 60], ['-', 725, 10], ['94600', 740, 80], ['-', 825, 10], ['0', 840, 15])),
    ...zeilenAusWoertern(zeile(100, ['Erik', 300, 80], ['Beispielmann', 390, 200])),
    ...zeilenAusWoertern(zeile(330, ['Hygienegroßhande!l', 40, 250], ['Mobil:', 600, 70], ['0177', 680, 60], ['-', 745, 10], ['4272227', 760, 110])),
    ...zeilenAusWoertern(zeile(360, ['Beispielweg', 40, 140], ['230', 185, 40])),
    ...zeilenAusWoertern(zeile(390, ['33649', 40, 70], ['Bielefeld', 115, 110], ['musterfirma@musterfirma-hygiene.de', 600, 380])),
  ],
};

describe('zeilenAusWoertern', () => {
  it('trennt Spalten an großen Lücken', () => {
    expect(karte.zeilen.map((z) => z.text)).toEqual([
      'Musterfirma GmbH',
      'Tel.: 0521 - 94600 - 0',
      'Erik Beispielmann',
      'Hygienegroßhande!l',
      'Mobil: 0177 - 4272227',
      'Beispielweg 230',
      '33649 Bielefeld',
      'musterfirma@musterfirma-hygiene.de',
    ]);
    expect(karte.zeilen[1].box).toEqual({ x: 600, y: 300, b: 255, h: 20 });
  });
});

describe('parseVisitenkarte mit Positionen', () => {
  const k = parseVisitenkarte(karte);
  it('Felder wie bei reinem Text', () => {
    expect(k).toMatchObject({ vorname: 'Erik', nachname: 'Beispielmann', firma: 'Musterfirma GmbH', strasse: 'Beispielweg 230', plz: '33649', ort: 'Bielefeld' });
    expect(k.telefone.map((t) => t.art)).toEqual(['arbeit', 'mobil']);
  });
  it('merkt sich je Feld den Bildbereich', () => {
    expect(k.bereiche).toMatchObject({
      name: { x: 300, y: 100, b: 290, h: 20 },
      firma: { x: 40, y: 300, b: 230, h: 20 },
      telefon0: { x: 660, y: 300, b: 195, h: 20 },
      telefon1: { x: 680, y: 330, b: 190, h: 20 },
      strasse: { x: 40, y: 360, b: 185, h: 20 },
      ort: { x: 40, y: 390, b: 185, h: 20 },
      email0: { x: 600, y: 390, b: 380, h: 20 },
    });
  });
  it('korrigiert "!l" im Firmenzweck', () => {
    expect(k.notiz).toBe('Hygienegroßhandel');
  });
});

describe('ocrFehlerKorrigieren', () => {
  it('Ausrufezeichen zwischen Buchstaben, Anführungszeichen als Logo-Rest', () => {
    expect(ocrFehlerKorrigieren('Betriebshygienegroßhande!l')).toBe('Betriebshygienegroßhandel');
    expect(ocrFehlerKorrigieren('J ” HEMPEL')).toBe('J HEMPEL');
    expect(ocrFehlerKorrigieren('Achtung! Neu')).toBe('Achtung! Neu');
    expect(ocrFehlerKorrigieren('Wwww.beispiel.de')).toBe('www.beispiel.de');
  });
  it('Webseite trotz "Wwww.", Logo-Splitter nicht in der Notiz', () => {
    const k = parseVisitenkarte(['HG', 'TENE', 'Erik Beispielmann', 'Beispiel GmbH', 'Wwww.beispiel-hygiene.de', 'Großhandel'].join('\n'));
    expect(k.web).toBe('www.beispiel-hygiene.de');
    expect(k.notiz).toBe('Großhandel');
  });
});
