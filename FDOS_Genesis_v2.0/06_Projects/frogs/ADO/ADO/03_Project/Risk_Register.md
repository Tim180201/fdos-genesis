# Risk Register

| ID | Risiko | Priorität | Status |
|---|---|---|---|
| R-001 | Firestore Security / Rollenrechte primär Frontend | Hoch | Offen |
| R-002 | Root-Duplikate / Altlasten | Mittel | Offen |
| R-003 | Inkonsistente Datenzugriffe auf Schülerdaten | Hoch | Offen |
| R-004 | NFC-Gerätekompatibilität | Hoch | Offen |


## Risk – NFC Regression remains release blocker

- Status: Open
- Severity: Critical
- Beschreibung: NFC ist der zentrale Erfassungsweg. Unvollständig validierte NFC-Fixes können RC1 blockieren oder Feldtests unbrauchbar machen.
- Mitigation: F017 QA-Sprint mit echter Android-Hardware, Cold-Start, In-App-Scan, Start/Stop, Fehlerfällen und Regression.


## R-v23-NFC-RC-Gate – NFC remains release-critical

- Status: OPEN
- Severity: Critical
- Bereich: NFC / Zeiterfassung / Android Lifecycle
- Risiko: NFC öffnet App nicht, crasht bei geöffneter App oder erzeugt inkonsistente Start/Stop-Zeitdaten.
- Mitigation: Sprint F018 führt Full Regression mit NFC-Priorität durch. Alle NFC-Crashes sind RC-blockierend.
