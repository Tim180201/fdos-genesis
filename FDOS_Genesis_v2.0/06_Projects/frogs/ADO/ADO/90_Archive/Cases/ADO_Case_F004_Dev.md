# ADO Case F004 – Development Office

## Projektstatus
Phase: Stabilisierung vor Go-live

Abgeschlossen:
- F001 Architect
- F002 Product
- F003 QA (nicht freigegeben)

## Relevante Erkenntnisse

### Architect
- Firestore Rules sind unzureichend abgesichert.
- Rollenrechte werden überwiegend im Frontend umgesetzt.
- Root-Duplikate vorhanden, keine unnötigen Refactorings.

### Product
- Rollenmodell laut Product Context muss strikt eingehalten werden.
- Keine neuen Features.

### QA
Bearbeite ausschließlich folgende P1-Blocker:
1. Firestore Security Rules
2. Rollenrechte serverseitig absichern
3. Regression aller als "Fix integriert, Test erforderlich" markierten Bereiche
4. NFC nur technisch vorbereiten; keine Featureentwicklung

## Betroffene Dateien (mindestens prüfen)
- firestore.rules
- utils/permissions.js
- utils/db.js
- app/login.jsx
- app/_layout.jsx
- app/schueler.jsx
- app/nutzer.jsx
- app/stunden.jsx
- app/scan.jsx
- utils/nfcService.js

## Arbeitsauftrag

### A1 Firestore
Analysiere die bestehenden Rules und beseitige ausschließlich die von QA beschriebenen Sicherheitslücken. Dokumentiere jede Änderung.

### A2 Rollenrechte
Prüfe alle Datenzugriffe. Wenn Berechtigungen ausschließlich im Frontend erzwungen werden, sichere sie soweit im Rahmen der bestehenden Architektur möglich zusätzlich ab.

### A3 Regression
Prüfe alle dokumentierten Fixes mit Status "Fix integriert, Test erforderlich". Dokumentiere Ergebnis je Fix.

### A4 NFC
Keine neuen Funktionen. Nur technische Vorbereitungen oder Fehlerbehebungen für den späteren Gerätetest.

## Nicht erlaubt
- Neue Features
- Architekturumbauten
- Unnötige Refactorings

## Ergebnis
Datei: Result_F004_Dev.md

Enthalten:
- Geänderte Dateien
- Begründung je Änderung
- Nicht gelöste Punkte
- Risiken
- Empfehlung an QA

## Definition of Done
- Alle vier P1-Aufträge bearbeitet
- Änderungen dokumentiert
- Keine Featureentwicklung
- Rückgabe an Coordinator
