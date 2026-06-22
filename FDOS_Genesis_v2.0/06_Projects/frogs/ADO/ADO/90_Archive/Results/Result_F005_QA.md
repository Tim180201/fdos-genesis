# Result_F005_QA.md

# ADO – QA Bericht Sprint F005

Rolle: 🧪 QA  
Projekt: frogs. – Digitale Zeiterfassung  
Sprint: F005 – Stabilisierung vor Go-live  
Arbeitsgrundlage:

- `NachhilfeZeit (5).zip`
- `ADO_frogs_v5.zip`
- Case File: `ADO/01_Cases/ADO_Case_F005_QA.md`
- Development-Ergebnis: `NachhilfeZeit/ADO/02_Results/Result_F004_Dev.md`

---

## 1. Zusammenfassung

Der QA-Sprint F005 wurde ausschließlich auf Basis der bereitgestellten ZIP-Dateien durchgeführt.

Geprüft wurden die laut Case File und Development-Ergebnis F004 geänderten Bereiche:

- `firestore.rules`
- `utils/db.js`
- `app/index.jsx`
- `app/schueler.jsx`
- `app/nutzer.jsx`
- `app/stunden.jsx`
- `app/scan.jsx`

Die Prüfung erfolgte als statische Code- und Dokumentenprüfung. Ein vollständiger funktionaler Testlauf auf Gerät, ein Firestore-Emulator-Test sowie ein NFC-Hardwaretest konnten aus der ZIP heraus nicht nachgewiesen werden.

**QA-Gesamtergebnis:** Die Änderungen aus F004 verbessern die Situation gegenüber F003 teilweise, reichen aber nicht für eine Go-live-Freigabe aus.

Hauptgründe:

1. Firestore Rules sind weiterhin nicht serverseitig rollenbasiert abgesichert.
2. Lesezugriffe sind weiterhin global offen.
3. Delete-Zugriffe sind weiterhin global offen.
4. Schreibzugriffe sind nur strukturell validiert, aber nicht an eine echte Benutzeridentität gebunden.
5. NFC wurde in F004 nicht geändert und bleibt ohne Android-Gerätetest nicht freigabefähig.
6. Automatisierte Regressionstests und Firestore-Rules-Emulatortests sind nicht vorhanden bzw. nicht nachgewiesen.

**Freigabestatus:** Nicht freigegeben.

---

## 2. Prüfumfang

### 2.1 Geprüfte Dokumente

- `ADO/01_Cases/ADO_Case_F005_QA.md`
- `NachhilfeZeit/ADO/02_Results/Result_F004_Dev.md`
- `ADO/Results/Result_F003_QA.md`
- `ADO/Project_Status.md`

### 2.2 Geprüfte Projektdateien

- `firestore.rules`
- `utils/db.js`
- `utils/permissions.js`
- `app/index.jsx`
- `app/schueler.jsx`
- `app/nutzer.jsx`
- `app/stunden.jsx`
- `app/scan.jsx`
- `package.json`

### 2.3 Nicht durchführbare Prüfungen innerhalb der ZIP

Folgende Prüfungen konnten nicht belastbar durchgeführt werden:

- Firestore Rules Emulator-Test
- Firestore Rules Deploy-Test
- Android-NFC-Gerätetest
- Expo-App-Laufzeittest
- End-to-End-Test mit echten Rollen und Testdaten
- automatisierter Regressionstestlauf

Grund: Das Projekt enthält keine entsprechenden Testskripte. `package.json` definiert nur `start`, `android` und `build`.

---

## 3. Testergebnis nach Aufgaben

## 3.1 Firestore Rules prüfen

### Ergebnis

**Nicht bestanden.**

Die F004-Änderung ersetzt pauschal offene Schreibregeln teilweise durch Strukturvalidierungen. Das ist eine Verbesserung gegenüber vollständig offenen Writes, erfüllt aber nicht die Go-live-Anforderung an rollenbasierte Datenabsicherung.

### Positive Feststellungen

