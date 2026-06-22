# Result_F010_QA.md

Rolle: 🧪 QA  
Projekt: frogs. – Digitale Zeiterfassung  
Sprint: F010 – QA-Abnahme Firebase-Auth-Migration  
Übergabe an: 🧭 Coordinator

---

## 1. Zusammenfassung

Der QA-Sprint F010 wurde ausschließlich auf Basis der bereitgestellten Dateien durchgeführt:

1. aktuelle frogs.-Projektdatei: `NachhilfeZeit (7).zip`
2. ADO-Datei: `ADO_frogs_v10.zip`

Geprüft wurde die in F009 umgesetzte Firebase-Auth-Migration sowie ihre Auswirkungen auf die bestehende App. Grundlage waren die Case File `ADO/01_Cases/ADO_Case_F010_QA.md`, das Architekturkonzept `Result_F008_Architect.md` und das Development-Ergebnis `Result_F009_Dev.md`.

Wichtige Ablageabweichung: `ADO/02_Results/Result_F009_Dev.md` ist in `ADO_frogs_v10.zip` am geforderten Pfad nicht vorhanden. Die Datei liegt jedoch in der Projekt-ZIP unter `NachhilfeZeit/ADO/02_Results/Result_F009_Dev.md` und wurde deshalb als Teil der bereitgestellten Arbeitsgrundlage berücksichtigt.

**QA-Gesamtergebnis:** Die Firebase-Auth-Migration reduziert die zentralen Security-Blocker aus F005 deutlich, ist aber nach statischer QA noch nicht go-live-fähig. Die wichtigsten Gründe sind fehlende Firestore-Rules-Emulatortests, weiterhin offene produktionskritische Migrationsvoraussetzungen, eine nicht vollständig angebundene Nutzerverwaltung, NFC-/Standortleitungsrisiken und verbleibende Datenzugriffsrisiken bei `config/admin` und `aenderungslog`.

**Freigabestatus:** Nicht freigegeben.

---

## 2. Geprüfte Bereiche

### 2.1 Geprüfte Dokumente

- `ADO/01_Cases/ADO_Case_F010_QA.md`
- `ADO/02_Results/Result_F008_Architect.md`
- `NachhilfeZeit/ADO/02_Results/Result_F009_Dev.md`
- `ADO/03_Project/Project_Status.md`
- `ADO/03_Project/GoLive_Checklist.md`
- `ADO/03_Project/Risk_Register.md`
- `docs/AUTH_MIGRATION_GUIDE.md`
- `docs/AUTH_MANUAL_TESTPLAN.md`
- `docs/FIRESTORE_RULES_TESTPLAN.md`
- `docs/NFC_MANUAL_TESTPLAN.md`
- `docs/PROJECT_STATUS.md`

### 2.2 Geprüfte Projektdateien

- `utils/db.js`
- `utils/auth.js`
- `utils/permissions.js`
- `utils/nfcService.js`
- `app/login.jsx`
- `app/_layout.jsx`
- `app/index.jsx`
- `app/scan.jsx`
- `app/schueler.jsx`
- `app/stunden.jsx`
- `app/nutzer.jsx`
- `app/export.jsx`
- `app/einstellungen.jsx`
- `firestore.rules`
- `package.json`

### 2.3 Nicht ausführbar innerhalb der ZIP-Prüfung

Folgende Prüfungen konnten nicht abschließend durchgeführt werden, da die ZIP keinen entsprechenden automatisierten Testaufbau und keine produktionsnahe Testumgebung enthält:

- Firebase Auth Login mit echten Test-Usern
- Session Restore nach App-Neustart auf Gerät
- Firestore Rules Emulator-Testlauf
- Firestore Rules Deploy-Test
- Android-NFC-Gerätetest
- Expo-/EAS-Laufzeittest
- End-to-End-Regression über echte Firebase-Testdaten

`package.json` enthält weiterhin nur `start`, `android` und `build`, aber kein Testskript.

---

## 3. Testergebnis nach Zielbereich

## 3.1 Firebase Auth Login aller Rollen

### Ergebnis

**Teilweise bestanden, nicht vollständig abnahmefähig.**

