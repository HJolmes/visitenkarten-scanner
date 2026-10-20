// Auf dem Kartenbild die Zeile(n) antippen, die in ein Feld gehören. Die erkannten Zeilen sind
// als Rahmen eingezeichnet; mehrere antippen verbindet sie (z. B. Name über zwei Zeilen).
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { OcrErgebnis, OcrZeile, Rechteck, vereinige } from '../kern/ocr';
import { Bild } from '../plattform/bild';
import { FARBE, Knopf } from './teile';

export function AufKarteWaehlen({
  bild,
  ocr,
  feldName,
  onUebernehmen,
  onAbbrechen,
}: {
  bild: Bild;
  ocr: OcrErgebnis;
  feldName: string;
  onUebernehmen: (text: string, box: Rechteck) => void;
  onAbbrechen: () => void;
}) {
  const [breite, setBreite] = useState(0);
  const [gewaehlt, setGewaehlt] = useState<number[]>([]);
  const faktor = breite / bild.breite;

  function umschalten(i: number) {
    setGewaehlt((g) => (g.includes(i) ? g.filter((x) => x !== i) : [...g, i]));
  }

  function uebernehmen() {
    const zeilen: OcrZeile[] = gewaehlt.map((i) => ocr.zeilen[i]).sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
    onUebernehmen(zeilen.map((z) => z.text).join(' '), vereinige(zeilen.map((z) => z.box)));
  }

  const text = gewaehlt
    .map((i) => ocr.zeilen[i])
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    .map((z) => z.text)
    .join(' ');

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: FARBE, marginBottom: 4 }}>{feldName}</Text>
      <Text style={{ color: '#555', marginBottom: 10 }}>Auf der Karte antippen, was in dieses Feld gehört. Mehrere Zeilen werden verbunden.</Text>
      <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
        {breite > 0 && (
          <View style={{ width: breite, height: bild.hoehe * faktor }}>
            <Image source={{ uri: bild.uri }} style={{ width: breite, height: bild.hoehe * faktor }} />
            {ocr.zeilen.map((z, i) => {
              const an = gewaehlt.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => umschalten(i)}
                  style={{
                    position: 'absolute',
                    left: z.box.x * faktor - 2,
                    top: z.box.y * faktor - 2,
                    width: z.box.b * faktor + 4,
                    height: Math.max(z.box.h * faktor + 4, 18),
                    borderWidth: 2,
                    borderRadius: 3,
                    borderColor: an ? '#E8590C' : 'rgba(11,83,148,0.6)',
                    backgroundColor: an ? 'rgba(232,89,12,0.18)' : 'rgba(11,83,148,0.06)',
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
      <Text style={{ marginTop: 10, minHeight: 22, fontSize: 16 }}>{text || '–'}</Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        <Knopf text="Übernehmen" onPress={uebernehmen} aus={!gewaehlt.length} />
        <Knopf text="Abbrechen" onPress={onAbbrechen} zweit />
      </View>
    </View>
  );
}
