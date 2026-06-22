# Decision Log

| ID | Entscheidung | Status |
|---|---|---|
| D-001 | Fokus auf frogs. Go-live vor TapTime/FDOS | Aktiv |
| D-002 | Keine großen neuen Funktionen vor Go-live | Aktiv |
| D-003 | ADO Case Files werden als zentrale Sprintakte genutzt | Aktiv |

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
