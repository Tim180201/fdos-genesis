# Result F006 – Development Office

## Executive Summary

Sprint F006 hat ausschließlich die von QA F005 identifizierten Blocker bearbeitet,
soweit dies innerhalb der bestehenden Architektur (PIN-Login ohne Firebase Auth)
möglich ist. Es wurden keine neuen Features eingebaut und keine unnötigen
Refactorings vorgenommen. Die Firebase-Auth-Migration wurde – wie vorgegeben –
nicht angefasst.

Ergebnis: Mehrere reale, strukturell schließbare Lücken wurden geschlossen
(`config/preise`, Delete-Regeln für `arbeitszeiten`/`config`, fehlende
Standortleitung-Fallback-Bugs in 4 Screens). Die grundsätzlichen, architektur-
bedingten Lücken (offene Reads, teilweise offene Deletes/Writes ohne echte
Benutzerberechtigung) bleiben – wie von QA erwartet – ohne Auth-Migration
technisch unlösbar und sind unten ehrlich dokumentiert.

## Geänderte Dateien

- `firestore.rules`
- `app/nutzer.jsx`
- `app/index.jsx`
- `app/stunden.jsx`
- `app/schueler.jsx`
- `app/scan.jsx`
- `docs/NFC_MANUAL_TESTPLAN.md` (neu)
- `docs/FIRESTORE_RULES_TESTPLAN.md` (neu)
- `ADO/02_Results/Result_F006_Dev.md` (dieses Dokument)

`utils/db.js`, `utils/permissions.js` und `package.json` wurden geprüft, aber
nicht geändert (Begründung siehe unten).

## Begründung je Änderung

### `firestore.rules`
- `isValidRolle()` / `isValidPin()` / `isValidPreise()` ergänzt: zusätzliche
  Strukturprüfungen für Rolle, PIN und Preiskonfiguration (F005-QA-003, -004).
- `lehrer/{id}`: `create`/`update` prüfen jetzt `rolle` gegen eine feste Liste
  und `pin` auf gültiges String-Format, statt nur auf Existenz der Felder.
- `arbeitszeiten/{id}`: `create` prüft `rolle in ['admin','standort']`, da nur
  diese beiden Rollen laut `app/scan.jsx` eigene Arbeitszeit erfassen.
  `delete` wurde auf `false` gesetzt – `utils/db.js` enthält keine
  Lösch-Funktion für `arbeitszeiten`, das pauschale Delete war ungenutzt und
  konnte daher ohne Funktionsverlust geschlossen werden (F005-QA-002).
- `zuordnungen/{id}`: `create` prüft jetzt zusätzlich den Typ von `lehrerId`/
  `schuelerId` (müssen Strings sein).
- `config/{id}`: `write` wurde in `create`/`update`/`delete` aufgeteilt.
  `config/preise` war zuvor durch `id == 'preise'` **ohne jede Bedingung**
  beschreibbar (F005-QA-004) – jetzt mit `isValidPreise()` (vier numerische,
  nicht-negative Felder) abgesichert. `delete` ist für beide Config-Dokumente
  jetzt `false`, da `utils/db.js` (`setAdminPin`, `setPreise`) niemals löscht
  und ein Löschen Login bzw. Preisberechnung lahmlegen würde (F005-QA-002).
- Reads (`F005-QA-001`) wurden **nicht** weiter eingeschränkt – Begründung
  siehe Abschnitt "Nicht lösbare Punkte".
- `standorte`, `schueler`, `stunden`, `eintraege` Delete-Regeln bleiben `true`,
  da diese von echten App-Funktionen (Admin/Standortleitung: Löschen von
  Standorten/Schülern/Stunden) aktiv genutzt werden (`utils/db.js`:
  `deleteStandort`, `deleteSchueler`, `deleteLehrer`, `deleteStandortleitung`,
  `deleteEintrag`) und ohne Auth nicht rollenspezifisch eingeschränkt werden
  können, ohne diese Funktionen zu brechen.

