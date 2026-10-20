# Visitenkarten-Scanner

Visitenkarte fotografieren, Felder prüfen, Kontakt speichern. Läuft **offline und ohne KI**
auf dem Gerät. Kein Connector: Gespeichert wird über das Telefon selbst, Outlook bekommt den
Kontakt über das Exchange-Konto. Später kommt der Abgleich mit dem Jolmes-CRM dazu.

| Gerät | Weg | Stand |
|---|---|---|
| **Android** (Hauptziel) | App (Expo/React Native), Texterkennung Google ML Kit, Modell in der App gebündelt | Code fertig, JS-Bundle baut, **auf einem Gerät noch nicht getestet** |
| iPhone (Einzelfälle) | Web-App im Browser, Texterkennung tesseract.js, Kontakt als vCard | im Browser (Chromium) getestet, auf einem iPhone noch nicht |

Begründungen und Entscheidungen: [docs/KONZEPT.md](docs/KONZEPT.md).
Erster Gerätetest: [docs/TESTPLAN-ANDROID.md](docs/TESTPLAN-ANDROID.md).

## Ablauf in der App

1. **Karte fotografieren** (oder Bild auswählen), zuschneiden
2. Hat die Karte einen QR-Code mit vCard, wird der gelesen (fehlerfrei). Sonst Texterkennung,
   danach ordnen feste Regeln die Felder zu (`src/kern/parser.ts`)
3. Felder prüfen und korrigieren
4. Speichern:
   - **In Kontakte / Outlook speichern**: Der Kontakt-Editor von Android öffnet sich
     vorausgefüllt. Oben das Konto wählen (Outlook/Exchange), **Speichern** tippen
   - **Als vCard öffnen mit …**: Android fragt, mit welcher App die Datei geöffnet wird
   - **vCard teilen**: z. B. an sich selbst mailen, für Outlook am PC

## Aufbau

```
App.tsx                      Oberfläche (eine Seite)
src/kern/                    reines TypeScript, ohne React Native, mit Tests
  parser.ts                  Text -> Kontaktfelder, nur Regeln
  vcard.ts                   vCard 3.0 schreiben, vCard/MECARD (QR) lesen
  android-kontakt.ts         Extras für den Android-Kontakt-Editor
src/plattform/               je Plattform eine Datei (.ts = Android, .web.ts = Browser)
  ocr(.web).ts               Texterkennung
  speichern(.web).ts         Speichern
src/verarbeiten.ts           Bild -> QR oder Texterkennung -> Kontakt
test/                        Tests für src/kern (nur erfundene Karten)
scripts/web-ocr-dateien.mjs  legt die OCR-Dateien für den Browser nach public/tesseract
```

## Befehle

```bash
npm install
npm test              # Regeln, vCard, Android-Extras
npm run typecheck
npm run web:ocr       # einmalig vor dem Web-Start: OCR-Dateien nach public/tesseract
npx expo start --web  # Web-Variante lokal
```

**Android-App bauen.** ML Kit ist ein nativer Baustein, die App läuft deshalb nicht in Expo
Go, sondern braucht einen eigenen Build:

- in der Cloud: `npx eas-cli build -p android --profile apk` (Expo-Konto nötig), ergibt eine
  APK zum direkten Installieren
- lokal mit Android Studio/SDK: `npx expo run:android` (Gerät per USB) oder
  `npx expo prebuild -p android` und dann `android/gradlew assembleRelease`

Verteilt wird die APK direkt (Datei aufs Handy, „Unbekannte Apps installieren“ für den
Dateimanager erlauben). Ein MDM gibt es nicht, der Play Store ist nicht nötig.

## Regeln für das Repo

- **Keine echten Visitenkarten** (Fotos, Texte) ins Repo, auch nicht als Testfall. Sie
  enthalten Personendaten. Testfälle werden erfunden (`test/`)
- Neue Erkennungsregel = neuer Testfall in `test/parser.test.ts`
