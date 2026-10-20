// Legt die Dateien für Texterkennung (public/tesseract) und QR-Erkennung (public/zxing)
// der Web-App ab, damit sie vom eigenen Server kommen und nicht aus dem Internet.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
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

const zxingZiel = join(process.cwd(), 'public', 'zxing');
mkdirSync(zxingZiel, { recursive: true });
// Beide Pakete geben ihre package.json nicht frei, deshalb vom Einstieg aus nach oben suchen.
// zxing-wasm in der Version, die barcode-detector selbst benutzt.
function paketWurzel(name, req) {
  let dir = dirname(req.resolve(name));
  while (!existsSync(join(dir, 'package.json')) || JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name !== name) {
    dir = dirname(dir);
  }
  return dir;
}
const barcode = paketWurzel('barcode-detector', require);
const zxing = paketWurzel('zxing-wasm', createRequire(join(barcode, 'package.json')));
copyFileSync(join(zxing, 'dist', 'reader', 'zxing_reader.wasm'), join(zxingZiel, 'zxing_reader.wasm'));

console.log('Web-Dateien liegen in', ziel, 'und', zxingZiel);