### `app/nutzer.jsx`
F005-QA-005: Die `laden()`-Funktion fiel bei einer Standortleitung **ohne**
gültige `standortId` in den `else`-Zweig, der eigentlich für Admins gedacht
war und ungefiltert alle Lehrer/Schüler/Standortleitungen/Standorte lud.
Fix: Dreiweg-Verzweigung `isAdmin` → `standort mit standortId` →
`standort ohne standortId` (sicherer Leerzustand, keine Daten geladen).

### `app/index.jsx` (Dashboard)
F005-QA-005: `getEintraege({ standortId: sid })` mit `sid == undefined`
führt in `utils/db.js` dazu, dass der `where("standortId", ...)`-Constraint
**übersprungen** wird (`if (filter.standortId) ...`) – die Funktion liefert
dann **alle** Einträge zurück. Fix: Guard, der bei fehlender `standortId`
keine Firestore-Anfrage mehr stellt und stattdessen leere Listen setzt.

### `app/stunden.jsx`
Identisches Muster wie `index.jsx` (`getEintraege({ standortId: ... })` mit
potenziell `undefined`). Gleicher Fix angewendet.

### `app/schueler.jsx`
F005-QA-005 (sekundärer Mechanismus): `all.filter(s => s.standortId ===
session.standortId)` hätte bei fehlender `session.standortId` auch Schüler
mit fehlendem `standortId`-Feld (Legacy-Daten) zurückgegeben
(`undefined === undefined`). Fix: expliziter Guard, leere Liste bei
fehlender `standortId`.

### `app/scan.jsx`
F005-QA-005: `alle.filter(s => !session?.standortId || s.standortId ===
session.standortId)` lieferte bei fehlender `standortId` **explizit alle**
Schüler zurück (`!session?.standortId` wertet zu `true`). Dies ist der
deutlichste Fall des QA-Befunds. Fix: Liste ist bei fehlender `standortId`
jetzt leer statt vollständig.

### `docs/NFC_MANUAL_TESTPLAN.md` (neu)
F005-QA-006: Es existierte keine dedizierte manuelle Testanleitung für NFC.
Da am NFC-Workflow selbst nichts geändert werden durfte, wurde nur diese
Anleitung ergänzt (6 Testfälle + Debug-Hinweise), keine Code-Änderung.

### `docs/FIRESTORE_RULES_TESTPLAN.md` (neu)
F005-QA-008: Dokumentiert, warum ein Emulator-Testlauf in dieser Umgebung
nicht ausführbar war (kein `firebase.json`, keine Firebase CLI installiert),
und liefert eine minimale Testfall-Tabelle für QA/Coordinator zur manuellen
bzw. lokalen Emulator-Verifikation.

### Nicht geänderte, aber geprüfte Dateien
- `utils/db.js`: Root Cause für den `index.jsx`/`stunden.jsx`-Fallback
  identifiziert (`getEintraege` überspringt Filter bei falsy Werten), aber
  **nicht** verändert – diese Funktion wird auch absichtlich ohne
  `standortId`-Filter für Admin-Ansichten verwendet; eine Änderung dort hätte
  das Verhalten für mehrere Aufrufer gleichzeitig verändert (Risiko eines
  unnötigen Refactorings). Stattdessen wurde an jeder betroffenen
  Aufrufstelle (Screen-Ebene) gezielt gefixt.
- `utils/permissions.js`: Keine Änderung erforderlich – Route-Guards und
  Capability-Funktionen sind clientseitige Komfortfunktionen und nicht Teil
  der QA-Befunde.
- `package.json`: Keine Test-/Emulator-Tooling-Abhängigkeiten ergänzt
  (Scope-Vorgabe: "kein vollständiges Testframework").

## Bearbeitung je QA-Befund

