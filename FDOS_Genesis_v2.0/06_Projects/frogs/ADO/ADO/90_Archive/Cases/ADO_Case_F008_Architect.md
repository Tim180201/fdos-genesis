# ADO Case F008 – Architecture Office

## Projekt
frogs. Zeiterfassung

## Empfänger
🏛️ Architecture Office

## Projektstatus
Projektphase: Stabilisierung vor Go-live

Go-live Status: Nicht freigegeben

## Ausgangslage
QA hat nach mehreren Stabilisierungssprints weiterhin keine Freigabe erteilt.

Die wiederkehrende Kernursache ist, dass die bestehende PIN-/AsyncStorage-Architektur keine belastbare serverseitige Rollenidentität für Firestore Rules bereitstellt.

## Coordinator-Entscheidung
Firebase Auth wird eingeführt.

## Ziel des Sprints
Erstelle ein minimales, risikoarmes Architekturkonzept für die Einführung von Firebase Auth in frogs.

Es geht nicht um eine perfekte Neuentwicklung, sondern um eine produktionsnahe Migration, die den Go-live ermöglicht.

## Arbeitsgrundlage
Lies insbesondere:

- `ADO/02_Results/Result_F005_QA.md`
- `ADO/02_Results/Result_F006_Dev.md`
- `ADO/02_Results/Result_F007_QA.md`
- `ADO/03_Coordinator/Coordinator_Assessment_F007.md`
- `ADO/04_Risks/Risk_Register.md`
- `ADO/05_Decisions/Decision_Log.md`

## Architekturfragen

Bitte beantworte verbindlich:

1. Welche bestehende Login-Architektur ist betroffen?
2. Wie sollen Admin, Standortleitung und Lehrer künftig authentifiziert werden?
3. Wie werden bestehende PIN-Logins migriert oder abgelöst?
4. Wo werden Rollen und Standortzuordnungen gespeichert?
5. Werden Firebase Custom Claims verwendet oder User-Dokumente?
6. Welche Firestore Rules werden dadurch möglich?
7. Welche Dateien sind voraussichtlich betroffen?
8. Was ist die kleinste sinnvolle Migrationsvariante für frogs.?
9. Welche Risiken entstehen durch die Migration?
10. Welche Arbeitspakete ergeben sich für Development?
11. Welche Testfälle braucht QA danach?
12. Welche Datenmigration ist erforderlich?

## Einschränkungen
- Keine Codeänderungen.
- Keine Implementierung.
- Keine neuen Features außerhalb Auth/Security.
- Fokus auf Go-live-Fähigkeit.

## Erwartete Ausgabe
Erstelle:

`Result_F008_Architect.md`

Der Bericht muss enthalten:
- Executive Summary
- Empfohlene Zielarchitektur
- Minimale Migrationsstrategie
- Betroffene Dateien / Module
- Firestore-Rules-Konzept
- Daten-/Nutzermigrationskonzept
- Risiken
- Development-Arbeitspakete
- QA-Testempfehlungen
- Empfehlung an den Coordinator

## Definition of Done
- Firebase-Auth-Strategie ist klar beschrieben.
- Minimale Migrationsvariante ist definiert.
- Development kann anschließend ohne Architekturfragen beauftragt werden.
- Risiken sind dokumentiert.
- Rückgabe ausschließlich an den 🧭 Coordinator.