### Positive Feststellungen

- `utils/db.js` initialisiert und exportiert eine Firebase-Auth-Instanz.
- `utils/auth.js` nutzt `signInWithEmailAndPassword`.
- `app/login.jsx` verwendet E-Mail/Passwort statt PIN-Login.
- Nach Login wird `users/{uid}` geladen.
- Das Benutzerprofil wird validiert:
  - Profil muss existieren.
  - `active` muss `true` sein.
  - Rolle muss `admin`, `standort` oder `lehrer` sein.
  - Standortleitung benötigt `standortId`.
  - Lehrer benötigt `lehrerId`.
- Rollenabweichung zwischen ausgewählter Login-Rolle und Profil führt zu Logout und Login-Abbruch.

### Einschränkungen

- Es gibt keinen nachgewiesenen Test mit echten Firebase-Auth-Usern.
- Es gibt kein automatisiertes Auth-Testskript.
- Der erste Admin muss weiterhin manuell gebootstrapped werden.
- Ohne korrekt migrierte `users/{uid}`-Profile ist kein Login möglich.

### Bewertung

Die Implementierung folgt grundsätzlich dem Architekturziel aus F008. Die technische Abnahme bleibt aber ohne echte Test-User und ohne Testprotokoll offen.

---

## 3.2 Session-Wiederherstellung

### Ergebnis

**Plausibel umgesetzt, aber nicht vollständig verifiziert.**

### Positive Feststellungen

- `loadSession()` wartet auf Firebase Auth State.
- Ohne Auth User wird der lokale Session-Cache entfernt.
- Bei vorhandenem Auth User wird das User-Profil neu aus Firestore geladen.
- Die Session wird aus Auth User und Firestore-Profil neu aufgebaut.
- AsyncStorage wird damit nur noch als Cache verwendet, nicht mehr als primäre Sicherheitsquelle.

### Einschränkungen

- Ein echter App-Neustart mit Firebase Auth Persistence wurde nicht auf Gerät getestet.
- Ob `initializeAuth` mit React-Native-Persistence in der konkreten Expo-/Firebase-Version auf allen Zielgeräten fehlerfrei arbeitet, ist nicht durch einen Laufzeittest nachgewiesen.

### Bewertung

Die frühere AsyncStorage-Sicherheitslücke ist konzeptionell reduziert. Für eine Freigabe fehlt ein reproduzierbarer Gerätetest.

---

## 3.3 Logout

### Ergebnis

**Plausibel umgesetzt, aber Gerätetest offen.**

### Positive Feststellungen

- `clearSession()` entfernt den lokalen Session-Cache.
- `clearSession()` ruft Firebase Auth `signOut()` auf.
- `_layout.jsx` stoppt beim Logout den NFC-Listener.
- Session-Referenzen werden zurückgesetzt.

### Einschränkungen

- Kein End-to-End-Testnachweis: Login → Logout → App-Neustart → kein Zugriff ohne erneuten Login.
- Kein Testnachweis für Logout während aktivem NFC-Listener auf Android-Hardware.

---

## 3.4 Firestore Rules

### Ergebnis

**Deutlich verbessert, aber nicht go-live-abgenommen.**

### Positive Feststellungen

Die F005-Blocker wurden in der Rules-Datei teilweise adressiert:

- zentrale Regeln nutzen jetzt `request.auth`.
- Rollen werden über `users/{uid}` geprüft.
- `active == true` wird berücksichtigt.
- Standortgrenzen werden über `standortId` geprüft.
- Lehrerzugriffe werden über `lehrerId` und `visibleForLehrerIds` eingeschränkt.
- Nicht authentifizierte Zugriffe auf zentrale Fachcollections sind nicht mehr pauschal erlaubt.
- Deletes sind stark eingeschränkt, z. B. `arbeitszeiten` nicht löschbar.
- `config/preise` wird strukturell validiert und nur Admins dürfen schreiben.

### Einschränkungen

