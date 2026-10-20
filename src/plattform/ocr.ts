// Texterkennung auf Android (und iOS-App, falls es die je gibt): Google ML Kit,
// Modell ist in der App gebündelt (com.google.mlkit:text-recognition), läuft offline.
import TextRecognition from '@react-native-ml-kit/text-recognition';

export async function erkenneText(bildUri: string): Promise<string> {
  const ergebnis = await TextRecognition.recognize(bildUri);
  // Blöcke behalten ihre räumliche Gruppierung (Adresse bleibt zusammen), Zeilen einzeln
  return ergebnis.blocks.map((b) => b.lines.map((l) => l.text).join('\n')).join('\n');
}
