# Result F-001 – Architect Summary

Status: Abgeschlossen

Kernergebnis:
Die App ist funktional breit angelegt und basiert auf Expo/React Native/Firebase. Die Kernbereiche sind vorhanden, aber Security Rules, NFC-Verifikation, Rollenrechte und Altlasten sind Risiken für den Go-live.

Wichtige Risiken:
- Firestore Security nicht rollenbasiert abgesichert
- Rollenlogik primär im Frontend
- NFC muss auf echtem Gerät geprüft werden
- Datenzugriffe teilweise inkonsistent