- Es gibt keinen Firestore-Rules-Emulator-Testlauf.
- Das Repository enthält laut `docs/FIRESTORE_RULES_TESTPLAN.md` weiterhin kein vollständig eingerichtetes Emulator-Setup.
- Die Rules sind komplex und müssen gegen reale Query-Formen getestet werden, da Firestore-Regeln bei Collection-Queries nur funktionieren, wenn Queries zu den Sicherheitsbedingungen passen.

### Bewertung

Die Hauptursache der F005-Security-Blocker wurde architektonisch adressiert. Eine Go-live-Freigabe ist ohne Rules-Testprotokoll nicht möglich.

---

## 3.5 Rollenrechte und Standortgrenzen

### Ergebnis

**Teilweise bestanden, Restrisiken offen.**

### Positive Feststellungen

- Admin behält globalen App-Zugriff.
- Standortleitungen werden in App-Queries überwiegend auf `session.standortId` begrenzt.
- Standortleitung ohne `standortId` lädt in mehreren Screens keine Daten.
- Lehrer laden Schüler über `getSchuelerFuerLehrer(session.id)`.
- Lehrerstunden werden über `lehrerId` gefiltert.
- Firestore Rules enthalten serverseitige Standort- und Lehrerprüfungen.

### Offene Einschränkungen

- Lehrer-Schüler-Zugriff hängt nach F009 zwingend an `schueler.visibleForLehrerIds`.
- Bestehende Daten müssen vor Go-live nachgezogen werden.
- Es gibt keinen Nachweis, dass alle Bestandsdaten migriert wurden.
- Es gibt keinen Testnachweis, dass Standortleitung A keine Daten von Standort B lesen, schreiben oder löschen kann.

---

## 3.6 Regression Hauptfunktionen

### Ergebnis

**Nicht vollständig bestanden, da keine ausführbare Regression nachgewiesen ist.**

Statisch geprüft wurden Dashboard, Schüler, Stunden, Arbeitszeiten, NFC, Export und Einstellungen.

### Dashboard

- Rollenbasierte Query-Pfade sind vorhanden.
- Admin lädt globale Daten.
- Standortleitung lädt Standortdaten.
- Lehrer lädt eigene Stunden und zugeordnete Schüler.
- Restrisiko: reale Firestore-Rules-Kompatibilität der Queries ist nicht automatisiert geprüft.

### Schüler

- Lehrerzugriff erfolgt über Zuordnungen und anschließend Einzeldokumente.
- Standortleitungen laden Standortschüler.
- Admin lädt alle Schüler.
- Restrisiko: bestehende Schüler ohne `visibleForLehrerIds` sind für Lehrer unter neuen Rules nicht lesbar.

### Stunden

- Stunden werden je Rolle gefiltert.
- Legacy-Collection `eintraege` bleibt als Fallback erhalten.
- Restrisiko: Rules-Kompatibilität mit allen bestehenden Query-Kombinationen ist nicht nachgewiesen.

### Arbeitszeiten

- Admin und Standortleitung können laut UI eigene Arbeitszeit starten/stoppen.
- Rules erlauben Create/Update für Admin und Standortleitung.
- Lehrer erhalten keine Arbeitszeiterfassung im UI.
- Restrisiko: keine End-to-End-Prüfung mit echten Auth-UIDs und vorhandenen Bestandsdaten.

### Export

- Export ist weiterhin nur Admins erlaubt.
- Export lädt globale Daten und setzt Eintragsstatus auf `exportiert`.
- Restrisiko: keine Prüfung mit produktionsnahen Datenmengen und neuen Rules.

### Dashboard/Navigation

- Route Guards sind weiterhin vorhanden.
- Nicht erlaubte Routen werden appseitig blockiert.
- Server-Sicherheit darf dennoch nur über Firestore Rules bewertet werden.

---

## 4. Gefundene Fehler

## F010-QA-001 – Firestore Rules nicht automatisiert oder per Emulator nachgewiesen

**Beschreibung:**  
Die Rules wurden stark erweitert, aber es gibt keinen automatisierten Firestore-Rules-Testlauf und kein eingerichtetes Emulator-Testframework im Repository. Das Development-Ergebnis dokumentiert selbst, dass die Rules in dieser Umgebung nicht im Emulator validiert wurden.

**Reproduktion:**

