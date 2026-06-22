# Result_F008_Architect.md

# ADO – Architecture Report Sprint F008

Rolle: 🏛️ Architect  
Projekt: frogs. – Digitale Zeiterfassung  
Sprint: F008 – Firebase Auth Architekturkonzept  
Arbeitsgrundlage:

- `ADO/02_Results/Result_F005_QA.md`
- `ADO/02_Results/Result_F006_Dev.md`
- `ADO/02_Results/Result_F007_QA.md`
- `ADO/03_Coordinator/Coordinator_Assessment_F007.md`
- `ADO/04_Risks/Risk_Register.md`
- `ADO/05_Decisions/Decision_Log.md`
- aktuelle Projektdatei `NachhilfeZeit (6).zip`
- aktuelle ADO-ZIP `ADO_frogs_v8.zip`

---

## 1. Executive Summary

QA F005 und F007 haben keine Freigabe erteilt. Die wiederkehrende technische Ursache ist, dass die aktuelle frogs.-App zwar Rollen im Frontend kennt, Firestore aber keine belastbare serverseitige Benutzeridentität erhält. Dadurch können Firestore Rules aktuell keine echte Rollen- oder Standortprüfung durchführen.

Die bestehende Architektur nutzt:

- PIN-/Passwort-Login innerhalb der App,
- Admin-PIN aus `config/admin`,
- Lehrer-/Standortleitungs-PIN aus `lehrer`,
- lokale Session in AsyncStorage unter `frogs_session_v3`,
- Rollenprüfung über `utils/permissions.js` und Screens,
- Firestore Rules mit überwiegend offenen Reads und nur strukturellen Write-Prüfungen.

Die minimale Zielarchitektur für F008 lautet:

> Firebase Auth wird als technische Identitätsschicht eingeführt. Rollen und Standortzuordnungen bleiben als fachliche Autorisierungsdaten in Firestore-User-Dokumenten. Firestore Rules prüfen `request.auth.uid` und lesen das zugehörige User-Profil serverseitig aus.

Custom Claims werden für die kleinste sinnvolle Migration nicht als primärer Mechanismus empfohlen. Sie erfordern Admin-SDK/Backend-Prozesse zur Pflege und würden die Migration unnötig vergrößern. User-Dokumente sind für frogs. risikoärmer, weil Rollen und Standortzuordnungen bereits fachlich in Firestore existieren und von der App verwaltet werden.

---

## 2. Bestehende betroffene Login-Architektur

### 2.1 Aktueller Login

Betroffene Dateien/Module:

- `app/login.jsx`
- `utils/auth.js`
- `utils/db.js`
- `app/_layout.jsx`
- `utils/permissions.js`
- `firestore.rules`
- `app/einstellungen.jsx`
- `app/nutzer.jsx`

Aktueller Ablauf:

1. Nutzer wählt Rolle im Login-Screen.
2. Admin meldet sich nur mit PIN/Passwort an.
3. Lehrer und Standortleitung melden sich mit Name + PIN an.
4. `app/login.jsx` ruft `getAdminPin()` oder `getLehrerByNamePin()` aus `utils/db.js` auf.
5. Bei Erfolg speichert `utils/auth.js` eine JSON-Session in AsyncStorage.
6. `app/_layout.jsx` lädt diese Session und verwendet sie für Routing, Navigation, NFC-Aktivierung und Rollenprüfung.
7. Firestore erhält dabei keine echte Auth-Identität; `request.auth` ist in Rules nicht nutzbar.

### 2.2 Aktuelle Session-Struktur

Die App speichert lokal sinngemäß:

- `rolle`
- `name`
- `id`
- `standortId`
- `standortName`

Diese Session ist für UI-Logik relevant, aber keine serverseitig belastbare Sicherheitsidentität.

### 2.3 Aktuelle sicherheitsrelevante Schwäche

Firestore Rules können aktuell nicht wissen, welcher Benutzer eine Anfrage stellt. Daher sind Rollenrechte und Standortgrenzen nicht serverseitig durchsetzbar. Genau diese Lücke ist laut QA F005/F007 der zentrale Go-live-Blocker.

---

## 3. Empfohlene Zielarchitektur

### 3.1 Grundsatz

Firebase Auth übernimmt künftig ausschließlich die technische Authentifizierung.

Firestore bleibt Quelle für fachliche Berechtigungen:

