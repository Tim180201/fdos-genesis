# Coordinator Assessment – F008 Architect

## Sprint
F008 – Firebase Auth Architekturkonzept

## Ergebnis
Der Architekturbericht ist freigegeben.

## Quality Gate
Status: Freigegeben

## Bewertung
Der Architect hat eine minimale, risikoarme Firebase-Auth-Migration beschrieben. Die vorgeschlagene Zielarchitektur erhält die bestehenden Fachcollections und ergänzt Firebase Auth als technische Identitätsschicht.

## Coordinator-Entscheidung
Die empfohlene Minimalmigration wird übernommen.

## Verbindliche Architekturentscheidung
- Firebase Auth wird eingeführt.
- `users/{uid}` wird verbindliche Rollen- und Standortquelle.
- Bestehende Fachcollections bleiben erhalten.
- Bestehende Session-Struktur darf weiter genutzt werden, muss aber aus Firebase Auth + User-Profil abgeleitet werden.
- Keine Custom Claims im ersten Schritt.
- Keine fachlichen Neuentwicklungen im Auth-Sprint.

## Nächster Sprint
F009 – Development Office

## Ziel
Implementierung der minimalen Firebase-Auth-Migration gemäß F008.
