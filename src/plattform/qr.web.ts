// QR-Code im Foto suchen, Web-App. Chrome auf Android bringt einen eigenen BarcodeDetector
// mit; wo er fehlt (Safari, iPhone), hilft der Nachbau aus barcode-detector. Dessen
// WASM-Datei kommt vom eigenen Server (public/zxing), nicht vom CDN.
import { BarcodeDetector as Nachbau, setZXingModuleOverrides } from 'barcode-detector';

setZXingModuleOverrides({
  locateFile: (pfad: string, prefix: string) => (pfad.endsWith('.wasm') ? '/zxing/zxing_reader.wasm' : prefix + pfad),
});

type Detector = { detect(bild: ImageBitmapSource): Promise<Array<{ rawValue: string }>> };
let detector: Detector | undefined;

async function holeDetector(): Promise<Detector> {
  if (detector) return detector;
  const Eingebaut = (globalThis as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
  if (Eingebaut && (await Eingebaut.getSupportedFormats()).includes('qr_code')) {
    detector = new Eingebaut({ formats: ['qr_code'] });
  } else {
    detector = new Nachbau({ formats: ['qr_code'] });
  }
  return detector;
}

export async function leseQrCodes(bildUri: string): Promise<string[]> {
  const bild = await createImageBitmap(await (await fetch(bildUri)).blob());
  try {
    const codes = await (await holeDetector()).detect(bild);
    return codes.map((c) => c.rawValue);
  } finally {
    bild.close();
  }
}