- Rolle,
- Standortzuordnung,
- Anzeigename,
- Aktivstatus,
- optional Referenz auf bestehende Lehrer-/Standortleitungsdaten.

### 3.2 Ziel-Login je Rolle

#### Administrator

Empfohlene minimale Zielvariante:

- Admin erhält einen Firebase-Auth-Benutzer.
- Login erfolgt über E-Mail + Passwort oder einen technisch eindeutigen internen Login-Identifier.
- Admin-Profil liegt zusätzlich in Firestore.
- Rolle im User-Dokument: `admin`.
- Kein Zugriff mehr über globales `config/admin.pin` als alleinige Authentifizierung.

Begründung:

- Ein globales Admin-Passwort ist keine benutzerbezogene Identität.
- Firestore Rules benötigen `request.auth.uid`.
- Mehrere Admins wären später möglich, ohne die Architektur erneut umzubauen.

#### Standortleitung

Empfohlene minimale Zielvariante:

- Jede Standortleitung erhält einen Firebase-Auth-Benutzer.
- Login erfolgt über Firebase Auth.
- Fachliches Profil liegt in Firestore.
- Rolle im User-Dokument: `standort`.
- Standortzuordnung im User-Dokument: `standortId`, optional `standortName` als Anzeige-/Cache-Feld.

Bestehende `lehrer`-Dokumente mit `rolle: "standort"` können fachlich erhalten bleiben, sollten aber über `authUid` mit Firebase Auth verknüpft werden.

#### Lehrer

Empfohlene minimale Zielvariante:

- Jeder Lehrer erhält einen Firebase-Auth-Benutzer.
- Login erfolgt über Firebase Auth.
- Fachliches Profil liegt in Firestore.
- Rolle im User-Dokument: `lehrer`.
- Standortzuordnung im User-Dokument: `standortId`, soweit vorhanden.
- Lehrer-Schüler-Zuordnung bleibt über `zuordnungen` bestehen.

Bestehende Lehrer-Dokumente bleiben für fachliche Daten und Zuordnungen erhalten, werden aber über `authUid` mit Firebase Auth verbunden.

---

## 4. Speicherung von Rollen und Standortzuordnungen

### 4.1 Empfohlenes User-Profil

Neue bzw. verbindliche Collection:

```text
users/{uid}
```

Minimale Felder:

```text
uid: string
rolle: "admin" | "standort" | "lehrer"
name: string
standortId: string | null
standortName: string | null
lehrerId: string | null
active: boolean
createdAt: string
updatedAt: string
```

Bedeutung:

- `uid`: Firebase Auth UID, identisch mit Dokument-ID.
- `rolle`: serverseitig prüfbare Rolle.
- `standortId`: serverseitig prüfbare Standortgrenze.
- `lehrerId`: Referenz auf bestehendes Dokument in `lehrer`, falls Rolle `lehrer` oder `standort` weiterhin dort verwaltet wird.
- `active`: ermöglicht Sperrung ohne Löschen des Auth-Users.

### 4.2 Verhältnis zur bestehenden Collection `lehrer`

Die bestehende Collection `lehrer` bleibt in der minimalen Migration erhalten.

Begründung:

- Viele bestehende Funktionen, Zuordnungen und Screens referenzieren `lehrer`-Dokument-IDs.
- Eine sofortige Zusammenlegung von `lehrer` und `users` wäre ein großer Datenmodellumbau.
- Der Sprint zielt auf Go-live-Sicherheit, nicht auf Datenmodellbereinigung.

Minimale Ergänzung in `lehrer/{id}`:

```text
authUid: string | null
```

Damit kann die App weiterhin fachlich mit `lehrerId` arbeiten, während Firestore Rules über `request.auth.uid` auf `users/{uid}` prüfen.

---

## 5. Custom Claims oder User-Dokumente

### 5.1 Entscheidung

Für die kleinste sinnvolle Migration werden **User-Dokumente** empfohlen, nicht Custom Claims als primäre Autorisierungsquelle.

### 5.2 Begründung

User-Dokumente sind für frogs. geeigneter, weil:

- die App bereits stark Firestore-zentriert ist,
- Rollen und Standortdaten fachlich veränderbar sein müssen,
- Standortleitungen und Lehrer bereits in Firestore verwaltet werden,
- keine Backend-/Admin-SDK-Infrastruktur im Projekt vorhanden ist,
- Custom Claims bei Änderungen Token-Refresh und privilegierte Serverlogik benötigen,
- Firestore Rules per `get()` User-Dokumente prüfen können.