### F005-QA-001 – Firestore Reads offen
**Nicht weiter schließbar in dieser Architektur.** Reads müssen für `lehrer`,
`schueler`, `standorte` offen bleiben, weil der PIN-Login clientseitig per
Dokumentenvergleich erfolgt (`getAdminPin`, `getLehrerFuerNamePin` lesen die
Collections ohne Auth-Kontext). Reads für `stunden`/`eintraege`/
`arbeitszeiten`/`zuordnungen`/`aenderungslog` müssen offen bleiben, da alle
Dashboard-/Stunden-/Log-Screens ohne `request.auth` keine serverseitige
Rollenprüfung durchführen können. Eine echte Einschränkung ist erst mit
Firebase-Auth-Migration möglich (explizit nicht Teil dieses Sprints).

### F005-QA-002 – Firestore Deletes offen
**Teilweise geschlossen.** `arbeitszeiten` und `config/*` Deletes wurden auf
`false` gesetzt, da die App diese Operationen nie ausführt (siehe oben).
`standorte`, `lehrer`, `schueler`, `stunden`, `eintraege`, `zuordnungen`
bleiben offen, da reale, genutzte App-Features (Admin-/Standortleitung-
Löschfunktionen, Zuordnung entfernen) ohne Auth nicht rollenspezifisch
beschränkt werden können.

### F005-QA-003 – Writes ohne echte Benutzerberechtigung
**Strukturvalidierung verbessert, echte Berechtigung weiterhin nicht
durchsetzbar.** `rolle`/`pin` werden jetzt bei `lehrer` und `arbeitszeiten`
gegen erlaubte Werte/Typen geprüft, `zuordnungen`-IDs werden typgeprüft. Es
wird **nicht** behauptet, dass damit echte Benutzerberechtigung implementiert
wurde – ohne `request.auth` kann nicht geprüft werden, *wer* schreibt, nur
*was* geschrieben wird.

### F005-QA-004 – `config/preise` unzureichend geschützt
**Geschlossen.** `config/preise` war zuvor durch `id == 'preise'` ohne jede
weitere Bedingung beschreibbar. Jetzt: `isValidPreise()` erfordert vier
numerische, nicht-negative Felder. Delete zusätzlich auf `false` gesetzt.

### F005-QA-005 – Standortleitung ohne `standortId`
**Geschlossen** in allen geprüften Screens: `app/nutzer.jsx` (bestätigter
Befund), `app/index.jsx`, `app/stunden.jsx`, `app/schueler.jsx`,
`app/scan.jsx`. Alle fünf Screens laden bei fehlender `standortId` jetzt
einen sicheren Leerzustand statt in einen Admin-/Vollzugriffspfad zu fallen.

### F005-QA-006 – NFC nicht abgenommen
**Keine Code-Änderung** (wie vorgegeben). `docs/NFC_MANUAL_TESTPLAN.md`
ergänzt mit 6 konkreten Testfällen und Debug-Hinweisen für die anstehende
Hardware-Abnahme.

### F005-QA-007 – Keine automatisierten Regressionstests
Nicht in der expliziten "Zu bearbeitende QA-Befunde"-Liste des Case-Files
enthalten, aber per Definition of Done zu bewerten: **Bewusst nicht
bearbeitet.** Der Case-File schließt ein "vollständiges Testframework"
explizit aus, sofern nicht minimal/notwendig. Ein minimaler Testaufbau wäre
ohne CI-Anbindung und ohne vorhandene Test-Infrastruktur (`package.json`
enthält keine Test-Runner-Abhängigkeit) ein Architektur-Eingriff, der über
diesen Sprint hinausgeht. Empfehlung: eigener Sprint mit Coordinator-
Entscheidung zur Test-Strategie.