1. `package.json` prüfen.
2. Feststellen, dass kein Testskript vorhanden ist.
3. `docs/FIRESTORE_RULES_TESTPLAN.md` prüfen.
4. Feststellen, dass dort ein fehlendes vollständiges Emulator-Setup dokumentiert ist.
5. `Result_F009_Dev.md` prüfen.
6. Feststellen, dass Rules nicht automatisiert im Emulator validiert wurden.

**Erwartetes Verhalten:**  
Vor Go-live existiert ein reproduzierbarer Rules-Testnachweis für Auth, Rollen, Standortgrenzen, Reads, Writes und Deletes.

**Tatsächliches Verhalten:**  
Es liegt nur eine statische Rules-Implementierung und eine manuelle Testanleitung vor.

**Auswirkung:**  
Security- und Berechtigungsregeln können in produktionsnahen Query-Situationen unerwartet zu viel erlauben oder legitime App-Funktionen blockieren.

**Kritikalität:** Hoch

---

## F010-QA-002 – Nutzerverwaltung erstellt keine Firebase-Auth-User und keine `users/{uid}`-Profile

**Beschreibung:**  
Die bestehende Nutzerverwaltung (`app/nutzer.jsx`) legt weiterhin Lehrer und Standortleitungen in der Fachcollection `lehrer` an und pflegt PIN-Felder. Die F009-Migration erwartet jedoch für Login und Rules ein Firebase-Auth-Konto sowie ein `users/{uid}`-Profil. Eine automatische oder geführte Erstellung dieser Auth-Identitäten aus der App ist nicht umgesetzt.

**Reproduktion:**

1. `app/nutzer.jsx` prüfen.
2. Einen neuen Lehrer oder eine Standortleitung anlegen.
3. Feststellen, dass Fachdatensätze mit `pin`, `standortId` und Rolle erstellt werden.
4. `utils/auth.js` prüfen.
5. Feststellen, dass Login ausschließlich über Firebase Auth und `users/{uid}` erfolgt.
6. `Result_F009_Dev.md` und `docs/AUTH_MIGRATION_GUIDE.md` prüfen.
7. Feststellen, dass Auth-User und Profile manuell gebootstrapped werden müssen.

**Erwartetes Verhalten:**  
Ein im Produkt angelegter Lehrer oder eine Standortleitung kann nach Anlage produktiv einloggen oder der Workflow verhindert klar eine unvollständige Benutzeranlage.

**Tatsächliches Verhalten:**  
Die App kann fachliche Nutzer anlegen, die ohne manuelle Zusatzmigration nicht einloggen können.

**Auswirkung:**  
Produktive Nutzerverwaltung ist nach Auth-Migration nicht vollständig funktionsfähig. Neue Mitarbeitende/Lehrkräfte können nicht durchgängig über die App in Betrieb genommen werden.

**Kritikalität:** Hoch

---

## F010-QA-003 – Standortleitung sieht im Scan-Screen NFC-Erfassung, globaler NFC-Listener wird aber nur für Lehrer aktiviert

**Beschreibung:**  
`utils/permissions.js` erlaubt die Route `scan` für Admin, Standortleitung und Lehrer. Der Scan-Screen zeigt für Standortleitungen eine Schüler-NFC-Erfassung. Gleichzeitig liefert `canUseNfc()` nur für `lehrer` `true`. `_layout.jsx` initialisiert den globalen NFC-Listener nur bei `canUseNfc(session.rolle)`.

**Reproduktion:**

1. `utils/permissions.js` prüfen.
2. Feststellen: `canUseNfc = (r) => r === "lehrer"`.
3. `app/_layout.jsx` prüfen.
4. Feststellen: NFC-Setup erfolgt nur, wenn `canUseNfc(session.rolle)` true ist.
5. `app/scan.jsx` prüfen.
6. Feststellen: Standortleitungen sehen im UI einen NFC-Ring und den Hinweis „Schüler-Karte scannen“.

**Erwartetes Verhalten:**  
Wenn Standortleitungen Schüler per NFC erfassen dürfen, muss der NFC-Listener für Standortleitungen aktiv sein. Wenn sie es nicht dürfen, darf das UI keine NFC-Erfassung suggerieren.