### 5.3 Mögliche spätere Ergänzung

Custom Claims können später ergänzend verwendet werden für sehr grobe Rollenflags, z. B. `admin: true`. Für die F008-Migration sind sie nicht erforderlich und erhöhen den Umfang.

---

## 6. Firestore-Rules-Konzept

### 6.1 Neue zentrale Rules-Helfer

Konzeptuell werden Rules möglich wie:

```text
isSignedIn()        -> request.auth != null
userDoc()           -> users/{request.auth.uid}
isActive()          -> users/{uid}.active == true
role()              -> users/{uid}.rolle
isAdmin()           -> role == "admin"
isStandort()        -> role == "standort"
isLehrer()          -> role == "lehrer"
sameStandort(id)    -> users/{uid}.standortId == id
ownLehrerId(id)     -> users/{uid}.lehrerId == id
```

### 6.2 Dadurch mögliche Zugriffskontrolle

#### `users/{uid}`

- Nutzer darf eigenes Profil lesen.
- Admin darf alle User-Profile lesen und verwalten.
- Normale Nutzer dürfen Rolle/Standort nicht selbst ändern.

#### `standorte`

- Admin: lesen, erstellen, ändern, löschen.
- Standortleitung: eigenen Standort lesen.
- Lehrer: eigenen Standort lesen, falls benötigt.

#### `lehrer`

- Admin: alle lesen/verwalten.
- Standortleitung: Lehrer des eigenen Standorts lesen/verwalten, soweit Product Context erlaubt.
- Lehrer: eigenes Lehrerprofil lesen.
- Schreibzugriffe werden an Rolle und Standort gebunden.

#### `schueler`

- Admin: alle lesen/verwalten.
- Standortleitung: Schüler des eigenen Standorts lesen/verwalten.
- Lehrer: nur zugeordnete Schüler lesen, über `zuordnungen` validierbar oder über App-Queries plus Rules-Prüfung.

#### `zuordnungen`

- Admin: alle verwalten.
- Standortleitung: Zuordnungen des eigenen Standorts verwalten.
- Lehrer: eigene Zuordnungen lesen.

#### `stunden` / `eintraege`

- Admin: alle lesen/verwalten.
- Standortleitung: Stunden des eigenen Standorts lesen/verwalten.
- Lehrer: eigene Stunden lesen/erstellen/ändern, soweit bestehender Funktionsumfang es vorsieht.
- Legacy-Collection `eintraege` bleibt zunächst lesbar nach denselben Regeln, aber sollte nicht neue primäre Schreibquelle werden.

#### `arbeitszeiten`

- Admin: alle lesen/verwalten.
- Standortleitung: eigene bzw. standortbezogene Arbeitszeiten lesen/verwalten.
- Lehrer: kein Zugriff, sofern Arbeitszeiterfassung weiterhin nur Admin/Standortleitung betrifft.

#### `config`

- `config/preise`: Lesen je nach App-Bedarf für angemeldete Nutzer; Schreiben nur Admin.
- `config/admin`: in Zielarchitektur nicht mehr als Login-Geheimnis verwenden; Zugriff stark einschränken oder perspektivisch entfernen.

#### `aenderungslog`

- Authentifizierte berechtigte Nutzer dürfen Logs erzeugen.
- Update/Delete bleiben verboten.
- Lesen abhängig von Rolle: Admin alle, Standortleitung eigener Standort, Lehrer eigene Einträge.

### 6.3 Wichtiges technisches Detail

Firestore Rules können nicht beliebig komplexe Join-Logik ersetzen. Für Lehrerzugriff auf Schüler über `zuordnungen` muss Development prüfen, ob die bestehende Datenstruktur rule-freundlich genug ist. Falls Rules die Abfrage nicht performant oder eindeutig prüfen können, ist als minimale Erweiterung ein denormalisiertes Feld möglich, z. B. `visibleForLehrerIds` auf Schülern. Diese Erweiterung wäre jedoch nur dann zu verwenden, wenn die bestehende `zuordnungen`-Prüfung in Rules nicht praktikabel ist.

---

## 7. Kleinste sinnvolle Migrationsvariante

