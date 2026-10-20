import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, SafeAreaView, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { FeldSchluessel, feldName, feldUebernehmen } from './src/kern/feld';
import { Kontakt, Telefonart, leererKontakt } from './src/kern/kontakt';
import { OcrErgebnis, Rechteck } from './src/kern/ocr';
import { dateinameFuer } from './src/kern/vcard';
import { Bild, bildVorbereiten } from './src/plattform/bild';
import { GALERIE_MOEGLICH, inGalerieAblegen } from './src/plattform/galerie';
import { profilbildAus } from './src/plattform/profilbild';
import { speichereKontakte } from './src/plattform/speichern';
import { AufKarteWaehlen } from './src/ui/AufKarteWaehlen';
import { FARBE, Feld, Haken, Knopf } from './src/ui/teile';
import { bildAuswerten } from './src/verarbeiten';

const ART_TEXT: Record<Telefonart, string> = { arbeit: 'Tel.', mobil: 'Mobil', fax: 'Fax' };
const ART_FOLGE: Record<Telefonart, Telefonart> = { arbeit: 'mobil', mobil: 'fax', fax: 'arbeit' };

type Ansicht = 'start' | 'stapel' | 'pruefen' | 'waehlen' | 'ende';

interface Karte {
  id: number;
  bild?: Bild;
  status: 'wartet' | 'laeuft' | 'fertig' | 'fehler';
  kontakt?: Kontakt;
  ocr?: OcrErgebnis;
  foto?: string;
  /** geprüft und für das gesammelte Speichern vorgemerkt, schon gespeichert oder übersprungen */
  erledigt?: 'vorgemerkt' | 'gespeichert' | 'uebersprungen';
}

// Einfache Felder der Maske und ihr Bildbereich
const FELDER: Array<[keyof Kontakt & string, string, FeldSchluessel]> = [
  ['anrede', 'Anrede', 'name'],
  ['titel', 'Titel', 'name'],
  ['vorname', 'Vorname', 'name'],
  ['nachname', 'Nachname', 'name'],
  ['firma', 'Firma', 'firma'],
  ['abteilung', 'Abteilung', 'abteilung'],
  ['position', 'Position', 'position'],
  ['strasse', 'Straße', 'strasse'],
  ['plz', 'PLZ', 'ort'],
  ['ort', 'Ort', 'ort'],
  ['land', 'Land', 'ort'],
  ['web', 'Webseite', 'web'],
];
// Diese Felder zeigen keinen eigenen Ausschnitt (er stünde doppelt neben dem Nachbarfeld)
const OHNE_AUSSCHNITT = new Set(['anrede', 'titel', 'vorname', 'plz', 'land']);

let naechsteId = 1;

