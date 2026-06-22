# Risk Register – frogs.

## Stand: ADO v11

| ID | Risiko | Kritikalität | Status | Quelle |
|---|---|---:|---|---|
| R-001 | Firestore Rules nicht per Emulator/Testprojekt nachgewiesen | Hoch | Offen | F010 QA |
| R-002 | Firebase Auth Testuser und `users/{uid}`-Profile nicht nachgewiesen | Hoch | Offen | F010 QA |
| R-003 | `visibleForLehrerIds`-Migration für Bestandsdaten nicht nachgewiesen | Hoch | Offen | F010 QA |
| R-004 | Nutzerverwaltung erstellt keine Firebase Auth User/Profile | Hoch | Offen | F010 QA |
| R-005 | Standortleitungs-NFC inkonsistent | Hoch | Offen | F010 QA |
| R-006 | `config/admin` bleibt zu breit lesbar | Mittel | Offen | F010 QA |
| R-007 | `aenderungslog` bleibt zu breit lesbar | Mittel | Offen | F010 QA |
| R-008 | NFC nicht auf Android-Hardware abgenommen | Kritisch | Offen | F003/F010 QA |
| R-009 | Query-/Rules-Kompatibilität nicht automatisiert nachgewiesen | Hoch | Offen | F010 QA |
| R-010 | Auth-Migration kann Login-/Session-Flows regressiv beeinflussen | Hoch | In Prüfung | F008/F010 |


## Ergänzung ADO v16

| ID | Risiko | Kritikalität | Status | Quelle |
|---|---|---:|---|---|
| R-F014-001 | Lehrer-Stundenbereich crasht | Kritisch | Offen | Feldtest |
| R-F014-002 | NFC Stop crasht weiterhin | Kritisch | Offen | Feldtest |
| R-F014-003 | Manuell bearbeitete Stunden könnten Korrekturstatus verlieren | Hoch | Offen | Feldtest |
| R-F014-004 | Veraltete PIN-Felder in Nutzeranlage nach Firebase Auth | Mittel | Offen | Feldtest |
| R-F014-005 | Standortanlage durch Admin nicht möglich | Hoch | Offen | Feldtest |
| R-F014-006 | Standortzuweisung für Schüler durch Standortleitung unklar/nicht möglich | Mittel | Offen | Feldtest |
| R-F014-007 | NFC-Feedback zwischen Scan und Start wirkt verzögert | Mittel | Offen | Feldtest |


## Aktuelle Risiken für F014 / RC1

| ID | Risiko | Kritikalität | Status |
|---|---|---:|---|
| R-F014-001 | Lehrer-Stundenbereich crasht | Kritisch | Offen |
| R-F014-002 | NFC Stop crasht weiterhin | Kritisch | Offen |
| R-F014-003 | Korrekturstatus bearbeiteter Stunden kann verloren gehen | Hoch | Offen |
| R-F014-004 | Veraltete PIN-Felder in Nutzeranlage | Mittel | Offen |
| R-F014-005 | Admin kann keine Standorte anlegen | Hoch | Offen |
| R-F014-006 | Standortleitung kann Schüler nicht nachträglich Standort zuweisen | Mittel | Offen |
| R-F014-007 | NFC-Feedback zwischen Scan und Start wirkt verzögert | Mittel | Offen |
| R-F014-008 | Firebase-User/Profile müssen manuell korrekt angelegt werden | Hoch | Offen |

## R-F016-NFC-CRITICAL – NFC vollständig instabil
Priorität: P0
Status: Offen
Beschreibung: NFC öffnet die App nicht mehr zuverlässig, crasht bei Scan in geöffneter App und crasht im Erfassen-Flow.
Auswirkung: RC1 und produktiver Einsatz blockiert, da zentrale Zeiterfassung nicht nutzbar ist.
Maßnahme: Emergency Sprint F016, ausschließlich NFC-Stabilisierung, danach echte Android-Hardware-QA.
Owner: Development Office / QA Office


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