- Mehrere Collections haben jetzt Validierungsfunktionen für Pflichtfelder und Datentypen.
- `aenderungslog` ist append-only umgesetzt: `create` erlaubt, `update` und `delete` verboten.
- `arbeitszeiten` validiert die Rolle als Datenwert und erlaubt beim Create nur `admin` und `standort`.
- `stunden` verhindert beim Update eine Änderung von `lehrerId`.

### Blockierende Feststellungen

#### Fehler F005-QA-001 – Alle Lesezugriffe sind weiterhin offen

**Beschreibung:**  
In den Firestore Rules steht für zentrale Collections weiterhin `allow read: if true;`.

Betroffen:

- `standorte`
- `lehrer`
- `schueler`
- `stunden`
- `eintraege`
- `arbeitszeiten`
- `zuordnungen`
- `config`
- `aenderungslog`

**Reproduktion:**

1. `firestore.rules` öffnen.
2. Die Match-Blöcke der oben genannten Collections prüfen.
3. Feststellen, dass `allow read: if true;` gesetzt ist.

**Erwartetes Verhalten:**  
Lesezugriffe werden serverseitig anhand einer verifizierten Benutzeridentität und Rolle eingeschränkt.

**Tatsächliches Verhalten:**  
Jeder Client mit Projektzugriff kann grundsätzlich Lesezugriffe ausführen, sofern die Firebase-Projektkonfiguration erreichbar ist.

**Auswirkung:**  
Personenbezogene Daten von Schülern, Lehrern, Standortleitungen, Unterrichtsstunden und Arbeitszeiten sind serverseitig nicht rollenbasiert geschützt.

**Kritikalität:** Kritisch

---

#### Fehler F005-QA-002 – Delete-Zugriffe sind weiterhin offen

**Beschreibung:**  
Mehrere produktionsrelevante Collections erlauben weiterhin `allow delete: if true;`.

Betroffen:

- `standorte`
- `lehrer`
- `schueler`
- `stunden`
- `eintraege`
- `arbeitszeiten`
- `zuordnungen`

**Reproduktion:**

1. `firestore.rules` öffnen.
2. Die genannten Collections prüfen.
3. `allow delete: if true;` identifizieren.

**Erwartetes Verhalten:**  
Löschrechte sind serverseitig auf berechtigte Rollen beschränkt, insbesondere Administratoren bzw. definierte Standortleitungen im eigenen Standortkontext.

**Tatsächliches Verhalten:**  
Löschzugriffe sind nicht an eine echte Rolle oder Authentifizierung gebunden.

**Auswirkung:**  
Produktionsdaten können serverseitig nicht zuverlässig gegen unberechtigtes Löschen geschützt werden.

**Kritikalität:** Kritisch

---

#### Fehler F005-QA-003 – Schreibzugriffe prüfen Datenform, aber nicht Benutzerberechtigung

**Beschreibung:**  
Create- und Update-Regeln validieren überwiegend Feldstruktur, Datentypen und einzelne Werte. Sie prüfen jedoch nicht, ob der aktuelle Benutzer die Aktion ausführen darf.

**Reproduktion:**

1. `firestore.rules` öffnen.
2. Funktionen wie `validSchueler`, `validStundeCreate`, `validArbeitszeitCreate`, `validLehrerCreate` prüfen.
3. Feststellen, dass keine Prüfung auf `request.auth`, Custom Claims oder eine serverseitige Identität erfolgt.

**Erwartetes Verhalten:**  
Jede relevante Änderung wird serverseitig mit der tatsächlichen Rolle und Standortzuordnung des eingeloggten Nutzers abgeglichen.

**Tatsächliches Verhalten:**  
Ein Client muss nur eine formal gültige Datenstruktur senden.

**Auswirkung:**  
Rollenrechte bleiben sicherheitsrelevant im Frontend. Das ist für den Produktivbetrieb mit personenbezogenen Daten nicht ausreichend.

**Kritikalität:** Kritisch

---

