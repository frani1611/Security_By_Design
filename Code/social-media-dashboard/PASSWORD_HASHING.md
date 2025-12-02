# Password Hashing - Dokumentation

## Übersicht

Alle Benutzerpasswörter werden mit **bcrypt** gehasht, bevor sie in der Datenbank gespeichert werden. Klartext-Passwörter werden niemals persistiert.

## Verwendete Methode: bcrypt

**Algorithmus:** bcrypt (basiert auf Blowfish-Cipher)  
**Salt Rounds:** 10  
**Bibliothek:** `bcrypt` (npm package)

## Implementation

### Registrierung (Hash erstellen)

```javascript
// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');

const hashedPassword = await bcrypt.hash(password, 10);
// Speichert z.B.: $2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO/zQFxJ4K3N3bFz5Q7eQxqXF9m
```

### Login (Hash verifizieren)

```javascript
const isMatch = await bcrypt.compare(password, user.password);
// Gibt true/false zurück
```

## Sicherheits-Features

### 1. Automatisches Salting
- Jeder Hash erhält einen einzigartigen, zufälligen Salt
- Salt ist im Hash eingebettet (Format: `$2b$10$[salt][hash]`)
- Gleiche Passwörter ergeben unterschiedliche Hashes

**Beispiel:**
```
Password: "MyPassword123"
Hash 1:   $2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO/zQFxJ4K3N3bFz5Q7eQxqXF9m
Hash 2:   $2b$10$X8pq9vMLPjdlhx3ANQoPze.AbcDE1FgHiJ2K3M4N5oP6Q7rStUvWx
```

### 2. Cost Factor (10 Rounds)

- **10 Rounds = 2^10 = 1024 Iterationen**
- Hash-Berechnung dauert ~100ms
- Verhindert Brute-Force Angriffe (zu langsam für massenhaftes Testen)

| Rounds | Iterationen | Geschwindigkeit | Verwendung |
|--------|-------------|-----------------|------------|
| 10 | 1024 | ~100ms | ✅ Standard (aktuell) |
| 12 | 4096 | ~400ms | Höhere Sicherheit |
| 8 | 256 | ~30ms | ❌ Zu schnell |

### 3. Rainbow Table Schutz

- Individueller Salt pro Passwort macht vorberechnete Hash-Tabellen nutzlos
- Angreifer muss jeden Hash individuell berechnen

### 4. Timing-Attack Resistent

- `bcrypt.compare()` hat konstante Ausführungszeit
- Verhindert Seitenkanalangriffe durch Timing-Messungen

## Hash-Format

```
$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO/zQFxJ4K3N3bFz5Q7eQxqXF9m
│  │  │                      │
│  │  │                      └─ Hash (31 Zeichen)
│  │  └─ Salt (22 Zeichen)
│  └─ Cost Factor (10)
└─ bcrypt Variante (2b = aktuelle Version)
```

**Gesamt-Länge:** 60 Zeichen

## Datenbank-Speicherung

**MongoDB Schema:**
```javascript
{
  username: String,
  email: String,
  password: String,  // bcrypt Hash (60 chars)
  createdAt: Date
}
```

**Beispiel-Dokument:**
```json
{
  "_id": "674c1a2b3d4e5f6g7h8i9j0k",
  "username": "testuser",
  "email": "test@example.com",
  "password": "$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO/zQFxJ4K3N3bFz5Q7eQxqXF9m",
  "createdAt": "2025-12-01T10:30:00.000Z"
}
```

## Warum bcrypt?

| Alternative | Problem | bcrypt Vorteil |
|------------|---------|----------------|
| MD5/SHA1 | Zu schnell, unsicher | Langsam durch Design |
| SHA256 (plain) | Kein Salt, Rainbow Tables möglich | Auto-Salting |
| Plaintext | ❌ Katastrophal | Hashing überhaupt |

## Best Practices (befolgt)

- ✅ Kein Klartext-Passwort in Logs
- ✅ Kein Klartext-Passwort in Datenbank
- ✅ Automatisches Salting
- ✅ Ausreichender Cost Factor (10)
- ✅ Timing-sichere Vergleichsfunktion
- ✅ Password-Länge validiert (min 10, max 128 Zeichen)

## Weitere Sicherheitsmaßnahmen

- **Input Validation:** Passwort muss 10-128 Zeichen lang sein (verhindert DoS via sehr lange Strings)
- **Generische Login-Fehler:** Bei falschem Passwort wird "Invalid credentials" zurückgegeben (keine User-Enumeration)
- **SSO-Nutzer:** Google-Login-Nutzer haben kein gehashtes Passwort (optional field)

## Referenzen

- [bcrypt npm Package](https://www.npmjs.com/package/bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- Implementation: `backend/src/controllers/authController.js`