### 7.1 Ziel

Die kleinste sinnvolle Variante ist eine Auth-Migration mit maximaler Beibehaltung bestehender Fachlogik.

Nicht Bestandteil der Minimalvariante:

- keine vollständige Neuentwicklung des Logins,
- keine Zusammenlegung aller Benutzercollections,
- kein neues Backend,
- keine Custom-Claims-Pflege,
- keine fachlichen Featureänderungen,
- keine Entfernung der Legacy-Collection `eintraege`.

### 7.2 Minimalvariante

1. Firebase Auth im bestehenden Firebase-Service initialisieren.
2. Neue Collection `users/{uid}` einführen.
3. Bestehende Admin-, Standortleitungs- und Lehrerprofile mit Auth-UID verknüpfen.
4. Login auf Firebase Auth umstellen.
5. Nach erfolgreichem Auth-Login User-Profil aus `users/{uid}` laden.
6. Bestehende App-Session weiterverwenden, aber aus Auth + User-Profil ableiten.
7. Firestore Rules schrittweise auf `request.auth` + `users/{uid}` umstellen.
8. Alte PIN-Prüfung nicht mehr als Security-Mechanismus verwenden.

### 7.3 Umgang mit bestehenden PIN-Logins

Es gibt zwei zulässige Minimalpfade. Aus Architektursicht ist Pfad A vorzuziehen.

#### Pfad A – Ablösung durch Firebase Auth Passwort

- Admin, Standortleitungen und Lehrer erhalten Firebase-Auth-Zugangsdaten.
- Bestehende PIN-Felder werden nicht mehr zur Authentifizierung verwendet.
- PIN-Felder bleiben zunächst nur als Legacy-Daten bestehen oder werden später entfernt.

Vorteil: sauberste Sicherheitsgrenze, geringere Komplexität in Rules und Login.

#### Pfad B – Übergangsweise PIN als Eingabe, intern Firebase Auth

- App behält optisch Name/PIN zunächst bei.
- Intern wird daraus ein technischer Firebase-Auth-Login abgeleitet.
- Dafür müsste pro Nutzer ein eindeutiger technischer Identifier existieren.

Nachteil: höhere Komplexität, Risiko von Pseudo-Sicherheit, potenziell problematischer Umgang mit generierten Passwörtern.

### 7.4 Architekturentscheidung zur Minimalvariante

Empfohlen wird **Pfad A**.

Begründung:

- eindeutigere Sicherheitsarchitektur,
- weniger Sonderlogik,
- Firestore Rules können direkt auf echte Auth-Identität prüfen,
- QA kann klar testen,
- kein Verstecken alter PIN-Architektur hinter Firebase Auth.

---

## 8. Voraussichtlich betroffene Dateien / Module

### 8.1 Sicher betroffen

- `utils/db.js`  
  Firebase-Initialisierung, ggf. Export der Firebase-App/Auth-Instanz, Entfernen/Reduzieren alter Login-Hilfsfunktionen aus dem Auth-Pfad.

- `utils/auth.js`  
  Session-Handling muss Firebase Auth berücksichtigen: Auth-State, Logout, Profilableitung, AsyncStorage nur noch als Cache/Komfort, nicht als Sicherheitsquelle.

- `app/login.jsx`  
  Umstellung von PIN-/Firestore-Vergleich auf Firebase-Auth-Login plus Laden von `users/{uid}`.

- `app/_layout.jsx`  
  Session-Initialisierung muss Auth-State abwarten; Route Guard darf erst nach Auth-/Profilprüfung entscheiden.

- `utils/permissions.js`  
  Clientseitige Permissions bleiben UI-Komfort, müssen aber mit `users/{uid}.rolle` konsistent bleiben.

- `firestore.rules`  
  Umstellung auf `request.auth` und serverseitige Rollen-/Standortprüfung.

- `app/nutzer.jsx`  
  Nutzerverwaltung muss bei Anlage/Änderung Auth-Verknüpfung und `users/{uid}` berücksichtigen.

- `app/einstellungen.jsx`  
  Admin-PIN-Änderung ist in Zielarchitektur nicht mehr primärer Auth-Mechanismus; Funktion muss fachlich/technisch überprüft werden.

### 8.2 Wahrscheinlich betroffen

