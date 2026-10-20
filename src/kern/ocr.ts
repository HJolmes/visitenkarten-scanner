// Ergebnis der Texterkennung mit Positionen, unabhängig von der Plattform (tesseract.js im
// Browser, ML Kit auf Android). Koordinaten in Pixeln des ausgewerteten Bildes.

export interface Rechteck {
  x: number;
  y: number;
  b: number;
  h: number;
}

export interface OcrWort {
  text: string;
  box: Rechteck;
}

export interface OcrZeile {
  text: string;
  box: Rechteck;
  woerter: OcrWort[];
}

export interface OcrErgebnis {
  breite: number;
  hoehe: number;
  zeilen: OcrZeile[];
}

export function vereinige(boxen: Rechteck[]): Rechteck {
  const x0 = Math.min(...boxen.map((r) => r.x));
  const y0 = Math.min(...boxen.map((r) => r.y));
  const x1 = Math.max(...boxen.map((r) => r.x + r.b));
  const y1 = Math.max(...boxen.map((r) => r.y + r.h));
  return { x: x0, y: y0, b: x1 - x0, h: y1 - y0 };
}

/**
 * Baut Zeilen aus den Wörtern einer erkannten Textzeile. Liegt zwischen zwei Wörtern eine
 * große Lücke, sind es zwei Spalten der Karte ("Firma GmbH        Tel. 0521 …") und werden zwei
 * Zeilen. Das hilft der Feldzuordnung und der Auswahl auf dem Bild.
 */
export function zeilenAusWoertern(woerter: OcrWort[]): OcrZeile[] {
  const sortiert = woerter.filter((w) => w.text.trim()).sort((a, b) => a.box.x - b.box.x);
  if (!sortiert.length) return [];
  const hoehen = sortiert.map((w) => w.box.h).sort((a, b) => a - b);
  const typischeHoehe = hoehen[Math.floor(hoehen.length / 2)];
  const gruppen: OcrWort[][] = [[sortiert[0]]];
  for (let i = 1; i < sortiert.length; i++) {
    const vorher = sortiert[i - 1];
    const luecke = sortiert[i].box.x - (vorher.box.x + vorher.box.b);
    if (luecke > typischeHoehe * 1.5) gruppen.push([sortiert[i]]);
    else gruppen[gruppen.length - 1].push(sortiert[i]);
  }
  return gruppen.map((g) => ({
    text: g.map((w) => w.text).join(' '),
    box: vereinige(g.map((w) => w.box)),
    woerter: g,
  }));
}

export function rohtextAus(e: OcrErgebnis): string {
  return e.zeilen.map((z) => z.text).join('\n');
}
