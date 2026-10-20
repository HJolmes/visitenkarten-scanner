// Texterkennung im Browser: tesseract.js, Dateien aus public/tesseract (npm run web:dateien).
// Liefert Wörter mit Lage, daraus entstehen Zeilen (Spalten getrennt).
import { createWorker, Worker } from 'tesseract.js';
import { OcrErgebnis, OcrWort, zeilenAusWoertern } from '../kern/ocr';
import { basisUrl } from './basis.web';
import { Bild } from './bild';

let worker: Promise<Worker> | undefined;

function holeWorker(): Promise<Worker> {
  worker ??= createWorker('deu', 1, {
    workerPath: basisUrl('tesseract/worker.min.js'),
    corePath: basisUrl('tesseract/'),
    langPath: basisUrl('tesseract/lang'),
    gzip: true,
  });
  return worker;
}

export async function erkenneText(bild: Bild): Promise<OcrErgebnis> {
  const w = await holeWorker();
  const { data } = await w.recognize(bild.uri, {}, { blocks: true });
  const zeilen = (data.blocks ?? []).flatMap((b) =>
    b.paragraphs.flatMap((p) =>
      p.lines.flatMap((l) =>
        zeilenAusWoertern(
          l.words.map((wort): OcrWort => ({
            text: wort.text,
            box: { x: wort.bbox.x0, y: wort.bbox.y0, b: wort.bbox.x1 - wort.bbox.x0, h: wort.bbox.y1 - wort.bbox.y0 },
          })),
        ),
      ),
    ),
  );
  return { breite: bild.breite, hoehe: bild.hoehe, zeilen };
}
