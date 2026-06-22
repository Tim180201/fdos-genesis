# Coordinator Assessment – F010 QA

## Sprint
F010 – QA-Abnahme Firebase-Auth-Migration

## Ergebnis
QA hat keine Go-live-Freigabe erteilt.

## Quality Gate
Status: Nicht freigegeben

## Bewertung
Die Firebase-Auth-Migration reduziert die früheren Security-Blocker deutlich. Die App ist aber noch nicht go-live-fähig, weil Nachweise und operative Vorbereitung fehlen.

## Zentrale QA-Befunde
- Firestore Rules wurden nicht per Emulator oder Testprojekt nachgewiesen.
- Firebase Auth Test-User und `users/{uid}`-Profile sind nicht nachgewiesen.
- `visibleForLehrerIds`-Migration für Bestandsdaten ist nicht nachgewiesen.
- Nutzerverwaltung legt keine Firebase-Auth-User/Profile an.
- Standortleitungs-NFC ist inkonsistent.
- `config/admin` und `aenderungslog` sind noch zu breit lesbar.
- NFC-Hardwaretest fehlt weiterhin.
- ADO-Ablage von F009 war inkonsistent.

## Coordinator-Entscheidung
Der nächste Sprint geht an DevOps, nicht an Development.

## Begründung
Mehrere offene Punkte sind keine reinen Codeaufgaben, sondern Deployment-, Firebase-, Testdaten-, Migrations- und Nachweisthemen.

## Nächster Sprint
F011 – DevOps Office

## Ziel
Produktionsnahe Firebase-/Deploy-/Testumgebung vorbereiten, Migration und Testnachweise ermöglichen und QA F012 vorbereiten.
