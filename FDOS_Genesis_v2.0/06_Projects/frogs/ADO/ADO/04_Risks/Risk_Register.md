# Risk Register – frogs.

## Stand: ADO v9

| ID | Risiko | Kritikalität | Status | Quelle |
|---|---|---:|---|---|
| R-001 | Firestore Reads sind ohne echte Auth nicht belastbar rollenbasiert absicherbar | Kritisch | Wird durch F009 adressiert | F005/F007 QA |
| R-002 | Firestore Deletes waren bzw. sind teilweise sicherheitskritisch | Kritisch | Wird durch F009 adressiert | F005 QA |
| R-003 | Writes können ohne serverseitige Identität keine echte Benutzerberechtigung prüfen | Kritisch | Wird durch F009 adressiert | F005 QA |
| R-004 | Firebase Auth Migration kann Login-Flows und bestehende Nutzerverwaltung beeinflussen | Hoch | Aktiv | F008 Architect |
| R-005 | Inkonsistente Verknüpfung zwischen `users/{uid}` und bestehenden `lehrer`-Dokumenten | Hoch | Neu | F008 Architect |
| R-006 | Firestore Rules können bestehende Queries brechen | Hoch | Neu | F008 Architect |
| R-007 | NFC nicht auf Android-Hardware abgenommen | Kritisch | Offen | F003/F005 QA |
| R-008 | Keine automatisierten Regressionstests vorhanden | Hoch | Offen | F003/F005/F007 QA |
| R-009 | Firestore Rules nicht per Emulator ausreichend nachgewiesen | Hoch | Offen | F005 QA |
| R-010 | Legacy-Daten können bei strengeren Rules oder Auth-Migration inkompatibel sein | Mittel | Offen | F004/F006/F008 |

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
