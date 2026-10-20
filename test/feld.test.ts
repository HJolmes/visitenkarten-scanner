import { describe, expect, it } from 'vitest';
import { feldName, feldUebernehmen } from '../src/kern/feld';
import { Kontakt, leererKontakt } from '../src/kern/kontakt';

const box = { x: 1, y: 2, b: 3, h: 4 };
const leer = (): Kontakt => ({ ...leererKontakt(), telefone: [{ art: 'mobil', nummer: '+49 171 1' }] });

describe('feldUebernehmen', () => {
  it('Name wird zerlegt, Bereich gemerkt', () => {
    const k = feldUebernehmen(leer(), 'name', 'Dr. Erik  Beispielmann', box);
    expect(k).toMatchObject({ titel: 'Dr.', vorname: 'Erik', nachname: 'Beispielmann' });
    expect(k.bereiche?.name).toEqual(box);
  });
  it('PLZ und Ort', () => {
    expect(feldUebernehmen(leer(), 'ort', '33649 Bielefeld')).toMatchObject({ plz: '33649', ort: 'Bielefeld' });
  });
  it('Telefon: vorhandene Art bleibt, neue Nummer wird angehängt', () => {
    const k1 = feldUebernehmen(leer(), 'telefon0', 'Tel. 0521 94600-0');
    expect(k1.telefone[0]).toEqual({ art: 'mobil', nummer: '+49 521 946000' });
    const k2 = feldUebernehmen(leer(), 'telefon1', 'Fax 0521 946099');
    expect(k2.telefone[1]).toEqual({ art: 'fax', nummer: '+49 521 946099' });
  });
  it('E-Mail ohne Leerzeichen, klein', () => {
    expect(feldUebernehmen(leer(), 'email0', 'Info @Beispiel.de').emails).toEqual(['info@beispiel.de']);
  });
  it('Notiz wird ergänzt', () => {
    expect(feldUebernehmen({ ...leer(), notiz: 'a' }, 'notiz', 'b').notiz).toBe('a\nb');
  });
  it('Feldnamen', () => {
    expect(feldName('telefon1')).toBe('Telefon 2');
    expect(feldName('ort')).toBe('PLZ und Ort');
  });
});
