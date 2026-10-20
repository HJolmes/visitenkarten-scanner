// Texterkennung auf Android (und iOS-App, falls es die je gibt): Google ML Kit,
// Modell ist in der App gebündelt (com.google.mlkit:text-recognition), läuft offline.
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OcrErgebnis, OcrWort, zeilenAusWoertern } from '../kern/ocr';
import { Bild } from './bild';

export async function erkenneText(bild: Bild): Promise<OcrErgebnis> {
  const ergebnis = await TextRecognition.recognize(bild.uri);
  const zeilen = ergebnis.blocks.flatMap((b) =>
    b.lines.flatMap((l) =>
      zeilenAusWoertern(
        l.elements
          .filter((e) => e.frame)
          .map((e): OcrWort => ({ text: e.text, box: { x: e.frame!.left, y: e.frame!.top, b: e.frame!.width, h: e.frame!.height } })),
      ),
    ),
  );
  return { breite: bild.breite, hoehe: bild.hoehe, zeilen };
}
