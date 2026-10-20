# Testplan Web-App (PWA), erster Gerätetest

Adresse: https://hjolmes.github.io/visitenkarten-scanner/ Dauer etwa 20 Minuten.
Je ein Android-Handy (Chrome) und, wenn zur Hand, ein iPhone (Safari).

## Android (Chrome)

| Nr | Was | Erwartet | Ergebnis |
|---|---|---|---|
| A1 | Adresse öffnen, Menü > „Zum Startbildschirm hinzufügen“ / „App installieren“ | Symbol „Visitenkarte“ auf dem Startbildschirm, öffnet ohne Browserleiste | |
| A2 | Karte fotografieren (Karte füllt das Bild) | Kamera öffnet, danach Felder überwiegend richtig | |
| A3 | Karte mit vCard-QR | „Aus QR-Code gelesen“, Felder vollständig | |
| A4 | Flugmodus, A2 wiederholen | geht weiter (Service Worker) | |
| A5 | **Als Kontakt speichern (vCard)**, dann Download-Hinweis „Öffnen“ | Auswahl der Apps. Notieren, welche (Kontakte, Outlook?) | |
| A6 | In A5 Kontakte wählen | Kontakt-Editor mit Kontowahl. Wird das Outlook-/Exchange-Konto angeboten? | |
| A7 | Knopf **Teilen …** (falls sichtbar) | Teilen-Menü mit der Datei. Welche Apps? | |
| A8 | Knopf **Kontakt-Editor öffnen (Test)** | Kontakt-Editor öffnet vorausgefüllt, oder es passiert nichts / Fehlerseite | |
| A9 | Gespeicherten Kontakt am PC in Outlook prüfen, Umlaute | Kontakt da, ä ö ü ß richtig | |

## iPhone (Safari)

| Nr | Was | Erwartet | Ergebnis |
|---|---|---|---|
| I1 | Teilen > „Zum Home-Bildschirm“ | Symbol auf dem Home-Bildschirm | |
| I2 | Karte fotografieren | Felder überwiegend richtig | |
| I3 | **Als Kontakt speichern (vCard)** | Kontaktvorschau, „Neuen Kontakt erstellen“ | |
| I4 | Einstellungen > Kontakte > Standardaccount auf Exchange, dann I3 | Kontakt erscheint in Outlook | |

## Ergebnisse 20.10.2026 (Android, Microsoft Edge)

| Nr | Ergebnis |
|---|---|
| A2 | echte Karte: alles richtig bis auf den Namen (Logo statt Person, weil Sammeladresse firma@firma.de). Regel korrigiert, danach richtig |
| A5 | Download geht. „Öffnen mit“: CamCard, ChatGPT, Dateimanager, Kontakte (Google), Kontakte (Samsung), Termux. **Keine Outlook-App** |
| A6 | **geht.** Kontakte (Samsung) > „Importieren von Kontakten in“ bietet „Outlook (Standard)“ an. Ziel erreicht: Download antippen, Kontakte, Importieren |
| A9 | offen: Kontakt am PC in Outlook prüfen, Umlaute |
| A7 | geht nicht, Knopf entfernt |
| A8 | geht nicht, Knopf entfernt |

## Auswerten

- A6 oder A8 bringen den Kontakt mit einem bis zwei Tipps ins Outlook-Konto: **Web-App reicht**
- A8 geht nicht: Knopf entfernen
- Kein Weg erreicht das Outlook-Konto auf Android: Android-App testen (`TESTPLAN-ANDROID.md`),
  dort öffnet der Kontakt-Editor sicher direkt

Ergebnis hier oder in der Projektakte im jolmes-brain festhalten.