### F005-QA-008 – Firestore Rules nicht per Emulator nachgewiesen
**Nicht ausführbar in dieser Umgebung** (kein `firebase.json`, keine Firebase
CLI). Dokumentiert in `docs/FIRESTORE_RULES_TESTPLAN.md` inkl. einer
Testfall-Tabelle (9 Fälle) zur manuellen Nachvollziehung durch QA/Coordinator
mit lokal installierter Firebase CLI.

## Nicht lösbare Punkte

1. **Echte serverseitige Rollenprüfung (Reads/Writes/Deletes nach Identität)**
   ist ohne Firebase-Auth-Migration architektonisch nicht möglich. Dies
   betrifft F005-QA-001, -002 (teilweise) und -003 grundlegend.
2. **NFC-Hardwareabnahme** kann nicht in dieser Entwicklungsumgebung
   durchgeführt werden (kein physisches Android-Gerät).
3. **Firestore-Emulator-Tests** können nicht in dieser Umgebung ausgeführt
   werden (fehlende Firebase-CLI-Installation/-Konfiguration).

## Risiken

| Risiko | Status nach F006 |
|---|---|
| Firestore Reads offen | Unverändert kritisch – architekturbedingt (siehe oben) |
| Firestore Deletes offen | Reduziert: `arbeitszeiten`/`config` geschlossen, produktionsrelevante Nutzdaten-Deletes bleiben offen (App-Feature) |
| Writes ohne echte Benutzerberechtigung | Unverändert kritisch, Strukturprüfung verbessert |
| `config/preise` unzureichend geschützt | Geschlossen |
| Standortleitung-Fallback ohne `standortId` | Geschlossen (5 Screens) |
| NFC nicht auf Hardware abgenommen | Unverändert offen |
| Keine automatisierten Regressionstests | Unverändert offen (bewusst außerhalb Scope) |
| Firestore Rules nicht per Emulator nachgewiesen | Unverändert offen, jetzt mit Testplan dokumentiert |

## Tests / nicht durchführbare Tests

- **Statisch geprüft:** Alle geänderten `.jsx`-Dateien wurden gelesen und auf
  Konsistenz der neuen Guard-Bedingungen geprüft (kein automatisierter
  Lint-/Test-Lauf in dieser Umgebung verfügbar).
- **Nicht durchführbar:** Firestore-Rules-Emulator-Tests (siehe
  `docs/FIRESTORE_RULES_TESTPLAN.md`), NFC-Hardwaretests (siehe
  `docs/NFC_MANUAL_TESTPLAN.md`), App-Build/Smoke-Test (kein Expo-Gerät/
  Simulator in dieser Umgebung verfügbar).

## Empfehlung an QA

1. `config/preise`-Schreibversuche mit ungültigem Schema/Delete gegen die
   neuen Rules verifizieren (Testfälle 1–4 in `FIRESTORE_RULES_TESTPLAN.md`).
2. Alle 5 Standortleitung-Screens (`nutzer`, `index`, `stunden`, `schueler`,
   `scan`) mit einem Test-Account ohne `standortId` durchspielen und
   bestätigen, dass keine Daten anderer Standorte sichtbar sind.
3. NFC-Testplan auf echter Hardware abarbeiten und Ergebnis dokumentieren.

## Empfehlung an Coordinator

Go-live bleibt **nicht freigegeben**, solange F005-QA-001/-003 (echte
Benutzerberechtigung) ungelöst sind – das ist ohne Auth-Migration so
gewollt und in diesem Sprint bewusst nicht angegangen worden. Empfehlung:
gesonderte Entscheidung treffen, ob (a) eine Firebase-Auth-Migration als
eigener Sprint angesetzt wird oder (b) das Produkt mit dokumentiertem
Restrisiko ("trusted client") live geht. Die in diesem Sprint geschlossenen
Lücken (config/preise, unnötige Deletes, Standortleitung-Fallback) sollten
als abgeschlossen gewertet werden.

## Status
Nachbesserung erforderlich (architekturbedingte Restrisiken bestehen weiter)
