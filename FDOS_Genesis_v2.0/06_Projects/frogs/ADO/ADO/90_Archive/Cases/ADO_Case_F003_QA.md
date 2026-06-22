# ADO Case F-003 – QA Go-live Quality Assessment

## Empfänger
🧪 QA

## Projektstatus
Projekt: frogs. Zeiterfassung  
Phase: Go-live Vorbereitung  
Ziel: Produktivbetrieb innerhalb von ca. 14 Tagen

## Bisherige Erkenntnisse aus F-001 Architect

Die App ist eine Expo-/React-Native-App mit Firebase Firestore, PIN-/Rollenlogin über App-Session und NFC-Funktionalität.

Wichtige Erkenntnisse:
- App-Version laut package.json: 5.2.8
- Dokumentation nennt teilweise 5.2.9 merged
- Aktive Struktur liegt in app/* und utils/*
- Firebase Auth wird nicht verwendet
- Firestore Rules sind weitgehend offen und strukturvalidierend, nicht rollenbasiert
- Rollenlogik liegt hauptsächlich im Frontend
- NFC ist implementiert, aber produktiv auf echtem Gerät zu verifizieren
- Arbeitszeiten und Unterrichtsstunden sind getrennte Collections
- Unterricht unterstützt Einzel-/Gruppenstunden und Änderungslog

Wichtige Risiken:
- R-001 Firestore Security
- R-002 Root-Duplikate / Altlasten
- R-003 Inkonsistente Datenzugriffe
- R-004 NFC-Gerätekompatibilität

## Bisherige Erkenntnisse aus F-002 Product

Product bewertet die App als weit fortgeschritten.

Vorhanden:
- Rollenmodell
- Standortverwaltung
- Benutzerverwaltung
- Unterricht
- Arbeitszeit
- NFC
- Dashboard
- Export
- Login
- Session
- Rollenabhängige Navigation

P1 Go-live kritisch:
- rollenkonforme Sichtbarkeit aller Daten
- Rollenrechte vollständig einhalten
- Arbeitszeiterfassung validieren
- Unterrichtserfassung validieren
- NFC produktiv absichern

P2 wichtig:
- Änderungsnachvollziehbarkeit prüfen
- administrative Abläufe konsistent halten
- Sonderfälle validieren

P3 nach Go-live:
- Komfortfunktionen
- zusätzliche Reports
- UX-Optimierungen

## Sprintauftrag

Bewerte ausschließlich die Go-live-Fähigkeit der aktuellen Anwendung.

Du programmierst nicht.
Du entwickelst keine technischen Lösungen.
Du bewertest Qualität, Risiken und Produktivbereitschaft.

## Prüfe insbesondere

### 1. Login
- Admin
- Standortleitung
- Lehrer
- Logout
- Session
- Fehlerfälle

### 2. Rollenrechte
- Admin besitzt vollständigen Zugriff
- Standortleitung sieht nur Daten des eigenen Standorts
- Lehrer sieht nur zugeordnete Schüler
- keine unberechtigten Daten sichtbar

### 3. Arbeitszeiterfassung
- manueller Start
- manuelles Stoppen
- NFC Start
- NFC Stop
- Speicherung
- Nachbearbeitung
- Fehlerfälle

### 4. Unterricht
- Einzelstunden
- Gruppenstunden
- Schüler hinzufügen
- Nachbearbeitung
- Stundenübersicht

### 5. Administration
- Standorte
- Standortleitungen
- Lehrer
- Schüler
- Zuordnungen

### 6. NFC
- Implementierungsstand
- erkennbare Risiken
- notwendige Tests auf echtem Android-Gerät
- Go-live-Eignung

## Priorisierung

- P1 = Go-live blockierend
- P2 = wichtig, aber nicht blockierend
- P3 = nach Go-live

## Ergebnisdatei

Schreibe dein Ergebnis in:

ADO/02_Results/Result_F003_QA.md

## Ergebnisstruktur

1. Executive Summary
2. QA-Gesamtbewertung
3. Geprüfte Bereiche
4. P1 Go-live Blocker
5. P2 wichtige Punkte
6. P3 spätere Optimierungen
7. Rollenrechte-Bewertung
8. NFC-Bewertung
9. Testempfehlungen
10. Go-live Empfehlung
11. Empfehlung an den Coordinator

## Leitsatz
Qualität bedeutet nicht Perfektion. Qualität bedeutet, dass der Kunde zuverlässig arbeiten kann.
