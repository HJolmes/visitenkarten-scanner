import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Kontakt, Telefonart, leererKontakt } from './src/kern/kontakt';
import { alsVCardOeffnen, alsVCardTeilen, inKontakteSpeichern } from './src/plattform/speichern';
import { bildAuswerten } from './src/verarbeiten';

const FARBE = '#0B5394';
const ART_TEXT: Record<Telefonart, string> = { arbeit: 'Tel.', mobil: 'Mobil', fax: 'Fax' };
const ART_FOLGE: Record<Telefonart, Telefonart> = { arbeit: 'mobil', mobil: 'fax', fax: 'arbeit' };

type Feld = 'anrede' | 'titel' | 'vorname' | 'nachname' | 'position' | 'firma' | 'abteilung' | 'strasse' | 'plz' | 'ort' | 'land' | 'web' | 'notiz';

const FELDER: Array<[Feld, string]> = [
  ['anrede', 'Anrede'],
  ['titel', 'Titel'],
  ['vorname', 'Vorname'],
  ['nachname', 'Nachname'],
  ['firma', 'Firma'],
  ['abteilung', 'Abteilung'],
  ['position', 'Position'],
  ['strasse', 'Straße'],
  ['plz', 'PLZ'],
  ['ort', 'Ort'],
  ['land', 'Land'],
  ['web', 'Webseite'],
];