- `app/index.jsx`
- `app/stunden.jsx`
- `app/schueler.jsx`
- `app/scan.jsx`
- `app/export.jsx`
- `app/mehr.jsx`
- `utils/nfcService.js`

Grund: Diese Module nutzen `session`, `rolle`, `id`, `standortId` oder `standortName` und müssen nach Auth-Migration unverändert oder kontrolliert mit dem neuen Session-Ursprung funktionieren.

### 8.3 Dokumentation/Testpläne

- `docs/FIRESTORE_RULES_TESTPLAN.md`
- `docs/NFC_MANUAL_TESTPLAN.md` nur indirekt, falls Login Voraussetzung für NFC-Tests ist.
- ADO-Ergebnisdokumente nach Development/QA.

---

## 9. Daten-/Nutzermigrationskonzept

### 9.1 Benötigte Datenmigration

Für jeden produktiven Benutzer wird benötigt:

1. Firebase Auth User.
2. Firestore-Dokument `users/{uid}`.
3. Verknüpfung zu bestehendem `lehrer/{id}` über `authUid` oder `lehrerId`.
4. Für Standortleitungen: korrekte `standortId`.
5. Für Lehrer: korrekte `standortId`, soweit vorhanden, und bestehende `zuordnungen` unverändert.
6. Für Admin: `users/{uid}` mit `rolle: "admin"`.

### 9.2 Nicht zu migrieren in der Minimalvariante

- Unterrichtsstunden in `stunden` bleiben unverändert.
- Legacy-Daten in `eintraege` bleiben unverändert.
- Schülerdaten bleiben unverändert.
- Zuordnungen bleiben unverändert.
- Arbeitszeiten bleiben unverändert.
- NFC-IDs bleiben unverändert.

### 9.3 Umgang mit alten PIN-Feldern

Für die Minimalmigration sollten alte PIN-Felder nicht sofort gelöscht werden, damit kein unnötiges Datenrisiko entsteht. Sie dürfen nach erfolgreicher Migration aber nicht mehr für Authentifizierung verwendet werden.

Spätere Bereinigung kann in einem separaten Sprint erfolgen.

---

## 10. Risiken

| Risiko | Bewertung | Beschreibung |
|---|---:|---|
| R-004 Auth-Migration beeinflusst Login-Flows | Hoch | Login, Session, Route Guard und Nutzerverwaltung hängen direkt am bestehenden PIN-Modell. |
| Inkonsistente User-Verknüpfung | Hoch | Wenn `users/{uid}` und `lehrer/{id}` nicht sauber verknüpft sind, können Rollen oder Standortfilter falsch greifen. |
| Standortleitung ohne `standortId` | Hoch | Dieser Fall wurde bereits in F006 stabilisiert; Rules müssen denselben sicheren Leer-/Verweigerungszustand erzwingen. |
| Firestore Rules brechen bestehende Queries | Hoch | Strengere Rules können bestehende Screens blockieren, wenn Queries nicht zu den Rules passen. |
| Lehrer-Schüler-Zugriff über `zuordnungen` | Mittel/Hoch | Rules müssen die bestehende Zuordnungslogik prüfen können; falls nicht, ist minimale Denormalisierung erforderlich. |
| Legacy Collection `eintraege` | Mittel | Parallele Lese-/Fallback-Logik muss auch nach Auth-Regeln konsistent funktionieren. |
| AsyncStorage-Verwechslung | Mittel | AsyncStorage darf nach Migration nur UI-Cache sein, nicht Sicherheitsquelle. |
| Datenmigration unvollständig | Hoch | Fehlende Auth-User oder User-Dokumente verhindern Login oder Zugriff. |
| QA-Aufwand steigt | Mittel | Auth-Migration erfordert Rollentests, Rules-Tests und Regression über alle Hauptscreens. |

---

## 11. Development-Arbeitspakete

### AP1 – Firebase Auth technisch integrieren

- Firebase Auth aus der vorhandenen Firebase-JS-SDK-Abhängigkeit einbinden.
- Auth-Instanz zentral bereitstellen.
- Logout an Firebase Auth koppeln.
- Auth-State beim App-Start auswerten.

### AP2 – User-Profilmodell einführen

- Collection `users/{uid}` einführen.
- Minimales Profilmodell gemäß Abschnitt 4 umsetzen.
- Lese-/Hilfsfunktion für aktuelles User-Profil ergänzen.

### AP3 – Login umstellen