#### Fehler F005-QA-004 – `config/preise` ist ohne Strukturvalidierung beschreibbar

**Beschreibung:**  
Im Match-Block `config/{id}` gilt:

```js
allow write: if (id == 'admin' && validString('pin', 20))
          || id == 'preise';
```

Damit ist `config/preise` ohne erkennbare Feld- oder Rollenvalidierung beschreibbar.

**Reproduktion:**

1. `firestore.rules` öffnen.
2. Match-Block `config/{id}` prüfen.
3. Feststellen, dass für `id == 'preise'` keine weitere Prüfung erfolgt.

**Erwartetes Verhalten:**  
Preis-/Konfigurationsdaten dürfen nur von berechtigten Rollen geändert werden und müssen strukturell validiert werden.

**Tatsächliches Verhalten:**  
`config/preise` wird pauschal erlaubt.

**Auswirkung:**  
Abrechnungsrelevante Konfiguration kann ohne serverseitige Berechtigungsprüfung verändert werden.

**Kritikalität:** Hoch

---

## 3.2 Rollenrechte prüfen

### Ergebnis

**Teilweise bestanden, aber nicht go-live-fähig.**

Die F004-Anpassungen verschieben mehrere Frontend-Abfragen näher an standortbezogene Query-Helper. Dadurch werden im normalen App-Fluss weniger vollständige Collections geladen. Das verbessert Datenschutz und Performance im Frontend.

### Positive Feststellungen

- `getSchuelerByStandort(standortId)` vorhanden.
- `getLehrerByStandort(standortId)` vorhanden.
- `getZuordnungenByStandort(standortId)` vorhanden.
- `app/index.jsx` nutzt für Standortleitungen standortbezogene Queries.
- `app/schueler.jsx` nutzt für Lehrer `getSchuelerFuerLehrer(session.id)` und für Standortleitungen `getSchuelerByStandort(session.standortId)`.
- `app/nutzer.jsx` nutzt für Standortleitungen standortbezogene Queries.
- `app/stunden.jsx` filtert Lehrer nach eigener ID und Standortleitungen nach `standortId`.
- `app/scan.jsx` lädt manuelle Schülerauswahl rollenbezogen.

### Einschränkung

Diese Verbesserungen gelten nur für den vorgesehenen App-Fluss. Da Firestore serverseitig weiterhin offene Reads und Deletes erlaubt, sind Rollenrechte nicht vollständig abgesichert.

### Bewertung nach Rolle

#### Administrator

- Darf fachlich Vollzugriff haben.
- App-seitig bleibt Vollzugriff erhalten.
- Keine blockierende Regression für Admin aus statischer Prüfung erkennbar.

**Bewertung:** Plausibel, Gerätetest/Regressionstest offen.

#### Standortleitung

- Standortbezogene Ladepfade wurden in mehreren Screens verbessert.
- Standortleitungen erhalten im Nutzerbereich nur die Tabs `Schüler` und `Lehrer`.
- Daten werden über `standortId` geladen.

**Offenes Risiko:** Wenn `session.standortId` fehlt oder inkonsistent ist, werden im Nutzerbereich über den Fallback-Pfad Admin-ähnliche Vollabfragen ausgeführt. Das sollte durch einen harten Guard verhindert werden.

**Bewertung:** Frontend-seitig verbessert, serverseitig nicht ausreichend abgesichert.

#### Lehrer

- Schülerliste über `getSchuelerFuerLehrer(session.id)` ist fachlich korrekt.
- Stundenliste nutzt `getEintraege({ lehrerId: session.id })`.
- Scan-Screen lädt Schüler über `getSchuelerFuerLehrer(session.id)`.

**Offenes Risiko:** Firestore erlaubt weiterhin direkte Reads auf `schueler`, `stunden`, `zuordnungen` und weitere Collections.

**Bewertung:** App-Fluss plausibel, serverseitig nicht abgesichert.

---

## 3.3 Regression aller geänderten Screens

### Ergebnis

**Statisch teilweise bestanden, funktional nicht vollständig prüfbar.**

