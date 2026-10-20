// Ein ausgewähltes oder fotografiertes Kartenbild, wie es Erkennung und Anzeige nutzen.
export interface Bild {
  uri: string;
  breite: number;
  hoehe: number;
}

/** Android-App: Bild bleibt, wie die Kamera es liefert */
export async function bildVorbereiten(asset: { uri: string; width: number; height: number }): Promise<Bild> {
  return { uri: asset.uri, breite: asset.width, hoehe: asset.height };
}