- `app/login.jsx` von Firestore-PIN-Vergleich auf Firebase Auth umstellen.
- Nach Auth-Erfolg `users/{uid}` laden.
- Lokale Session aus Auth-User + User-Profil erzeugen.
- Fehlerfälle behandeln: kein User-Profil, `active: false`, fehlende Rolle, fehlende StandortId bei Standortleitung.

### AP4 – Bestehende Nutzerverwaltung anbinden

- Anlage/Änderung von Lehrern und Standortleitungen fachlich mit Auth-UID/User-Profil berücksichtigen.
- Keine vollständige User-Management-Neuentwicklung im ersten Schritt.
- Für bestehende Datensätze Migrationspfad dokumentieren.

### AP5 – Firestore Rules auf Auth umstellen

- `request.auth != null` als Basisbedingung einführen.
- `users/{uid}` als Rollen-/Standortquelle verwenden.
- Offene Reads schließen.
- Offene Deletes schließen bzw. rollenspezifisch erlauben.
- Write-Regeln zusätzlich zur bestehenden Strukturvalidierung mit Rollen-/Standortprüfung kombinieren.

### AP6 – Migrationsdaten erstellen

- Für vorhandene Admins, Standortleitungen und Lehrer Firebase Auth User anlegen.
- `users/{uid}`-Dokumente anlegen.
- Bestehende `lehrer`-Dokumente mit `authUid`/`lehrerId` verknüpfen.
- Standortzuordnungen prüfen.

### AP7 – Regression über Session-Nutzung

- Alle Screens prüfen, die `session` verwenden.
- Sicherstellen, dass Rollen, `id`, `standortId` und `standortName` nach Migration identisch oder bewusst kompatibel verfügbar sind.

### AP8 – Testdokumentation aktualisieren

- Firestore-Rules-Testplan um Auth-Rollenfälle erweitern.
- Manuelle Login-/Rollen-Testmatrix ergänzen.

---

## 12. QA-Testempfehlungen nach Development

### 12.1 Authentifizierung

- Admin kann sich mit Firebase Auth anmelden.
- Standortleitung kann sich mit Firebase Auth anmelden.
- Lehrer kann sich mit Firebase Auth anmelden.
- Falsches Passwort wird abgelehnt.
- Deaktivierter User (`active: false`) erhält keinen App-Zugriff.
- Auth-User ohne `users/{uid}` erhält keinen App-Zugriff.
- Logout beendet Firebase Auth Session und lokale App-Session.
- App-Neustart stellt Session nur bei gültigem Firebase Auth User wieder her.

### 12.2 Rollen und Navigation

- Admin sieht Admin-Navigation und alle erlaubten Bereiche.
- Standortleitung sieht nur Standortleitungsbereiche.
- Lehrer sieht nur Lehrerbereiche.
- Direkter Aufruf nicht erlaubter Routen wird blockiert.

### 12.3 Standortgrenzen

- Standortleitung A sieht keine Schüler, Lehrer, Stunden oder Arbeitszeiten von Standort B.
- Standortleitung ohne `standortId` sieht keine fremden Daten.
- Lehrer sieht nur zugeordnete Schüler.
- Lehrer sieht nur eigene Stunden.

### 12.4 Firestore Rules Emulator

Mindestens folgende Rules-Tests sind erforderlich:

- Nicht authentifizierter Read auf zentrale Collections wird abgelehnt.
- Nicht authentifizierter Write wird abgelehnt.
- Admin darf alle vorgesehenen Operationen.
- Standortleitung darf nur eigenen Standortkontext.
- Standortleitung darf fremden Standort nicht lesen/schreiben/löschen.
- Lehrer darf eigene Daten lesen/schreiben, aber keine fremden Lehrer-/Schülerdaten.
- Lehrer darf keine Admin-/Standortleitungsfunktionen ausführen.
- `config/preise` darf nur Admin schreiben.
- `aenderungslog` bleibt append-only.
- Deletes sind rollen- und kontextabhängig eingeschränkt.

### 12.5 Regression Hauptfunktionen

- Dashboard je Rolle.
- Nutzerverwaltung Admin.
- Nutzerverwaltung Standortleitung.
- Schüleransicht Lehrer.
- Stundenübersicht je Rolle.
- Manuelle Unterrichtsstunde.
- NFC-Unterrichtsstart/-stopp auf Android-Gerät.
- Arbeitszeiterfassung Admin/Standortleitung.
- Export Admin.

