// Kartenfoto "in die Galerie": Der Browser darf nicht direkt in die Galerie schreiben, lädt
// das Bild aber in den Ordner Download. Die Galerie-App zeigt diesen Ordner mit an.
import { Bild } from './bild';
import { herunterladen } from './herunterladen.web';

export const GALERIE_MOEGLICH = true;

export async function inGalerieAblegen(bild: Bild, name: string): Promise<void> {
  const blob = await (await fetch(bild.uri)).blob();
  herunterladen(blob, `Visitenkarte_${name}.jpg`);
}