**Tatsächliches Verhalten:**  
UI und Listener-Berechtigung sind inkonsistent.

**Auswirkung:**  
Standortleitungen können im produktiven Einsatz in einen scheinbar verfügbaren, aber technisch nicht aktiven NFC-Workflow laufen.

**Kritikalität:** Hoch

---

## F010-QA-004 – Standortleitungs-NFC würde Schülerzugriff voraussichtlich mit neuen Rules blockieren

**Beschreibung:**  
`utils/nfcService.js` lädt für Nicht-Lehrer im NFC-Suchpfad alle Schüler über `getSchueler()`. Unter den neuen Firestore Rules darf eine Standortleitung jedoch nicht ungefiltert alle Schüler lesen, sondern nur Schüler des eigenen Standorts. Der normale Scan-Screen lädt manuelle Schülerauswahl für Standortleitungen korrekt über `getSchuelerByStandort()`, der zentrale NFC-Service tut dies aber nicht.

**Reproduktion:**

1. `utils/nfcService.js` prüfen.
2. `findSchuelerByNfc()` aufrufen.
3. Feststellen: Für `session.rolle !== "lehrer"` wird `getSchueler()` verwendet.
4. `firestore.rules` prüfen.
5. Feststellen: Standortleitungen dürfen nur Schüler mit eigenem `standortId` lesen.

**Erwartetes Verhalten:**  
NFC-Schülersuche muss rollenbasiert laden: Lehrer über eigene Zuordnung, Standortleitung über eigenen Standort.

**Tatsächliches Verhalten:**  
Der Standortleitungs-NFC-Pfad verwendet eine globale Schülerabfrage.

**Auswirkung:**  
Sobald NFC für Standortleitungen aktiviert würde, droht ein Permission-Fehler oder ein leerer NFC-Treffer trotz gültigem Standort-Schüler.

**Kritikalität:** Hoch

---

## F010-QA-005 – Bestandsmigration `visibleForLehrerIds` ist go-live-kritisch, aber nicht nachgewiesen

**Beschreibung:**  
Lehrer dürfen Schüler unter den neuen Rules nur lesen, wenn ihre Lehrer-ID in `schueler.visibleForLehrerIds` enthalten ist. Neue Zuordnungen pflegen dieses Feld, Bestandsdaten müssen jedoch einmalig nachgezogen werden. Ein Nachweis der vollständigen Datenmigration liegt nicht vor.

**Reproduktion:**

1. `firestore.rules` prüfen.
2. Funktion `lehrerCanReadSchueler()` prüfen.
3. Feststellen: Zugriff hängt von `visibleForLehrerIds` ab.
4. `docs/AUTH_MIGRATION_GUIDE.md` prüfen.
5. Feststellen: Bestehende Zuordnungen müssen vor QA/Go-live nachgezogen werden.
6. Keine Migrationsausführung oder Ergebnisliste in der ZIP finden.

**Erwartetes Verhalten:**  
Vor Go-live ist dokumentiert, dass alle bestehenden Lehrer-Schüler-Zuordnungen in `visibleForLehrerIds` übertragen wurden.

**Tatsächliches Verhalten:**  
Es existiert nur eine Anleitung und ein Risiko-Hinweis.

**Auswirkung:**  
Lehrer können nach Go-live ihre zugeordneten Schüler möglicherweise nicht sehen und keine Unterrichtsstunden per NFC/manuell erfassen.

**Kritikalität:** Hoch

---

## F010-QA-006 – `config/admin` bleibt für alle aktiven Nutzer lesbar

**Beschreibung:**  
Die neuen Rules erlauben `config/{id}` für jeden aktiven Nutzer zu lesen. Damit ist auch `config/admin` für Lehrer und Standortleitungen lesbar. Auch wenn die Admin-PIN laut F009 nicht mehr primärer Authentifizierungspfad ist, bleibt ein historisches Geheimnis unnötig breit lesbar.

**Reproduktion:**

1. `firestore.rules` prüfen.
2. `match /config/{id}` öffnen.
3. Feststellen: `allow read: if isActive();`.
4. `utils/db.js` prüfen.
5. Feststellen: `getAdminPin()` und `setAdminPin()` existieren weiterhin als Legacy-Funktionen.