---

## 13. Antworten auf die Architekturfragen

### 1. Welche bestehende Login-Architektur ist betroffen?

Betroffen ist die PIN-/AsyncStorage-Architektur aus `app/login.jsx`, `utils/auth.js`, `utils/db.js` und `app/_layout.jsx`. Sie wird nicht als UI-Konzept zwingend vollständig ersetzt, aber als Sicherheitsarchitektur abgelöst.

### 2. Wie sollen Admin, Standortleitung und Lehrer künftig authentifiziert werden?

Alle drei Rollen sollen über Firebase Auth authentifiziert werden. Die Rolle ergibt sich danach aus `users/{uid}`.

### 3. Wo werden Rollen und Standortzuordnungen gespeichert?

In `users/{uid}` als verbindliche Autorisierungsquelle für Firestore Rules. Bestehende `lehrer`-Dokumente bleiben fachliche Profile und werden per `authUid`/`lehrerId` verknüpft.

### 4. Sollen Custom Claims verwendet werden oder User-Dokumente?

User-Dokumente. Custom Claims werden für die Minimalmigration nicht empfohlen.

### 5. Welche Firestore Rules werden dadurch möglich?

Rules können künftig `request.auth.uid` prüfen, das User-Profil lesen und Zugriffe nach Rolle, Standort, eigener Lehrer-ID und Aktivstatus einschränken. Offene Reads/Writes/Deletes können dadurch geschlossen werden.

### 6. Welche Dateien sind voraussichtlich betroffen?

Sicher betroffen: `utils/db.js`, `utils/auth.js`, `app/login.jsx`, `app/_layout.jsx`, `utils/permissions.js`, `firestore.rules`, `app/nutzer.jsx`, `app/einstellungen.jsx`. Wahrscheinlich betroffen: alle Screens mit Session-/Rollen-/Standortlogik.

### 7. Was ist die kleinste sinnvolle Migrationsvariante?

Firebase Auth einführen, `users/{uid}` ergänzen, bestehende Fachcollections erhalten, Login auf Auth umstellen, Session aus Auth-Profil ableiten und Rules auf `request.auth` + User-Dokumente umstellen.

### 8. Welche Risiken bestehen?

Haupt Risiken sind Login-Regression, fehlerhafte User-Verknüpfung, Rules brechen bestehende Queries, unvollständige Migration, Standortgrenzen bei fehlenden Daten und zusätzlicher QA-Aufwand.

### 9. Welche Arbeitspakete ergeben sich für Development?

Siehe Abschnitt 11: Auth integrieren, User-Profilmodell einführen, Login umstellen, Nutzerverwaltung anbinden, Rules umbauen, Migrationsdaten erstellen, Session-Regression prüfen, Testdokumentation aktualisieren.

### 10. Welche Tests braucht QA danach?

Siehe Abschnitt 12: Authentifizierung, Rollennavigation, Standortgrenzen, Firestore-Rules-Emulator, Regression der Hauptfunktionen inklusive NFC.

---

## 14. Empfehlung an den Coordinator

Die Einführung von Firebase Auth ist aus Architektursicht notwendig, um die von QA wiederholt dokumentierten Go-live-Blocker serverseitig zu schließen.

Empfohlen wird eine minimale, risikoarme Migration:

1. Firebase Auth als technische Identitätsschicht.
2. `users/{uid}` als Rollen- und Standortquelle.
3. Bestehende Collections beibehalten.
4. Bestehende Session-Struktur kompatibel aus Auth-Profil ableiten.
5. Firestore Rules danach konsequent auf `request.auth` umstellen.
6. Keine Custom Claims im ersten Schritt.
7. Keine fachlichen Neuentwicklungen im Auth-Sprint.

Nach Abschluss dieses Architektur-Sprints sollte der Coordinator einen Development-Sprint zur Umsetzung der Minimalmigration beauftragen, gefolgt von einem QA-Sprint mit Firestore-Rules-Emulator-Tests und rollenbasierter End-to-End-Prüfung.

---

## Abschluss

Sprint F008 ist aus Architecture-Sicht abgeschlossen.

Es wurden keine Codeänderungen vorgenommen und keine Implementierung durchgeführt.

Übergabe ausschließlich an den 🧭 Coordinator.
