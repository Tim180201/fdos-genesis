# Decision Log – frogs.

## D-001 – ZIP/ADO Workflow
Der Projektstand wird über ADO-ZIP versioniert. Ergebnisse werden in `ADO/02_Results` integriert.

## D-002 – Development Office über Codex
Die ChatGPT-Dev-Rolle wird nicht weitergeführt. Development Office wird durch Codex auf Git ausgeführt.

## D-003 – Kein Go-live nach F003
QA F003 hat keine Go-live-Freigabe erteilt. Stabilisierungssprints erforderlich.

## D-004 – Keine Firebase Auth Migration in F004/F006
F004 und F006 sollten innerhalb der bestehenden Architektur stabilisieren. Eine vollständige Auth-Migration wurde zunächst nicht beauftragt.

## D-005 – Kein Go-live nach F005
QA F005 bestätigt weiterhin kritische Blocker. Go-live bleibt gesperrt.

## D-006 – Kein Go-live nach F007
QA F007 erteilt weiterhin keine Freigabe.

## D-007 – Firebase Auth wird eingeführt
Der Coordinator entscheidet nach F007 und auf Wunsch des Kunden: Firebase Auth soll eingeführt werden. Vor Implementierung wurde F008 Architecture beauftragt.

## D-008 – F008 Architektur freigegeben
Die Minimalmigration aus F008 wird übernommen:
- Firebase Auth als technische Identitätsschicht
- `users/{uid}` als Rollen- und Standortquelle
- bestehende Fachcollections bleiben erhalten
- keine Custom Claims im ersten Schritt
- keine fachlichen Neuentwicklungen im Auth-Sprint

## D-F016 – NFC Emergency Sprint vor allen weiteren Arbeiten
Datum: 2026-06-17
Entscheidung: F016 wird als P0-Emergency-Sprint angelegt. F014 und F015 werden pausiert, bis NFC vollständig stabilisiert und hardwaregetestet ist.
Begründung: NFC ist zentraler produktiver Erfassungsweg und aktuell nicht nutzbar.
Konsequenz: Codex bearbeitet ausschließlich `ADO/01_Cases/ADO_Case_F016_Dev.md`.


## Decision – ADO v22 / F017 QA Gate

- Datum: 2026-06-17
- Entscheidung: Nach NFC Emergency Stabilization wird ein eigener QA-Sprint F017 als Release Gate eingeführt.
- Begründung: NFC ist produktkritisch; RC1 darf erst nach echter Hardware-Validierung freigegeben werden.
- Folge: F014/F015 bleiben pausiert, bis F017 PASS ergibt.


## D-v23-F018-QA – Full App QA with NFC Priority

- Entscheidung: Vor weiterer RC-Freigabe wird ein zusätzlicher QA-Sprint F018 durchgeführt.
- Begründung: NFC ist feldkritisch und war zuletzt mehrfach blockerhaft betroffen. Eine reine NFC-Prüfung reicht nicht mehr; die App muss gegen alle aktuellen Anforderungen regressionsgeprüft werden.
- Konsequenz: NFC-Crashes, fehlerhafte NFC-Start/Stop-Flows oder inkonsistente Zeitdatensätze blockieren RC automatisch.