### `app/index.jsx`

**Geprüft:** Dashboard-Queries nach Rolle.

**Feststellung:**

- Admin lädt alle relevanten Daten.
- Standortleitung lädt Einträge, Lehrer und Schüler standortbezogen.
- Lehrer lädt eigene Einträge und zugeordnete Schüler.

**Bewertung:** Statisch plausibel.

### `app/schueler.jsx`

**Geprüft:** Schülerliste und Anlage-/Bearbeitungsrechte.

**Feststellung:**

- Lehrer laden nur zugeordnete Schüler.
- Standortleitungen laden Schüler nach eigenem Standort.
- Admin lädt alle Schüler.
- Erstellen/Bearbeiten ist über Permission-Helper eingeschränkt.

**Bewertung:** Statisch plausibel.

### `app/nutzer.jsx`

**Geprüft:** Nutzerverwaltung für Admin und Standortleitung.

**Feststellung:**

- Standortleitung erhält reduzierte Tabs.
- Standortleitung lädt Lehrer, Schüler und Zuordnungen nach `standortId`.
- Admin lädt alle Verwaltungsdaten.

**Auffälligkeit:**

- Bei Standortleitung ohne `session.standortId` fällt `laden()` in den Vollabfrage-Zweig. Das ist ein Rollenrisiko bei defekter oder manipulierter Session.

**Kritikalität:** Hoch

**Bewertung:** Nachbesserung empfohlen.

### `app/stunden.jsx`

**Geprüft:** Stundenübersicht, Bearbeitung, Gruppenzuordnung.

**Feststellung:**

- Lehrer werden auf eigene Einträge eingeschränkt.
- Standortleitung wird nach `standortId` eingeschränkt.
- Schüler-/Lehrerlisten werden rollenabhängig geladen.

**Bewertung:** Statisch plausibel, funktionaler Regressionstest erforderlich.

### `app/scan.jsx`

**Geprüft:** Manuelle Schülerauswahl und Arbeitszeitpfade.

**Feststellung:**

- Lehrer laden Schüler über `getSchuelerFuerLehrer`.
- Standortleitung lädt Schüler über `getSchuelerByStandort`.
- Admin und Standortleitung nutzen eigene Arbeitszeit-Collection `arbeitszeiten`.
- NFC-Service wurde laut F004 nicht geändert.

**Bewertung:** Statisch plausibel, NFC- und Gerätetest offen.

---

## 3.4 NFC-Status bewerten

### Ergebnis

**Nicht freigabefähig.**

F004 hat laut Development-Bericht keine NFC-Featureentwicklung umgesetzt. Der NFC-Service und der NFC-Workflow wurden nicht verändert.

Damit bleiben die bereits aus F003 bekannten Pflichtprüfungen offen:

1. NFC-Scan bei geöffneter App.
2. NFC-Scan aus Cold Start / geschlossenem Zustand.
3. Start einer Schülerstunde per NFC.
4. Stop derselben Schülerstunde per zweitem NFC-Scan.
5. Verhalten bei unbekannter NFC-ID.
6. Verhalten bei doppelter NFC-ID.
7. Verhalten bei NFC-ID eines nicht zugeordneten Schülers.
8. Verhalten bei Standortleitung mit Schülern des eigenen Standorts.

Ohne Android-Hardwaretest darf NFC nicht als produktionsreif bewertet werden.

**Kritikalität:** Kritisch

---

## 3.5 Restrisiken

### R1 – Keine echte serverseitige Authentifizierung

Die App verwendet weiterhin PIN/AsyncStorage-Architektur. Ohne Firebase Auth oder vergleichbare serverseitig verifizierte Identität können Firestore Rules keine belastbaren Rollen- und Standortrechte erzwingen.

**Kritikalität:** Kritisch

### R2 – Offene Lese- und Löschrechte

Auch nach F004 bleiben zentrale Collections offen lesbar und löschbar.

**Kritikalität:** Kritisch

### R3 – Keine automatisierten Tests

