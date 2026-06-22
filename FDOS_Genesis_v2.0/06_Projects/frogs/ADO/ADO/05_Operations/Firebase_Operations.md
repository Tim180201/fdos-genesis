# Firebase Operations

## Kritische Regeln
- `users/{uid}` Dokument-ID muss exakt Firebase Auth UID sein.
- `users/{uid}.uid` muss ebenfalls exakt UID sein.
- Lehrer-Verknüpfung erfolgt über `lehrerId`, nicht über Auth UID.
- Standortbezug über `standortId` und optional `standortName`.

## Provisioning-Hinweis
Wenn die App Benutzer für andere Personen anlegen soll, muss geprüft werden, ob dies sicher über die Client-App möglich ist. Falls nicht, ist eine Cloud Function oder ein Backend-Endpunkt die bevorzugte sichere Variante.