**Erwartetes Verhalten:**  
`config/admin` ist entweder nicht mehr vorhanden, nur für Admin lesbar oder mindestens getrennt von allgemein lesbaren Konfigurationsdaten abgesichert.

**Tatsächliches Verhalten:**  
Jeder aktive Nutzer darf die gesamte `config`-Collection lesen.

**Auswirkung:**  
Verbleibende Legacy-Geheimnisse können unnötig offengelegt werden. Das ist kein vollständiger Auth-Bypass mehr, aber ein vermeidbares Security-Restrisiko.

**Kritikalität:** Mittel

---

## F010-QA-007 – `aenderungslog` ist für alle aktiven Nutzer global lesbar

**Beschreibung:**  
Die Rules erlauben `aenderungslog` für jeden aktiven Nutzer zu lesen. Änderungslogs können sensible Informationen über Unterrichtsstunden, Änderungen, Namen, Gründe und interne Abläufe enthalten.

**Reproduktion:**

1. `firestore.rules` prüfen.
2. `match /aenderungslog/{id}` öffnen.
3. Feststellen: `allow read: if isActive();`.
4. `utils/db.js` prüfen.
5. `updateEintragManuell()` erzeugt Logs mit `eintragId`, `geaendertVon`, `alt`, `neu` und `grund`.

**Erwartetes Verhalten:**  
Admin darf alle Logs lesen; Standortleitungen nur standortbezogene Logs; Lehrer nur eigene bzw. relevante Logs, sofern fachlich vorgesehen.

**Tatsächliches Verhalten:**  
Alle aktiven Nutzer können alle Logs lesen.

**Auswirkung:**  
Standort- und Rollenabgrenzung wird für Änderungsprotokolle nicht eingehalten.

**Kritikalität:** Mittel

---

## F010-QA-008 – ADO-Ergebnis F009 fehlt im erwarteten ADO-Pfad

**Beschreibung:**  
Die Sprintanweisung verlangt zusätzlich `ADO/02_Results/Result_F009_Dev.md`. In `ADO_frogs_v10.zip` ist diese Datei nicht unter diesem Pfad vorhanden. Sie liegt nur in der Projekt-ZIP unter `NachhilfeZeit/ADO/02_Results/Result_F009_Dev.md`.

**Reproduktion:**

1. `ADO_frogs_v10.zip` öffnen.
2. `ADO/02_Results/Result_F009_Dev.md` suchen.
3. Feststellen: Datei fehlt.
4. `NachhilfeZeit (7).zip` öffnen.
5. `NachhilfeZeit/ADO/02_Results/Result_F009_Dev.md` finden.

**Erwartetes Verhalten:**  
Alle in der Case File referenzierten ADO-Ergebnisse liegen im ADO-Projektarchiv am erwarteten Pfad.

**Tatsächliches Verhalten:**  
Das F009-Ergebnis liegt nur in der Projekt-ZIP.

**Auswirkung:**  
Die Projekthistorie ist im ADO-ZIP nicht vollständig konsistent.

**Kritikalität:** Niedrig

---

## 5. Bewertung der F005-Go-live-Blocker

| F005-Blocker | Status nach F009/F010-QA | Bewertung |
|---|---|---|
| Offene Firestore Reads | Größtenteils reduziert durch Auth + Rollenprofile | Teilweise geschlossen |
| Offene Deletes | Deutlich eingeschränkt | Teilweise geschlossen |
| Writes nur strukturell, nicht rollenbasiert | Rollen-/Standortprüfung in Rules ergänzt | Teilweise geschlossen |
| `config/preise` ungeschützt | Admin-only + Strukturvalidierung umgesetzt | Geschlossen |
| Keine belastbare serverseitige Identität | Firebase Auth + `users/{uid}` eingeführt | Architekturblocker reduziert |
| NFC nicht auf Gerät verifiziert | Weiterhin kein Android-Gerätenachweis | Offen |
| Keine automatisierten Regressionstests | Weiterhin keine Testskripte | Offen |
| Keine Firestore-Rules-Emulatortests | Weiterhin nicht durchgeführt | Offen |

