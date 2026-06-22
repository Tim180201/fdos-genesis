# ADO Case F006 – Development Office

## Projekt
frogs. Zeiterfassung

## Empfänger
💻 Development Office

## Projektstatus
Projektphase: Stabilisierung vor Go-live

Go-live Status: Nicht freigegeben

## Ausgangslage
QA F005 hat die Änderungen aus F004 geprüft und keine Go-live-Freigabe erteilt.

Die F004-Änderungen haben die Situation teilweise verbessert, aber mehrere kritische Blocker bleiben offen.

## Arbeitsgrundlage
- Aktueller Git-Stand nach F004
- ADO v6
- `ADO/02_Results/Result_F005_QA.md`
- `ADO/03_Coordinator/Coordinator_Assessment_F005.md`
- `ADO/04_Risks/Risk_Register.md`

## Ziel des Sprints
Bearbeite ausschließlich die von QA F005 identifizierten Blocker, soweit dies ohne vollständige Architektur-Migration möglich ist.

Keine neuen Features.
Keine unnötigen Refactorings.
Keine Firebase-Auth-Migration ohne gesonderte Coordinator-Entscheidung.

## Zu bearbeitende QA-Befunde

### F005-QA-001 – Firestore Reads offen
Prüfe, ob Lesezugriffe für produktionsrelevante Collections innerhalb der bestehenden Architektur weiter eingeschränkt werden können, ohne Login und App-Flows zu brechen.

Dokumentiere klar:
- welche Reads geschlossen wurden,
- welche Reads technisch offen bleiben müssen,
- warum.

### F005-QA-002 – Firestore Deletes offen
Schließe oder begrenze Delete-Regeln soweit möglich.

Ziel:
- Keine pauschalen Deletes für produktionsrelevante Collections, wenn nicht zwingend erforderlich.
- Wenn Delete für App-Funktion erforderlich bleibt, muss das Risiko dokumentiert werden.

### F005-QA-003 – Writes ohne echte Benutzerberechtigung
Verbessere Write-Regeln maximal innerhalb der bestehenden Architektur.

Ziel:
- Strukturvalidierung erhalten.
- Zusätzliche Konsistenzprüfungen einbauen, wo möglich.
- Keine falsche Behauptung vollständiger Security ohne Auth.

### F005-QA-004 – `config/preise` unzureichend geschützt
Behebe die pauschale Schreibbarkeit von `config/preise`.

Erwartung:
- Strukturvalidierung für Preisdaten.
- Keine pauschale Write-Erlaubnis ohne Prüfung.

### F005-QA-005 – Standortleitung ohne `standortId`
Behebe den Fallback in Vollabfragen.

Erwartung:
- Standortleitung ohne gültige `standortId` darf nicht in Admin-/Vollzugriffspfade fallen.
- Betroffene Screens müssen einen sicheren Fehlerzustand anzeigen oder leere Daten laden.

Betroffene Datei mindestens:
- `app/nutzer.jsx`

Zusätzlich prüfen:
- `app/index.jsx`
- `app/schueler.jsx`
- `app/stunden.jsx`
- `app/scan.jsx`

### F005-QA-006 – NFC nicht abgenommen
Keine NFC-Featureentwicklung.

Aufgabe:
- Prüfe, ob eine klare manuelle Testanleitung oder Debug-Hinweise ergänzt werden müssen.
- Keine Änderung am NFC-Workflow ohne zwingenden Bugfix.

### F005-QA-008 – Firestore Rules nicht per Emulator nachgewiesen
Wenn möglich:
- Ergänze eine minimale Testanleitung für Firestore Rules.
- Falls Tests nicht ausführbar sind, dokumentiere das im Result.

## Betroffene Dateien mindestens prüfen
- `firestore.rules`
- `utils/db.js`
- `utils/permissions.js`
- `app/index.jsx`
- `app/schueler.jsx`
- `app/nutzer.jsx`
- `app/stunden.jsx`
- `app/scan.jsx`
- `package.json`

## Nicht Bestandteil dieses Sprints
- Firebase Auth Migration
- Neue Login-Architektur
- Neue Features
- UI-Redesign
- Große Refactorings
- Vollständiges Testframework, sofern nicht minimal und notwendig

## Erwartete Ausgabe
Erstelle:

`Result_F006_Dev.md`

Der Bericht muss enthalten:
- Zusammenfassung
- Geänderte Dateien
- Begründung je Änderung
- Bearbeitung je QA-Befund F005-QA-001 bis F005-QA-008
- Nicht lösbare Punkte
- Risiken
- Tests / nicht durchführbare Tests
- Empfehlung an QA
- Empfehlung an Coordinator

## Definition of Done
- Alle F005-QA-Befunde bewertet
- Alle realistisch lösbaren Punkte umgesetzt
- Keine neuen Features
- Keine unnötigen Refactorings
- Restrisiken ehrlich dokumentiert
- Übergabe ausschließlich an den 🧭 Coordinator
