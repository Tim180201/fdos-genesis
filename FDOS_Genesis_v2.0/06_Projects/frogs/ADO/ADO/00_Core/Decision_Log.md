# Decision Log – frogs.

## D-001 – ZIP/ADO Workflow
Der Projektstand wird über ADO-ZIP versioniert. Ergebnisse werden integriert.

## D-002 – Development Office über Codex
Development Office wird durch Codex auf Git ausgeführt.

## D-003 – Kein Go-live nach F003/F005/F007/F010
QA hat wiederholt keine Go-live-Freigabe erteilt. Go-live bleibt gesperrt, bis Nachweise und Blocker geschlossen sind.

## D-004 – Firebase Auth wird eingeführt
Firebase Auth wurde nach F007 beschlossen und in F009 umgesetzt.

## D-005 – F010 nicht freigegeben
QA F010 bestätigt: Auth-Architektur ist verbessert, aber Nachweise und operative Vorbereitung fehlen.

## D-006 – F011 geht an DevOps
Der nächste Sprint adressiert Firebase-/Deploy-/Testdaten-/Migrations- und Nachweisthemen. Daher geht F011 an DevOps, nicht an Development.


## D-F014 – Standortmodell bleibt für Version 1.0 bestehen
Die Frage, ob Standorte künftig entfallen und direkt über Standortleitungen geregelt werden, wird nicht im RC-Bugfix-Sprint entschieden. Für Version 1.0 bleibt das bestehende Standortmodell verbindlich.

## D-F015 – NFC Feedback darf verbessert werden
Der Zeitraum zwischen NFC-Scan und sichtbarem Start darf optimiert werden. Falls technisch nicht ausreichend verkürzbar, ist eine dezente moderne Lade-/Scan-Animation erlaubt. Dies gilt als Produktiv-UX-Fix, nicht als neues Feature.


## D-HANDOFF-001 – RC1 noch zurückgestellt
Obwohl F013 QA keine dokumentierten Go-live-Blocker meldete, wurden anschließend im echten Feldtest neue RC-Blocker gefunden. RC1 wird zurückgestellt bis F014 Development und F015 QA abgeschlossen sind.

## D-HANDOFF-002 – Standorte bleiben für v1.0
Das Standortmodell bleibt für Version 1.0 bestehen. Eine mögliche Vereinfachung über Standortleitungen wird erst für v1.1 bewertet.

## D-HANDOFF-003 – Aktiver nächster Sprint ist F014 Development
Der nächste operative Schritt ist F014 Development Office / Codex zur Behebung der aktuellen Feldtest-Blocker.

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
