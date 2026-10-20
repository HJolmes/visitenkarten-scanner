# Konzept und Entscheidungen

Stand 20.10.2026. Entschieden mit Henning im Gespräch.

## Vorgaben

- **Offline und ohne KI.** Kein Cloud-Dienst, kein Sprachmodell, nichts verlässt das Gerät.
  Die Texterkennung selbst arbeitet mit einem trainierten Modell (ohne geht OCR nicht), es
  läuft aber lokal. Die Zuordnung der Felder geschieht nur über feste Regeln
- **Kein Connector**, sondern aktiver Import: Der Mensch tippt auf Speichern
- **Ziel Outlook**, am liebsten direkt, sonst so, dass nur noch „Speichern“ fehlt
- Hauptsächlich **Android**, iPhone in Einzelfällen, vernachlässigbar
- Outlook läuft über Exchange / Microsoft 365, das Konto ist auf den Handys eingerichtet
- Kein MDM
- Eigenes Projekt, nicht in der Jolmes Suite. Später Anbindung ans CRM

## Wie der Kontakt nach Outlook kommt

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
- **Darum Web-App.** Dieselbe Codebasis läuft im Browser (`.web.ts`-Dateien). Die
  Texterkennung (tesseract.js) läuft **im Browser auf dem Gerät**, auch die OCR-Dateien
  kommen vom eigenen Server, nicht aus dem Internet. Gespeichert wird per vCard: Safari zeigt
  die Kontaktvorschau, „Neuen Kontakt erstellen“ legt ihn im Standardkonto an. Ist das
  Exchange-Konto in iOS als Standard für Kontakte eingestellt, landet er in Outlook
- **Offline auf dem iPhone:** Die Erkennung selbst braucht kein Netz. Zum Öffnen der Seite
  aber schon, solange es keinen Service Worker gibt (offen, siehe unten). Mit Service Worker
  wäre die Web-App nach dem ersten Aufruf auch ohne Netz nutzbar
- QR-Codes werden im Browser derzeit **nicht** gelesen: Die QR-Erkennung von expo-camera lädt
  im Browser eine Datei aus dem Netz (jsdelivr). Abgeschaltet, bis sie lokal ausgeliefert wird
- Die Web-App braucht einen Ort zum Ausliefern (z. B. der Server der Jolmes Suite). Noch
  nicht entschieden

## Texterkennung

| Plattform | Baustein | offline |
|---|---|---|
| Android | `@react-native-ml-kit/text-recognition` 2.0, bindet `com.google.mlkit:text-recognition` ein, das ist die **gebündelte** Variante (Modell steckt in der APK, kein Nachladen über Play-Dienste) | ja |
| Browser | `tesseract.js` 7 mit deutschem Modell (`@tesseract.js-data/deu`, best_int), Dateien in `public/tesseract` | ja |

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

- [ ] Gerätetest Android nach `docs/TESTPLAN-ANDROID.md`
- [ ] Erkennungsquote an echten Karten messen (Karten nicht ins Repo, nur die Fehlerbilder
      als erfundene Testfälle nachbauen)
- [ ] Web-App: Service Worker für echten Offline-Betrieb, Ort zum Ausliefern
- [ ] Web-App: QR-Erkennung mit lokal ausgelieferter Datei
- [ ] Kantenerkennung / Dokumentenscanner statt freiem Zuschnitt
- [ ] CRM-Anbindung (Warteschlange, Endpunkt in der Suite)