export default function App() {
  const [karten, setKarten] = useState<Karte[]>([]);
  const [aktuell, setAktuell] = useState(0);
  const [ansicht, setAnsicht] = useState<Ansicht>('start');
  const [waehlenFeld, setWaehlenFeld] = useState<FeldSchluessel>();
  const [rohtextZeigen, setRohtextZeigen] = useState(false);
  const [fotoMitnehmen, setFotoMitnehmen] = useState(false);
  const [inGalerie, setInGalerie] = useState(true);
  const scroll = useRef<ScrollViewInstance>(null);

  // Karten nacheinander auswerten, während schon geprüft wird
  useEffect(() => {
    if (karten.some((k) => k.status === 'laeuft')) return;
    const naechste = karten.find((k) => k.status === 'wartet');
    if (!naechste?.bild) return;
    const bild = naechste.bild;
    aendereKarte(naechste.id, { status: 'laeuft' });
    (async () => {
      try {
        const { kontakt, ocr } = await bildAuswerten(bild);
        const foto = await profilbildAus(bild).catch(() => undefined);
        aendereKarte(naechste.id, { status: 'fertig', kontakt, ocr, foto });
      } catch {
        aendereKarte(naechste.id, { status: 'fehler', kontakt: leererKontakt() });
      }
    })();
  }, [karten]);

  function aendereKarte(id: number, aenderung: Partial<Karte>) {
    setKarten((alle) => alle.map((k) => (k.id === id ? { ...k, ...aenderung } : k)));
  }

  async function bilderHolen(quelle: 'kamera' | 'galerie') {
    let ergebnis: ImagePicker.ImagePickerResult;
    if (quelle === 'kamera') {
      const recht = await ImagePicker.requestCameraPermissionsAsync();
      if (!recht.granted) {
        Alert.alert('Kamera', 'Ohne Kamerazugriff kann keine Karte fotografiert werden.');
        return;
      }
      ergebnis = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    } else {
      ergebnis = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true });
    }
    if (ergebnis.canceled) return;
    const neue: Karte[] = [];
    for (const asset of ergebnis.assets) {
      try {
        neue.push({ id: naechsteId++, bild: await bildVorbereiten(asset), status: 'wartet' });
      } catch (e) {
        Alert.alert('Bild nicht lesbar', String(e));
      }
    }
    setKarten((alle) => [...alle, ...neue]);
    setAnsicht('stapel');
  }

  function vonHand() {
    const karte: Karte = { id: naechsteId++, status: 'fertig', kontakt: { ...leererKontakt(), quelle: 'hand' } };
    setKarten((alle) => [...alle, karte]);
    setAktuell(karten.length);
    setAnsicht('pruefen');
  }

  function pruefenAb(index: number) {
    const offen = karten.findIndex((k, i) => i >= index && !k.erledigt);
    if (offen < 0) {
      setAnsicht('ende');
      return;
    }
    setAktuell(offen);
    setRohtextZeigen(false);
    setAnsicht('pruefen');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function neu() {
    setKarten([]);
    setAktuell(0);
    setAnsicht('start');
  }

  const karte = karten[aktuell];

  function setze<K extends keyof Kontakt>(feld: K, wert: Kontakt[K]) {
    if (!karte?.kontakt) return;
    aendereKarte(karte.id, { kontakt: { ...karte.kontakt, [feld]: wert } });
  }

  function fertigerKontakt(k: Karte): Kontakt {
    const c = k.kontakt!;
    return {
      ...c,
      telefone: c.telefone.filter((t) => t.nummer.trim()),
      emails: c.emails.map((m) => m.trim()).filter(Boolean),
      foto: fotoMitnehmen ? k.foto : undefined,
    };
  }

  async function speichern(liste: Karte[], erledigt: Karte['erledigt']) {
    try {
      await speichereKontakte(liste.map(fertigerKontakt));
      if (inGalerie && GALERIE_MOEGLICH) {
        for (const k of liste) if (k.bild) await inGalerieAblegen(k.bild, dateinameFuer(k.kontakt!).replace(/\.vcf$/, ''));
      }
      setKarten((alle) => alle.map((k) => (liste.some((x) => x.id === k.id) ? { ...k, erledigt } : k)));
    } catch (e) {
      Alert.alert('Speichern fehlgeschlagen', String(e));
    }
  }

  const vorgemerkt = karten.filter((k) => k.erledigt === 'vorgemerkt');
  const gespeichert = karten.filter((k) => k.erledigt === 'gespeichert');
  const mehrere = karten.length > 1;

  return (
    <SafeAreaView style={st.seite}>
      <StatusBar style="dark" />
      <ScrollView ref={scroll} contentContainerStyle={st.inhalt} keyboardShouldPersistTaps="handled">
        <Text style={st.titel}>Visitenkarte</Text>

        {ansicht === 'start' && (
          <View style={st.spalte}>
            <Knopf text="Karte fotografieren" onPress={() => bilderHolen('kamera')} />
            <Knopf text="Bilder auswählen (auch mehrere)" onPress={() => bilderHolen('galerie')} zweit />
            <Knopf text="Von Hand erfassen" onPress={vonHand} zweit />
            <Text style={st.hinweis}>Die Erkennung läuft auf dem Gerät. Hat die Karte einen QR-Code, wird er zuerst gelesen.</Text>
          </View>
        )}

        {ansicht === 'stapel' && (
          <View style={st.spalte}>
            <Text style={st.unter}>{karten.length === 1 ? '1 Karte' : `${karten.length} Karten`}</Text>
            {karten.map((k, i) => (
              <View key={k.id} style={st.stapelZeile}>
                {k.bild && <Image source={{ uri: k.bild.uri }} style={st.vorschau} resizeMode="cover" />}
                <Text style={st.stapelText}>
                  {i + 1}. {k.status === 'fertig' ? kurzname(k.kontakt) : k.status === 'fehler' ? 'nicht lesbar' : 'wird gelesen …'}
                </Text>
              </View>
            ))}
            <Knopf text={karten.length === 1 ? 'Karte prüfen' : `${karten.length} Karten nacheinander prüfen`} onPress={() => pruefenAb(0)} />
            <Knopf text="Weitere Karte fotografieren" onPress={() => bilderHolen('kamera')} zweit />
            <Knopf text="Weitere Bilder auswählen" onPress={() => bilderHolen('galerie')} zweit />
          </View>
        )}

        {ansicht === 'pruefen' && karte && karte.status !== 'fertig' && karte.status !== 'fehler' && (
          <View style={st.spalte}>
            {mehrere && <Text style={st.unter}>Karte {aktuell + 1} von {karten.length}</Text>}
            <ActivityIndicator size="large" color={FARBE} />
            <Text style={st.hinweis}>Karte wird gelesen …</Text>
          </View>
        )}

        {ansicht === 'pruefen' && karte?.kontakt && (karte.status === 'fertig' || karte.status === 'fehler') && (
          <Pruefmaske
            karte={karte}
            nummer={aktuell + 1}
            anzahl={karten.length}
            setze={setze}
            onWaehlen={(f) => {
              setWaehlenFeld(f);
              setAnsicht('waehlen');
            }}
            rohtextZeigen={rohtextZeigen}
            setRohtextZeigen={setRohtextZeigen}
          >
            {karte.foto && <Haken text="Kartenbild als Profilbild speichern" an={fotoMitnehmen} onPress={() => setFotoMitnehmen((x) => !x)} />}
            {karte.bild && GALERIE_MOEGLICH && (
              <Haken text="Kartenfoto auch in der Galerie ablegen (Ordner Download)" an={inGalerie} onPress={() => setInGalerie((x) => !x)} />
            )}
            <View style={st.spalte}>
              {mehrere ? (
                <>
                  <Knopf
                    text={aktuell + 1 < karten.length ? 'Geprüft, nächste Karte' : 'Geprüft, fertig'}
                    onPress={() => {
                      aendereKarte(karte.id, { erledigt: 'vorgemerkt' });
                      pruefenAbNach(aktuell);
                    }}
                  />
                  <Knopf
                    text="Diese Karte gleich speichern"
                    zweit
                    onPress={async () => {
                      await speichern([karte], 'gespeichert');
                      pruefenAbNach(aktuell);
                    }}
                  />
                  <Knopf
                    text="Überspringen"
                    zweit
                    onPress={() => {
                      aendereKarte(karte.id, { erledigt: 'uebersprungen' });
                      pruefenAbNach(aktuell);
                    }}
                  />
                  {aktuell > 0 && (
                    <Pressable onPress={() => setAktuell(aktuell - 1)}>
                      <Text style={st.link}>← vorige Karte</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <>
                  <Knopf
                    text="Als Kontakt speichern (vCard)"
                    onPress={async () => {
                      await speichern([karte], 'gespeichert');
                      setAnsicht('ende');
                    }}
                  />
                  <Knopf text="Neue Karte" onPress={neu} zweit />
                </>
              )}
            </View>
          </Pruefmaske>
        )}

        {ansicht === 'waehlen' && karte?.bild && karte.ocr && karte.kontakt && waehlenFeld && (
          <AufKarteWaehlen
            bild={karte.bild}
            ocr={karte.ocr}
            feldName={feldName(waehlenFeld)}
            onUebernehmen={(text: string, box: Rechteck) => {
              aendereKarte(karte.id, { kontakt: feldUebernehmen(karte.kontakt!, waehlenFeld, text, box) });
              setAnsicht('pruefen');
            }}
            onAbbrechen={() => setAnsicht('pruefen')}
          />
        )}

        {ansicht === 'ende' && (
          <View style={st.spalte}>
            {gespeichert.length > 0 && <Text style={st.unter}>Gespeichert: {gespeichert.map((k) => kurzname(k.kontakt)).join(', ')}</Text>}
            {vorgemerkt.length > 0 && (
              <>
                <Text style={st.unter}>
                  Geprüft, noch nicht gespeichert: {vorgemerkt.length === 1 ? '1 Kontakt' : `${vorgemerkt.length} Kontakte`}
                </Text>
                <Knopf
                  text={vorgemerkt.length === 1 ? 'Kontakt speichern (vCard)' : `Alle ${vorgemerkt.length} Kontakte in einer Datei speichern`}
                  onPress={() => speichern(vorgemerkt, 'gespeichert')}
                />
                <Text style={st.hinweis}>Eine Datei, die Kontakte-App importiert alle auf einmal.</Text>
              </>
            )}
            <Knopf text="Neue Karten" onPress={neu} zweit={vorgemerkt.length > 0} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  function pruefenAbNach(index: number) {
    // Zustand der gerade erledigten Karte ist noch nicht übernommen, daher ab der nächsten suchen
    const offen = karten.findIndex((k, i) => i > index && !k.erledigt);
    if (offen < 0) {
      setAnsicht('ende');
      return;
    }
    setAktuell(offen);
    setRohtextZeigen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
}

function kurzname(k?: Kontakt): string {
  if (!k) return '';
  return [k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || 'ohne Namen';
}

function Pruefmaske({
  karte,
  nummer,
  anzahl,
  setze,
  onWaehlen,
  rohtextZeigen,
  setRohtextZeigen,
  children,
}: {
  karte: Karte;
  nummer: number;
  anzahl: number;
  setze: <K extends keyof Kontakt>(feld: K, wert: Kontakt[K]) => void;
  onWaehlen: (feld: FeldSchluessel) => void;
  rohtextZeigen: boolean;
  setRohtextZeigen: (f: (x: boolean) => boolean) => void;
  children: React.ReactNode;
}) {
  const k = karte.kontakt!;
  const bild = karte.ocr ? karte.bild : undefined;
  const waehlen = karte.ocr ? onWaehlen : undefined;
  return (
    <View>
      {anzahl > 1 && <Text style={st.unter}>Karte {nummer} von {anzahl}</Text>}
      {karte.bild && <Image source={{ uri: karte.bild.uri }} style={st.bild} resizeMode="contain" />}
      <Text style={st.quelle}>
        {karte.status === 'fehler'
          ? 'Karte nicht lesbar, bitte von Hand ausfüllen'
          : k.quelle === 'qr'
            ? 'Aus QR-Code gelesen'
            : k.quelle === 'ocr'
              ? 'Aus Texterkennung. Rechts steht, wo das Feld auf der Karte erkannt wurde; antippen, um es auf der Karte neu zu wählen.'
              : 'Von Hand'}
      </Text>

      {FELDER.map(([feld, label, bereich]) => (
        <Feld
          key={feld}
          label={label}
          wert={String(k[feld] ?? '')}
          onChange={(v) => setze(feld, v as never)}
          bild={OHNE_AUSSCHNITT.has(feld) ? undefined : bild}
          box={k.bereiche?.[bereich]}
          onWaehlen={OHNE_AUSSCHNITT.has(feld) ? undefined : waehlen && (() => waehlen(bereich))}
        />
      ))}

      <Text style={st.abschnitt}>Telefon</Text>
      {k.telefone.map((t, i) => (
        <Feld
          key={i}
          wert={t.nummer}
          tastatur="phone-pad"
          onChange={(v) => setze('telefone', k.telefone.map((x, j) => (j === i ? { ...x, nummer: v } : x)))}
          bild={bild}
          box={k.bereiche?.[`telefon${i}`]}
          onWaehlen={waehlen && (() => waehlen(`telefon${i}`))}
          links={
            <Pressable
              style={st.art}
              onPress={() => setze('telefone', k.telefone.map((x, j) => (j === i ? { ...x, art: ART_FOLGE[x.art] } : x)))}
            >
              <Text style={st.artText}>{ART_TEXT[t.art]}</Text>
            </Pressable>
          }
        />
      ))}
      <Pressable onPress={() => setze('telefone', [...k.telefone, { art: 'arbeit', nummer: '' }])}>
        <Text style={st.link}>+ Nummer</Text>
      </Pressable>

      <Text style={st.abschnitt}>E-Mail</Text>
      {k.emails.map((m, i) => (
        <Feld
          key={i}
          wert={m}
          tastatur="email-address"
          onChange={(v) => setze('emails', k.emails.map((x, j) => (j === i ? v : x)))}
          bild={bild}
          box={k.bereiche?.[`email${i}`]}
          onWaehlen={waehlen && (() => waehlen(`email${i}`))}
        />
      ))}
      <Pressable onPress={() => setze('emails', [...k.emails, ''])}>
        <Text style={st.link}>+ E-Mail</Text>
      </Pressable>

      <Feld label="Notiz" wert={k.notiz} onChange={(v) => setze('notiz', v)} mehrzeilig bild={bild} onWaehlen={waehlen && (() => waehlen('notiz'))} />

      <View style={{ marginTop: 8 }}>{children}</View>

      {!!k.rohtext && (
        <Pressable onPress={() => setRohtextZeigen((x) => !x)}>
          <Text style={st.link}>{rohtextZeigen ? 'Erkannten Text ausblenden' : 'Erkannten Text zeigen'}</Text>
        </Pressable>
      )}
      {rohtextZeigen && <Text style={st.roh}>{k.rohtext}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  seite: { flex: 1, backgroundColor: '#fff' },
  inhalt: { padding: 16, paddingBottom: 48 },
  titel: { fontSize: 24, fontWeight: '700', color: FARBE, marginTop: 24, marginBottom: 16 },
  unter: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 8 },
  spalte: { gap: 12, marginTop: 8, alignItems: 'stretch' },
  hinweis: { color: '#555', textAlign: 'center', marginTop: 4 },
  stapelZeile: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  vorschau: { width: 72, height: 44, borderRadius: 4, backgroundColor: '#eee' },
  stapelText: { flex: 1, fontSize: 15, color: '#222' },
  bild: { width: '100%', height: 180, marginBottom: 8, backgroundColor: '#f2f2f2' },
  quelle: { color: '#555', marginBottom: 12 },
  abschnitt: { fontSize: 12, color: '#555', marginTop: 8, marginBottom: 2 },
  art: { borderWidth: 1, borderColor: FARBE, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 10, minWidth: 58 },
  artText: { color: FARBE, textAlign: 'center' },
  link: { color: FARBE, paddingVertical: 8 },
  roh: { fontFamily: Platform.select({ android: 'monospace', default: 'Courier' }), color: '#333', backgroundColor: '#f6f6f6', padding: 8 },
});