Das Projekt enthält keine Testskripte. Regressionen können nicht automatisiert abgesichert werden.

**Kritikalität:** Hoch

### R4 – Firestore Rules nicht per Emulator nachgewiesen

Die Rules wurden statisch geprüft, aber nicht gegen realistische Testfälle im Emulator ausgeführt.

**Kritikalität:** Hoch

### R5 – NFC nicht auf Android-Hardware abgenommen

NFC ist ein zentraler App-Prozess. Ohne Hardwaretest ist keine Produktionsfreigabe möglich.

**Kritikalität:** Kritisch

### R6 – Legacy-Dokumente können an neuen Rules scheitern

Die neuen Strukturvalidierungen verlangen bestimmte Felder und Typen. Bestehende Daten könnten bei Updates blockiert werden, falls sie nicht kompatibel sind.

**Kritikalität:** Mittel

### R7 – Firestore-Indizes für neue Query-Kombinationen nicht nachgewiesen

Die neuen standortbezogenen Queries können zusätzliche Firestore-Indizes erfordern.

**Kritikalität:** Mittel

---

## 4. Kritikalität – Übersicht

| ID | Befund | Kritikalität | Status |
|---|---|---:|---|
| F005-QA-001 | Firestore Reads offen | Kritisch | Offen |
| F005-QA-002 | Firestore Deletes offen | Kritisch | Offen |
| F005-QA-003 | Writes ohne echte Benutzerberechtigung | Kritisch | Offen |
| F005-QA-004 | `config/preise` ohne Struktur-/Rollenprüfung beschreibbar | Hoch | Offen |
| F005-QA-005 | Standortleitung ohne `standortId` kann in Vollabfrage-Fallback laufen | Hoch | Offen |
| F005-QA-006 | NFC nicht per Android-Hardwaretest abgenommen | Kritisch | Offen |
| F005-QA-007 | Keine automatisierten Regressionstests | Hoch | Offen |
| F005-QA-008 | Firestore Rules nicht per Emulator nachgewiesen | Hoch | Offen |

---

## 5. Empfehlung

### QA-Empfehlung

**Nachbesserung erforderlich.**

Die App sollte in diesem Stand nicht produktiv mit echten Kunden-, Schüler-, Mitarbeiter- oder Arbeitszeitdaten betrieben werden.

### Mindestanforderungen vor erneuter QA-Prüfung

1. Firestore Rules müssen serverseitige Rollenrechte durchsetzen.
2. Lesezugriffe dürfen nicht pauschal offen sein.
3. Delete-Zugriffe dürfen nicht pauschal offen sein.
4. `config/preise` muss rollen- und strukturvalidiert werden.
5. Standortleitungs-Flows müssen bei fehlender `standortId` hart blockieren statt in Vollzugriff-Fallbacks zu laufen.
6. Firestore Rules müssen im Emulator mit Rollen- und Negativtests geprüft werden.
7. NFC muss auf Android-Hardware getestet werden.
8. Die geänderten Screens müssen mit Admin, Standortleitung und Lehrer funktional getestet werden.

---

## 6. Go-live-Empfehlung

**Kein Go-live empfohlen.**

Begründung:

- Die wichtigsten P1-Risiken aus F003 sind reduziert, aber nicht geschlossen.
- Serverseitige Datenisolation ist weiterhin nicht belastbar gegeben.
- NFC als Kernfunktion ist nicht abgenommen.
- Es gibt keinen nachgewiesenen Regressionstestlauf.

Ein eingeschränkter Pilotbetrieb wäre aus QA-Sicht nur vertretbar, wenn der Coordinator und der Kunde die offenen Security- und NFC-Risiken ausdrücklich als Interim-Risiko akzeptieren. Diese Risikoakzeptanz wäre eine Projektentscheidung, keine QA-Freigabe.

---

## 7. Freigabestatus

**Nicht freigegeben.**

QA übergibt das Ergebnis an den 🧭 Coordinator.

Sprint F005 QA ist abgeschlossen.