export default function App() {
  const [bild, setBild] = useState<string>();
  const [kontakt, setKontakt] = useState<Kontakt>();
  const [laeuft, setLaeuft] = useState(false);
  const [rohtextZeigen, setRohtextZeigen] = useState(false);

  async function bildHolen(quelle: 'kamera' | 'galerie') {
    const optionen: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 1 };
    let ergebnis: ImagePicker.ImagePickerResult;
    if (quelle === 'kamera') {
      const recht = await ImagePicker.requestCameraPermissionsAsync();
      if (!recht.granted) {
        Alert.alert('Kamera', 'Ohne Kamerazugriff kann keine Karte fotografiert werden.');
        return;
      }
      ergebnis = await ImagePicker.launchCameraAsync(optionen);
    } else {
      ergebnis = await ImagePicker.launchImageLibraryAsync(optionen);
    }
    if (ergebnis.canceled) return;
    const uri = ergebnis.assets[0].uri;
    setBild(uri);
    setLaeuft(true);
    try {
      setKontakt(await bildAuswerten(uri));
    } catch (e) {
      Alert.alert('Erkennung fehlgeschlagen', String(e));
      setKontakt({ ...leererKontakt(), quelle: 'hand' });
    } finally {
      setLaeuft(false);
    }
  }

  function setze<K extends keyof Kontakt>(feld: K, wert: Kontakt[K]) {
    setKontakt((k) => (k ? { ...k, [feld]: wert } : k));
  }

  async function ausfuehren(aktion: (k: Kontakt) => Promise<void>) {
    if (!kontakt) return;
    try {
      await aktion(bereinigt(kontakt));
    } catch (e) {
      Alert.alert('Speichern fehlgeschlagen', String(e));
    }
  }

  function neu() {
    setBild(undefined);
    setKontakt(undefined);
    setRohtextZeigen(false);
  }

  return (
    <SafeAreaView style={s.seite}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.inhalt} keyboardShouldPersistTaps="handled">
        <Text style={s.titel}>Visitenkarte</Text>

        {!kontakt && !laeuft && (
          <View style={s.start}>
            <Knopf text="Karte fotografieren" onPress={() => bildHolen('kamera')} />
            <Knopf text="Bild auswählen" onPress={() => bildHolen('galerie')} zweit />
            <Knopf text="Von Hand erfassen" onPress={() => setKontakt(leererKontakt())} zweit />
            <Text style={s.hinweis}>Läuft komplett auf dem Gerät. Hat die Karte einen QR-Code, wird er zuerst gelesen.</Text>
          </View>
        )}

        {laeuft && (
          <View style={s.start}>
            <ActivityIndicator size="large" color={FARBE} />
            <Text style={s.hinweis}>Karte wird gelesen …</Text>
          </View>
        )}

        {kontakt && !laeuft && (
          <View>
            {bild && <Image source={{ uri: bild }} style={s.bild} resizeMode="contain" />}
            <Text style={s.quelle}>
              {kontakt.quelle === 'qr' ? 'Aus QR-Code gelesen' : kontakt.quelle === 'ocr' ? 'Aus Texterkennung, bitte prüfen' : 'Von Hand'}
            </Text>

            {FELDER.map(([feld, label]) => (
              <Eingabe key={feld} label={label} wert={kontakt[feld]} onChange={(v) => setze(feld, v)} />
            ))}

            <Text style={s.abschnitt}>Telefon</Text>
            {kontakt.telefone.map((t, i) => (
              <View key={i} style={s.zeile}>
                <Pressable
                  style={s.art}
                  onPress={() => setze('telefone', kontakt.telefone.map((x, j) => (j === i ? { ...x, art: ART_FOLGE[x.art] } : x)))}
                >
                  <Text style={s.artText}>{ART_TEXT[t.art]}</Text>
                </Pressable>
                <TextInput
                  style={[s.eingabe, s.flex]}
                  value={t.nummer}
                  keyboardType="phone-pad"
                  onChangeText={(v) => setze('telefone', kontakt.telefone.map((x, j) => (j === i ? { ...x, nummer: v } : x)))}
                />
              </View>
            ))}
            <Pressable onPress={() => setze('telefone', [...kontakt.telefone, { art: 'arbeit', nummer: '' }])}>
              <Text style={s.link}>+ Nummer</Text>
            </Pressable>

            <Text style={s.abschnitt}>E-Mail</Text>
            {kontakt.emails.map((m, i) => (
              <TextInput
                key={i}
                style={s.eingabe}
                value={m}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(v) => setze('emails', kontakt.emails.map((x, j) => (j === i ? v : x)))}
              />
            ))}
            <Pressable onPress={() => setze('emails', [...kontakt.emails, ''])}>
              <Text style={s.link}>+ E-Mail</Text>
            </Pressable>

            <Eingabe label="Notiz" wert={kontakt.notiz} onChange={(v) => setze('notiz', v)} mehrzeilig />

            <View style={s.aktionen}>
              <Knopf
                text={Platform.OS === 'android' ? 'In Kontakte / Outlook speichern' : 'Als Kontakt speichern'}
                onPress={() => ausfuehren(inKontakteSpeichern)}
              />
              {Platform.OS === 'android' && <Knopf text="Als vCard öffnen mit …" onPress={() => ausfuehren(alsVCardOeffnen)} zweit />}
              {Platform.OS === 'android' && <Knopf text="vCard teilen" onPress={() => ausfuehren(alsVCardTeilen)} zweit />}
              <Knopf text="Neue Karte" onPress={neu} zweit />
            </View>

            {!!kontakt.rohtext && (
              <Pressable onPress={() => setRohtextZeigen((x) => !x)}>
                <Text style={s.link}>{rohtextZeigen ? 'Erkannten Text ausblenden' : 'Erkannten Text zeigen'}</Text>
              </Pressable>
            )}
            {rohtextZeigen && <Text style={s.roh}>{kontakt.rohtext}</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Leere Nummern und Mails nicht mitspeichern
function bereinigt(k: Kontakt): Kontakt {
  return {
    ...k,
    telefone: k.telefone.filter((t) => t.nummer.trim()),
    emails: k.emails.map((m) => m.trim()).filter(Boolean),
  };
}

function Knopf({ text, onPress, zweit }: { text: string; onPress: () => void; zweit?: boolean }) {
  return (
    <Pressable style={[s.knopf, zweit && s.knopfZweit]} onPress={onPress}>
      <Text style={[s.knopfText, zweit && s.knopfTextZweit]}>{text}</Text>
    </Pressable>
  );
}

function Eingabe({ label, wert, onChange, mehrzeilig }: { label: string; wert: string; onChange: (v: string) => void; mehrzeilig?: boolean }) {
  return (
    <View style={s.feld}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.eingabe, mehrzeilig && s.mehrzeilig]} value={wert} onChangeText={onChange} multiline={mehrzeilig} />
    </View>
  );
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: '#fff' },
  inhalt: { padding: 16, paddingBottom: 48 },
  titel: { fontSize: 24, fontWeight: '700', color: FARBE, marginTop: 24, marginBottom: 16 },
  start: { gap: 12, marginTop: 24, alignItems: 'stretch' },
  hinweis: { color: '#555', textAlign: 'center', marginTop: 8 },
  bild: { width: '100%', height: 180, marginBottom: 8, backgroundColor: '#f2f2f2' },
  quelle: { color: '#555', marginBottom: 12 },
  feld: { marginBottom: 8 },
  label: { fontSize: 12, color: '#555', marginBottom: 2 },
  eingabe: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, marginBottom: 6 },
  mehrzeilig: { minHeight: 70, textAlignVertical: 'top' },
  abschnitt: { fontSize: 12, color: '#555', marginTop: 8, marginBottom: 2 },
  zeile: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  flex: { flex: 1 },
  art: { borderWidth: 1, borderColor: FARBE, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, minWidth: 64 },
  artText: { color: FARBE, textAlign: 'center' },
  link: { color: FARBE, paddingVertical: 8 },
  aktionen: { gap: 10, marginTop: 16, marginBottom: 8 },
  knopf: { backgroundColor: FARBE, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16 },
  knopfZweit: { backgroundColor: '#fff', borderWidth: 1, borderColor: FARBE },
  knopfText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  knopfTextZweit: { color: FARBE },
  roh: { fontFamily: Platform.select({ android: 'monospace', default: 'Courier' }), color: '#333', backgroundColor: '#f6f6f6', padding: 8 },
});