**QA-Bewertung:** Die früheren Security-Blocker sind technisch wesentlich reduziert, aber nicht vollständig abnahmefähig geschlossen, weil Testnachweise, Datenmigration und einzelne Zugriffslücken fehlen.

---

## 6. Restrisiken

### Hoch

- Firestore Rules sind nicht emulatorgetestet.
- Bestehende Datenmigration für `users/{uid}` und `visibleForLehrerIds` ist nicht nachgewiesen.
- Neue App-Nutzer können ohne manuelle Auth-/Profilanlage nicht vollständig produktiv angelegt werden.
- NFC ist weiterhin nicht auf echter Android-Hardware abgenommen.
- Standortleitungs-NFC ist in UI/Permission/Query-Logik inkonsistent.

### Mittel

- `config/admin` bleibt für alle aktiven Nutzer lesbar.
- `aenderungslog` ist global für alle aktiven Nutzer lesbar.
- Legacy-PIN-Funktionen existieren weiterhin im Code.
- Query-/Rules-Kompatibilität für alle Screens ist nicht automatisiert nachgewiesen.
- Export wurde nicht mit echten Auth- und Rules-Bedingungen getestet.

### Niedrig

- ADO-Ablage von `Result_F009_Dev.md` ist inkonsistent.
- Root-Duplikate/Altlasten bestehen weiterhin im Repository, sind aber laut Dokumentation nicht aktive App-Dateien.

---

## 7. Empfehlung

**Nachbesserung erforderlich.**

Vor einer erneuten QA-Prüfung sollten mindestens folgende Punkte erledigt und nachgewiesen werden:

1. Firestore-Rules-Testlauf mit Emulator oder isoliertem Firebase-Testprojekt dokumentieren.
2. Test-User für Admin, Standortleitung und Lehrer mit passenden `users/{uid}`-Profilen anlegen.
3. Datenmigration `visibleForLehrerIds` für alle bestehenden Zuordnungen nachweisen.
4. Nutzerverwaltungs-Workflow klären: Entweder Auth-/Profilanlage integrieren oder in der UI klar verhindern/dokumentieren, dass App-Nutzer ohne externe Migration angelegt werden.
5. Standortleitungs-NFC konsistent machen: entweder Listener/Query korrekt aktivieren oder NFC-UI für Standortleitungen entfernen.
6. `config/admin` und `aenderungslog` rollen-/kontextbezogen einschränken.
7. Android-NFC-Test durchführen und protokollieren.
8. End-to-End-Regression mit echten Rollen durchführen: Login, Session Restore, Logout, Dashboard, Schüler, Stunden, Arbeitszeiten, NFC, Export.

---

## 8. Antwort auf die Go-live-Fragen

### Sind alle Go-live-Blocker geschlossen?

**Nein.**

Die zentrale Auth-/Rules-Architektur wurde verbessert und mehrere F005-Blocker wurden reduziert. Offen bleiben insbesondere Rules-Testnachweis, Datenmigration, NFC-Hardwareabnahme, Standortleitungs-NFC, Nutzerverwaltungsfähigkeit und einzelne Datenschutzlücken.

### Welche Restrisiken bestehen?

Die wichtigsten Restrisiken sind:

- nicht validierte Firestore Rules,
- nicht nachgewiesene Migrationsdaten,
- produktiv unvollständige Nutzeranlage,
- nicht abgenommene NFC-Funktion,
- potenzielle Zugriffsprobleme bei Bestandsdaten,
- zu breite Leserechte bei `config/admin` und `aenderungslog`.

### Kann frogs. produktiv eingesetzt werden?

**Nein, aus QA-Sicht derzeit nicht.**

Die Anwendung ist näher an einer produktionsfähigen Sicherheitsarchitektur als in F005/F007, aber die für Go-live erforderliche Nachweisqualität ist nicht erreicht. Eine Produktivfreigabe wäre zum jetzigen Stand nicht verantwortbar.

---

## 9. Freigabestatus

**Nicht freigegeben.**

Übergabe ausschließlich an den 🧭 Coordinator.
