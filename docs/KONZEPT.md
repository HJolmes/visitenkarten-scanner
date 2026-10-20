# Konzept und Entscheidungen

Stand 20.10.2026. Entschieden mit Henning im Gespräch.

## Vorgaben

- **Ohne KI.** Kein Cloud-Dienst, kein Sprachmodell, die Karte verlässt das Gerät nicht.
  Die Texterkennung selbst arbeitet mit einem trainierten Modell (ohne geht OCR nicht), es
  läuft aber lokal. Die Zuordnung der Felder geschieht nur über feste Regeln
- **Offline ist für die Web-App nicht zwingend** (Henning, 20.10.2026). Sie darf Dateien aus
  dem Netz laden. Trotzdem kommen alle Dateien vom eigenen Server, das ist einfacher und
  schneller, und nach dem ersten Aufruf läuft sie dank Service Worker auch ohne Netz
- **Zuerst nur die Web-App (PWA)**, noch ohne CRM (Henning, 20.10.2026). Vielleicht reicht
  sie schon. Die Android-App ruht
- **Kein Connector**, sondern aktiver Import: Der Mensch tippt auf Speichern
- **Ziel Outlook**, am liebsten direkt, sonst so, dass nur noch „Speichern“ fehlt
- Hauptsächlich **Android**, iPhone in Einzelfällen, vernachlässigbar
- Outlook läuft über Exchange / Microsoft 365, das Konto ist auf den Handys eingerichtet
- Kein MDM
- Eigenes Projekt, nicht in der Jolmes Suite. Später Anbindung ans CRM

## Wie der Kontakt nach Outlook kommt

### Web-App (aktuell)

| Weg | Wie | Bewertung |
|---|---|---|
| **vCard herunterladen** (Hauptknopf) | Datei wird erzeugt und geladen | iPhone: Safari zeigt die Kontaktvorschau, „Neuen Kontakt erstellen“, landet im Standardkonto (in iOS auf Exchange stellen, dann in Outlook). Android: Chrome lädt die Datei, „Öffnen“, App wählen. Welche Apps Android anbietet (Kontakte, Outlook?), zeigt der Test |
| Teilen | Web Share API mit der vCard als Datei | erscheint nur, wenn der Browser das Teilen dieser Datei erlaubt. Ob Chrome `.vcf` teilen lässt, ist ungeprüft |
| Kontakt-Editor (Test), nur Android | `intent:`-Adresse mit denselben Feldern wie in der App | wäre der Ein-Tipp-Weg wie in der App. Chrome startet über `intent:` aber nur Apps, die Aufrufe aus dem Browser erlauben; ob der Kontakt-Editor dazugehört, ist ungeprüft. Geht es nicht, fliegt der Knopf raus |

### Android-App (ruht)

| Weg | Wie | Bewertung |
|---|---|---|
| **1. Kontakt-Editor (Standard)** | Intent `ACTION_INSERT` öffnet den Kontakt-Editor von Android mit allen Feldern vorausgefüllt. Dort das Outlook-/Exchange-Konto wählen, Speichern. Exchange gleicht mit Outlook ab | ein Tipp, keine Berechtigung nötig. **Offen:** Ob das Outlook-Konto in der Kontoauswahl erscheint, hängt davon ab, wie Exchange auf dem Handy eingerichtet ist, siehe Testplan |
| 2. vCard „Öffnen mit …“ | `.vcf` wird erzeugt und mit `ACTION_VIEW` übergeben, Android zeigt die Auswahl der Apps | ohne Versand, wie gewünscht. Welche Apps `.vcf` annehmen (Kontakte ja, Outlook-App unklar), zeigt der Test |
| 3. vCard teilen | Teilen-Menü, z. B. Mail an sich selbst, am PC in Outlook öffnen | Rückfallebene |
| (verworfen) direkt in die Kontaktdatenbank schreiben | `WRITE_CONTACTS` und gezielt ins Exchange-Konto schreiben | ginge ohne Editor, braucht aber Kontaktberechtigung und ist bei Exchange-Konten fehleranfällig. Erst prüfen, wenn Weg 1 im Test nicht trägt |
| (verworfen) Microsoft Graph | direkt ins Postfach | ist ein Connector, braucht Netz und Anmeldung |

Grenzen des Editors: höchstens 3 Telefonnummern und 3 Mails, Adresse als Freitext.
Webseite und Abteilung kennt der Intent nicht, sie stehen in der Notiz.

## iPhone

- **Als App:** möglich, aber aufwendig. Nötig ist das Apple Developer Program (kostenpflichtig,
  jährlich). Verteilt wird ohne App Store über TestFlight (Builds laufen nach 90 Tagen ab)
  oder Ad-hoc (jedes Gerät einzeln registrieren). Für Einzelfälle lohnt das nicht
