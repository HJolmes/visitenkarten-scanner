// Kleine Bausteine der Oberfläche
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Rechteck } from '../kern/ocr';
import { Bild } from '../plattform/bild';

export const FARBE = '#0B5394';

export function Knopf({ text, onPress, zweit, aus }: { text: string; onPress: () => void; zweit?: boolean; aus?: boolean }) {
  return (
    <Pressable style={[s.knopf, zweit && s.knopfZweit, aus && s.aus]} onPress={aus ? undefined : onPress}>
      <Text style={[s.knopfText, zweit && s.knopfTextZweit]}>{text}</Text>
    </Pressable>
  );
}

export function Haken({ text, an, onPress }: { text: string; an: boolean; onPress: () => void }) {
  return (
    <Pressable style={s.hakenZeile} onPress={onPress}>
      <View style={[s.haken, an && s.hakenAn]}>{an && <Text style={s.hakenText}>✓</Text>}</View>
      <Text style={s.hakenLabel}>{text}</Text>
    </Pressable>
  );
}

/** Ausschnitt des Kartenbilds, in dem ein Feld erkannt wurde. Antippen: auf der Karte neu wählen */
export function Ausschnitt({ bild, box, onPress }: { bild: Bild; box?: Rechteck; onPress?: () => void }) {
  if (!box) {
    return (
      <Pressable style={[s.ausschnittRahmen, s.ausschnittLeer]} onPress={onPress}>
        <Text style={s.ausschnittLeerText}>auf Karte wählen</Text>
      </Pressable>
    );
  }
  const rand = Math.max(4, box.h * 0.25);
  const x = Math.max(0, box.x - rand);
  const y = Math.max(0, box.y - rand);
  const b = Math.min(bild.breite - x, box.b + 2 * rand);
  const h = Math.min(bild.hoehe - y, box.h + 2 * rand);
  const faktor = Math.min(AUSSCHNITT_B / b, AUSSCHNITT_H / h);
  return (
    <Pressable style={s.ausschnittRahmen} onPress={onPress}>
      <View style={{ width: b * faktor, height: h * faktor, overflow: 'hidden' }}>
        <Image
          source={{ uri: bild.uri }}
          style={{ position: 'absolute', width: bild.breite * faktor, height: bild.hoehe * faktor, left: -x * faktor, top: -y * faktor }}
        />
      </View>
    </Pressable>
  );
}

const AUSSCHNITT_B = 120;
const AUSSCHNITT_H = 40;

/** Eingabefeld mit Bildausschnitt rechts daneben */
export function Feld({
  label,
  wert,
  onChange,
  bild,
  box,
  onWaehlen,
  mehrzeilig,
  tastatur,
  links,
}: {
  label?: string;
  wert: string;
  onChange: (v: string) => void;
  bild?: Bild;
  box?: Rechteck;
  onWaehlen?: () => void;
  mehrzeilig?: boolean;
  tastatur?: 'phone-pad' | 'email-address';
  links?: React.ReactNode;
}) {
  return (
    <View style={s.feld}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={s.feldZeile}>
        {links}
        <TextInput
          style={[s.eingabe, mehrzeilig && s.mehrzeilig]}
          value={wert}
          onChangeText={onChange}
          multiline={mehrzeilig}
          keyboardType={tastatur}
          autoCapitalize={tastatur === 'email-address' ? 'none' : undefined}
        />
        {bild && onWaehlen && <Ausschnitt bild={bild} box={box} onPress={onWaehlen} />}
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  knopf: { backgroundColor: FARBE, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16 },
  knopfZweit: { backgroundColor: '#fff', borderWidth: 1, borderColor: FARBE },
  knopfText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  knopfTextZweit: { color: FARBE },
  aus: { opacity: 0.4 },
  hakenZeile: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 },
  haken: { width: 24, height: 24, borderWidth: 2, borderColor: FARBE, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  hakenAn: { backgroundColor: FARBE },
  hakenText: { color: '#fff', fontWeight: '700' },
  hakenLabel: { flex: 1, fontSize: 16, color: '#222' },
  feld: { marginBottom: 8 },
  label: { fontSize: 12, color: '#555', marginBottom: 2 },
  feldZeile: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eingabe: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
  mehrzeilig: { minHeight: 70, textAlignVertical: 'top' },
  ausschnittRahmen: { width: AUSSCHNITT_B + 6, height: AUSSCHNITT_H + 6, borderWidth: 1, borderColor: '#d0d7e2', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', overflow: 'hidden' },
  ausschnittLeer: { borderStyle: 'dashed', borderColor: FARBE },
  ausschnittLeerText: { color: FARBE, fontSize: 12 },
});
