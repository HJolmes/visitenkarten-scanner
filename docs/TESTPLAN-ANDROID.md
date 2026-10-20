# Testplan Android, erster Gerätetest

Ziel: klären, ob der Kontakt mit einem Tipp in Outlook landet. Dauer etwa 20 Minuten.

## Vorher

- APK bauen (README, „Android-App bauen“) und installieren
- Prüfen, wie Outlook auf dem Handy eingerichtet ist, und notieren:
  - [ ] Outlook-App mit „Kontakte synchronisieren“ eingeschaltet (Outlook > Einstellungen > Konto > Kontakte synchronisieren)
  - [ ] oder Exchange-Konto in Android selbst (Einstellungen > Konten)
  - [ ] oder beides

## Fälle

| Nr | Was | Erwartet | Ergebnis |
|---|---|---|---|
| 1 | Karte ohne QR fotografieren | Felder überwiegend richtig, Hinweis „Aus Texterkennung“ | |
| 2 | Flugmodus an, Fall 1 wiederholen | geht genauso (offline) | |
| 3 | Karte mit vCard-QR | „Aus QR-Code gelesen“, Felder vollständig | |
| 4 | **In Kontakte / Outlook speichern** | Kontakt-Editor öffnet, Felder gefüllt | |
| 5 | In Fall 4: Kontoauswahl oben im Editor | **Outlook- bzw. Exchange-Konto wird angeboten** | |
| 6 | Mit Outlook-Konto speichern, am PC in Outlook nachsehen | Kontakt nach dem nächsten Abgleich in Outlook | |
| 7 | **Als vCard öffnen mit …** | Auswahl der Apps erscheint. Notieren, welche (Kontakte, Outlook?) | |
| 8 | vCard mit Outlook-App öffnen (falls angeboten) | Speichern-Dialog in Outlook | |
| 9 | Umlaute (ä ö ü ß) in Name und Straße | kommen in Outlook richtig an | |

## Auswerten

- Fall 5 und 6 gehen: **Ziel erreicht**, Weg 1 bleibt Standard
- Fall 5 geht nicht, Fall 8 geht: „Als vCard öffnen“ wird der Standardknopf
- Beides geht nicht: Konto auf dem Handy umstellen (Exchange in Android einrichten) oder
  direkt ins Exchange-Konto schreiben (braucht Kontaktberechtigung), siehe KONZEPT.md

Ergebnis hier oder in der Projektakte im jolmes-brain festhalten.