- **Darum Web-App** (inzwischen der Hauptweg für alle Geräte). Dieselbe Codebasis läuft im Browser (`.web.ts`-Dateien). Die
  Texterkennung (tesseract.js) läuft **im Browser auf dem Gerät**, auch die OCR-Dateien
  kommen vom eigenen Server, nicht aus dem Internet. Gespeichert wird per vCard: Safari zeigt
  die Kontaktvorschau, „Neuen Kontakt erstellen“ legt ihn im Standardkonto an. Ist das
  Exchange-Konto in iOS als Standard für Kontakte eingestellt, landet er in Outlook
- Service Worker vorhanden: nach dem ersten Aufruf läuft die Web-App auch ohne Netz
- QR-Codes: Chrome auf Android hat einen eingebauten Leser (BarcodeDetector). Safari nicht,
  dort springt der Nachbau `barcode-detector` ein, dessen Datei (`public/zxing`) der eigene
  Server mitliefert
- Die Web-App braucht eine HTTPS-Adresse zum Ausliefern. Noch nicht entschieden

## Texterkennung

| Plattform | Baustein | offline |
|---|---|---|
| Android | `@react-native-ml-kit/text-recognition` 2.0, bindet `com.google.mlkit:text-recognition` ein, das ist die **gebündelte** Variante (Modell steckt in der APK, kein Nachladen über Play-Dienste) | ja |
| Browser | `tesseract.js` 7 mit deutschem Modell (`@tesseract.js-data/deu`, best_int), Dateien in `public/tesseract` | ja, nach dem ersten Aufruf |

Hinweis: Das ML-Kit-Paket bindet auch die Modelle für Chinesisch, Japanisch, Koreanisch und
Devanagari ein. Das macht die APK größer. Lässt sich später mit einem eigenen Gradle-Eintrag
abspecken, wenn die Größe stört.

## Feldzuordnung (Regeln)

`src/kern/parser.ts`, Reihenfolge:

1. Register-, Steuer- und Bankzeilen (HRB, USt-IdNr., IBAN …) gleich in die Notiz, damit
   ihre Ziffern nicht als Telefon gelten
2. E-Mail und Webseite über Muster, auch `name (at) firma.de`
3. Telefon: Label davor (Tel., T, Mobil, M, Fax, F …) bestimmt die Art. Ohne Label gilt
   eine deutsche Mobilvorwahl (015x, 016x, 017x) als Mobil. Format über libphonenumber
   als `+49 …`
4. Adresse über die PLZ (5-stellig, A-/CH- mit 4 Stellen), Straße in derselben Zeile davor
   oder in der Zeile darüber
5. Firma: Rechtsform (GmbH, AG, KG, e.K. …), sonst Wörter wie Sparkasse, Klinikum,
   Hausverwaltung, sonst die Zeile, die zur Mail-Domain passt (nicht bei GMX, Gmail usw.)
6. Name: Wertung je Zeile. Plus für Anrede, Titel, Großschreibung und vor allem Übereinstimmung
   mit dem Teil der Mail vor dem @. Titel (Dr., Prof., Dipl.-Ing.) und Namenszusätze (von, van)
   werden getrennt
7. Position (Geschäftsführer, Leiter, Vertrieb …) und Abteilung
8. Alles Übrige in die Notiz, der Rohtext bleibt einsehbar

Das Ergebnis ist ein Vorschlag. Die Korrekturmaske kommt immer.

## CRM-Anbindung (später)

Ziel: Kontakte landen auch im CRM der Jolmes Suite und bleiben dort aktuell.

1. App führt eine **lokale Warteschlange** der gespeicherten Kontakte (SQLite). Ist Netz da,
   gehen sie an das CRM
2. Das CRM legt sie als **Vorschlag** an, nicht direkt als Ansprechpartner. Abgleich über
   E-Mail, Telefon, Firmenname. Ein Treffer ist ein Dublettenhinweis, kein automatisches
   Zusammenführen (passt zum Konzept Kundenstruktur im CRM: Dubletten sind nur Hinweis,
   Ansprechpartner hängen n:m an Kunden)
3. Langfristig ist das **CRM die führende Quelle**. Änderungen gehen von dort ins Exchange
   (und damit auf die Handys). Das ist die Stelle, an der „automatisch aktuell“ entsteht,
   nicht in dieser App
4. Nötig von der Suite: ein Endpunkt für Kontaktvorschläge und eine Anmeldung für die App.
   Noch nicht besprochen

## Offen

- [ ] **HTTPS-Adresse für die Web-App** festlegen (Entscheidung Henning)
- [ ] Gerätetest Web-App nach `docs/TESTPLAN-PWA.md`
- [ ] Erkennungsquote an echten Karten messen (Karten nicht ins Repo, nur die Fehlerbilder
      als erfundene Testfälle nachbauen)
- [ ] Zuschnitt: Im Browser gibt es keinen Zuschnitt nach dem Foto, die Karte sollte das
      Bild füllen. Bei schlechten Ergebnissen Zuschnitt nachrüsten
- [ ] Danach entscheiden: reicht die Web-App, oder doch die Android-App (Testplan Android)
- [ ] CRM-Anbindung (Warteschlange, Endpunkt in der Suite), später
