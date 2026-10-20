// Legt die Dateien für die Texterkennung im Browser (iPhone-Weg) nach public/tesseract,
// damit nichts zur Laufzeit aus dem Internet geladen wird.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ziel = join(process.cwd(), 'public', 'tesseract');
mkdirSync(join(ziel, 'lang'), { recursive: true });

const tesseract = dirname(require.resolve('tesseract.js/package.json'));
copyFileSync(join(tesseract, 'dist', 'worker.min.js'), join(ziel, 'worker.min.js'));

const core = dirname(require.resolve('tesseract.js-core/package.json'));
for (const datei of readdirSync(core)) {
  if (datei.endsWith('.wasm.js')) copyFileSync(join(core, datei), join(ziel, datei));
}

const deu = dirname(require.resolve('@tesseract.js-data/deu/package.json'));
copyFileSync(join(deu, '4.0.0_best_int', 'deu.traineddata.gz'), join(ziel, 'lang', 'deu.traineddata.gz'));

console.log('Web-OCR-Dateien liegen in', ziel);
