// Texterkennung im Browser (iPhone-Weg): tesseract.js, Dateien aus public/tesseract,
// angelegt mit `npm run web:ocr`. Nichts wird zur Laufzeit aus dem Internet geladen.
import { createWorker, Worker } from 'tesseract.js';
import { basisUrl } from './basis.web';

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

export async function erkenneText(bildUri: string): Promise<string> {
  const w = await holeWorker();
  const { data } = await w.recognize(bildUri);
  return data.text;
}
