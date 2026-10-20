# Visitenkarten-Scanner

Visitenkarte fotografieren, Felder prüfen, Kontakt speichern. **Ohne KI**, Texterkennung
auf dem Gerät. Kein Connector: Gespeichert wird über das Telefon selbst, Outlook bekommt den
Kontakt über das Exchange-Konto. Abgleich mit dem Jolmes-CRM kommt später.

**Zuerst wird die Web-App (PWA) gebaut** (Entscheidung 20.10.2026). Sie läuft auf Android und
iPhone im Browser und lässt sich als App auf den Startbildschirm legen. Die Android-App bleibt
im Code, ruht aber.

| Weg | Stand |
|---|---|
| **Web-App (PWA)**, Android und iPhone | im Browser (Chromium, auch als Android-Handy simuliert) getestet: QR-Code, Texterkennung, vCard-Download, Service Worker. **Auf echten Handys noch nicht**, braucht zuerst eine HTTPS-Adresse |
| Android-App (ruht) | Code fertig, JS-Bundle baut, nie auf einem Gerät gelaufen |

Begründungen und Entscheidungen: [docs/KONZEPT.md](docs/KONZEPT.md).
Erster Gerätetest: [docs/TESTPLAN-PWA.md](docs/TESTPLAN-PWA.md) (Android-App: [docs/TESTPLAN-ANDROID.md](docs/TESTPLAN-ANDROID.md)).

## Ablauf in der Web-App

1. **Karte fotografieren** (öffnet die Kamera) oder Bild auswählen
2. QR-Code mit vCard wird zuerst gelesen. Sonst Texterkennung (tesseract.js), danach
   ordnen feste Regeln die Felder zu (`src/kern/parser.ts`)
3. Felder prüfen und korrigieren
4. Speichern:
   - **Als Kontakt speichern (vCard)**: iPhone zeigt sofort die Kontaktvorschau,
     „Neuen Kontakt erstellen“. Android lädt die Datei, Tipp auf „Öffnen“, App wählen
   - **Teilen …** (wenn der Browser Dateien teilen kann): Teilen-Menü des Telefons
   - **Kontakt-Editor öffnen (Test)**, nur Android: Versuch, den Kontakt-Editor wie in der
     App direkt zu öffnen. Ob Chrome das zulässt, ist ungeprüft

Kamera, Texterkennung und QR laufen im Browser auf dem Handy. Die nötigen Dateien
(Texterkennung, QR) liefert der eigene Server mit aus. Der Service Worker hält sie im
Zwischenspeicher, nach dem ersten Aufruf geht die Erkennung auch ohne Netz.

## Ablauf in der Android-App (ruht)

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
  qr(.web).ts                QR-Code im Foto
  speichern(.web).ts         Knöpfe zum Speichern
public/                      nur Web: index.html, manifest.webmanifest, sw.js, icons/
src/verarbeiten.ts           Bild -> QR oder Texterkennung -> Kontakt
test/                        Tests für src/kern (nur erfundene Karten)
scripts/web-dateien.mjs      legt OCR- und QR-Dateien nach public/tesseract und public/zxing
```

## Befehle

```bash
npm install
npm test              # Regeln, vCard, Android-Extras
npm run typecheck
npm run web:dateien   # einmalig vor dem Web-Start: OCR- und QR-Dateien nach public/
npx expo start --web  # Web-App lokal
npm run web:export    # fertige Web-App nach dist/, diesen Ordner auf einen HTTPS-Server legen
```

**Web-App ausliefern.** `dist/` ist eine statische Seite (rund 30 MB, überwiegend das
deutsche OCR-Modell). Sie braucht **HTTPS**, sonst gehen Service Worker und „Zum
Startbildschirm“ nicht. Jeder Pfad, der keine Datei ist, muss auf `index.html` zeigen. Wo sie
liegen soll, ist noch offen (KONZEPT.md).

**Android-App bauen (ruht).** ML Kit ist ein nativer Baustein, die App läuft deshalb nicht in Expo
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
