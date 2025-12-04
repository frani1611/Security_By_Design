# Social Media Dashboard - Umfassende Anwendungserklärung

## Inhaltsverzeichnis
1. [Überblick & Zweck](#überblick--zweck)
2. [Systemarchitektur](#systemarchitektur)
3. [Implementierte Sicherheitsfeatures](#implementierte-sicherheitsfeatures)
4. [Nicht-sichere Implementierungen und Begründungen](#nicht-sichere-implementierungen-und-begründungen)
5. [Threat Model & Gegenmaßnahmen](#threat-model--gegenmaßnahmen)
6. [Deploymentstruktur](#deploymentstruktur)


---

## Überblick & Zweck

### Was ist die Anwendung?

Das **Social Media Dashboard** ist eine sicherheitsorientierte Webanwendung, die Benutzern ermöglicht:
- Sich sicher zu registrieren und anzumelden
- Bilder hochzuladen und zu verwalten
- Rollen-basierte Zugriffskontrolle (Benutzer/Admin)
- Passwörter sicher zu speichern (bcrypt-verschlüsselt)
- Sich mit Google OAuth anzumelden (Single Sign-On)

### Warum "Security by Design"?

Diese Anwendung wurde von Grund auf mit **Sicherheit als Primärziel** konzipiert:
- ✅ Sichere Authentifizierung & Autorisierung
- ✅ Input Validation gegen NoSQL-Injection
- ✅ Passwort-Hashing mit bcrypt
- ✅ JWT-basierte Session-Verwaltung
- ✅ Kubernetes-native Security Context
- ✅ Datenschutzkonforme Fehlerbehandlung

---

## Systemarchitektur

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET / USER                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS (TLS 1.3)
                               ▼
                    ┌──────────────────────┐
                    │   Ingress Controller  │
                    │  (TLS Termination)   │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌─────────────────┐                          ┌─────────────────┐
│  Frontend Pod   │                          │  Backend Pod    │
│  (Vue.js SPA)   │◄─── REST API (JWT) ────►│ (Node/Express)  │
│  - Auth Views   │                          │ - Controllers   │
│  - Dashboard    │                          │ - Middleware    │
│  - Upload       │                          │ - Services      │
└─────────────────┘                          └────────┬────────┘
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    │                                   │
                                    ▼                                   ▼
                            ┌──────────────┐              ┌─────────────────┐
                            │   MongoDB    │              │   Cloudinary    │
                            │  (Database)  │              │  (Image Storage)│
                            │ - Users      │              │  - API Key Auth │
                            │ - Posts      │              │  - CDN Delivery │
                            └──────────────┘              └─────────────────┘

                        ┌─────────────────────────────┐
                        │   GitHub Actions (CI/CD)    │
                        │ - Code Scan (SAST/SCA)      │
                        │ - Build & Push Docker Image │
                        │ - Deploy to Kubernetes      │
                        └─────────────────────────────┘
```

### Komponenten Detail

#### **1. Frontend (Vue.js)**
| Aspekt | Detail |
|--------|--------|
| **Framework** | Vue 3 + TypeScript |
| **Build Tool** | Vite |
| **Hauptaufgaben** | UI-Rendering, Routing, API-Calls |
| **Sicherheitsrolle** | Session-Verwaltung, JWT-Storage |
| **Lauft in** | Kubernetes Pod (nginx-basierter Server) |

**Implementierte Features:**
- ✅ Responsive Login/Register-Seiten
- ✅ Dashboard mit Post-Verwaltung
- ✅ Drag-and-Drop Image Upload
- ✅ Inactivity Timer (Auto-Logout nach 15 Min)
- ✅ JWT in localStorage (persistent)
- ✅ API-Kommunikation via Axios

#### **2. Backend (Node.js/Express)**
| Aspekt | Detail |
|--------|--------|
| **Framework** | Express.js |
| **ORM** | Mongoose (MongoDB) |
| **Auth** | JWT + bcrypt + Google OAuth 2.0 |
| **Sicherheitsrolle** | Zentrale Business-Logic, Validierung, Auth |
| **Lauft in** | Kubernetes Pod |

**Implementierte Controller:**
```
authController.js
├── POST /auth/register          # Registrierung (Passwort-Hashing)
├── POST /auth/login             # Login (JWT-Generierung)
└── POST /auth/refresh           # Token-Refresh (optional)

googleAuthController.js
├── GET /auth/google             # OAuth Redirect
└── GET /auth/google/callback    # Callback von Google

uploadController.js
├── POST /upload                 # Image Upload zu Cloudinary
└── GET /posts                   # User-Posts abrufen
```

**Middleware:**
```
auth.middleware.js
├── JWT Verification
├── User Role Validation
└── Authorization Checks

validation.js
├── NoSQL Injection Prevention
├── Input Sanitization
├── Type & Length Checking
└── Password Validation
```

#### **3. Datenbank (MongoDB)**
| Aspekt | Detail |
|--------|--------|
| **Typ** | NoSQL Document Database |
| **Collections** | users, posts, sessions |
| **Auth** | Username/Password |
| **Isolation** | Kubernetes StatefulSet |
| **Sicherheit** | Network Policy (nur Backend-Zugriff) |

**Schema Beispiel:**
```javascript
// User Collection
{
  _id: ObjectId,
  email: String (unique, validated),
  username: String (unique),
  passwordHash: String (bcrypt),
  role: String ("User" oder "Admin"),
  googleId: String (optional, für OAuth),
  createdAt: Date,
  updatedAt: Date
}

// Post Collection
{
  _id: ObjectId,
  userId: ObjectId (reference to User),
  content: String,
  imageUrl: String (Cloudinary URL),
  createdAt: Date,
  updatedAt: Date
}
```

#### **4. Cloudinary (Cloud Storage)**
| Aspekt | Detail |
|--------|--------|
| **Dienst** | CDN + Image Hosting |
| **Authentifizierung** | API Key + Secret |
| **Funktion** | Bilder speichern, servieren, optimieren |
| **Sicherheit** | HTTPS, API-Key in .env |

---

## Implementierte Sicherheitsfeatures

### 1. Authentifizierung & Autorisierung

#### **1.1 Passwort-Hashing (Requirement #7)**
```javascript
// bcrypt mit 10 Salt Rounds
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

```

**Warum bcrypt?**
- ✅ Salting ist automatisch
- ✅ Adaptive Cost Factor (kann erhöht werden)
- ✅ Schutz vor Rainbow Tables
- ✅ Ist Standard für Password Hashing

**Datenspeicherung:**
- ❌ Passwörter werden NICHT im Klartext gespeichert
- ✅ Nur der Hash wird in MongoDB gespeichert
- ✅ Selbst Datenbankadmins sehen Passwörter nicht

#### **1.2 JWT Authentication (Requirement #1)**
```javascript
// Login-Flow
1. User sendet Email + Password
2. Backend verifiziert mit bcrypt.compare()
3. Wenn korrekt: JWT wird generiert
   {
     "id": userId,
     "email": userEmail,
     // ⚠️ NOTE: Role ist NICHT im Token enthalten
     // Role wird bei jedem Request aus der DB geladen
     "iat": 1701700000,
     "exp": 1702305000  // +7 Tage
   }
4. Token wird mit JWT_SECRET signiert (HS256)
5. Frontend speichert Token in localStorage
6. Weitere Requests mit "Authorization: Bearer <token>"

// Token-Verification (actual implementation)
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Prüft Signatur und Expiry automatisch
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
  }
};

// Benutzer-Rolle wird NACH Token-Verifizierung geladen
const user = await User.findById(decoded.id);
// ⚠️ NOTE: Ineffizienz - jeder Request braucht extra DB-Lookup für Role
```

**Sicherheit:**
- ✅ Token ist zeitlich begrenzt (7 Tage)
- ✅ Token ist signiert (Tampering wird erkannt)
- ✅ Server-Side Verification (nicht vertrauenswürdig vom Client)
- ⚠️ Token in localStorage (nicht ideal, aber funktional)
- ⚠️ Role nicht im Token (jeder Request = extra DB-Query)


#### **1.3 Google OAuth 2.0 (Requirement #1)**
```javascript
// Alternativer Login ohne Passwort
1. User klickt "Login with Google"
2. Redirect zu Google Authorization
3. User erlaubt Zugriff
4. Google sendet ID Token zurück
5. Backend verifiziert ID Token
6. User wird automatisch angemeldet oder registriert
```

**Sicherheit:**
- ✅ Passwort liegt bei Google, nicht bei uns
- ✅ Google prüft 2FA automatisch
- ✅ Token ist zeitlich begrenzt

---

### 2. Eingabevalidierung & Injection Prevention (Requirement #3)

#### **2.1 NoSQL Injection Prevention**

**Problem ohne Schutz:**
```javascript
// Angreifer sendet:
POST /api/auth/login
{
  "email": { "$ne": null },
  "password": { "$ne": null }
}

// Unsicherer Code würde akzeptieren:
User.findOne({ email: req.body.email });
// Matcht ALLE User mit email != null → Login als erster User 
```

**Lösung in validation.js:**
```javascript
function sanitizeObject(obj) {
  // 1. Rekursiv alle Objekt-Eigenschaften prüfen
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 2. Keys dürfen nicht mit '$' oder '.' starten
      if (key.startsWith('$') || key.startsWith('.')) {
        delete obj[key];
      }
      // 3. Wenn Value ein Objekt ist, rekursiv sanitizen
      if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
}

// Anwendung:
app.post('/api/auth/login', (req, res) => {
  const body = sanitizeObject(req.body);
  // Jetzt ist { "$ne": null } entfernt!
});
```

#### **2.2 Type & Length Validation**
```javascript
function validateAuthInput(email, password) {
  // 1. Type Check
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid input types');
  }
  
  // 2. Length Check
  if (email.length < 5 || email.length > 255) {
    throw new Error('Email length invalid');
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error('Password length invalid');
  }
  
  // 3. Format Check
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  return true;
}

// Ergebnis: Nur String-Typen, korrekte Länge, valides Format
```

#### **2.3 Generische Error Messages (Requirement #3)**
```javascript
// ❌ UNSICHER: Informativ aber gefährlich
"User with email john@example.com not found"
"Password is incorrect"

// ✅ SICHER: Generisch, Infos nur in Logs
"Invalid credentials"

// Logs enthalten Details:
logger.debug('Login attempt for john@example.com failed: invalid password');
```

---

### 3. Passwort-Sicherheit (Anforderungen #6, #7)

#### **3.1 Passwort-Komplexität (Requirement #6)**
```javascript
// Validierung bei Registration
// Erfordert:
✅ Mindestens 10 Zeichen

// Beispiele:
✅ SecurePass123!
✅ MyPassword@456
❌ Pass123!       (zu kurz, < 10 Zeichen)
```

#### **3.2 Sichere Speicherung (Requirement #7)**
```javascript
// Registration Flow
1. User sendet Passwort
2. Backend validiert Komplexität
3. bcrypt.hash() mit 10 Salt Rounds
4. Nur Hash wird in DB gespeichert
5. Original-Passwort wird nicht geloggt oder gecacht

// Verifikation bei Login
1. User sendet Passwort
2. Backend liest PasswordHash aus DB
3. bcrypt.compare(inputPassword, storedHash)
4. Wenn true: Login erfolgreich
5. FALSE: Generischer Error ("Invalid credentials")
```

---

### 4. Session-Management (Requirement #8)

#### **4.1 Automatisches Logout bei Inaktivität**
```javascript
// Frontend: inactivityTimer.ts
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 Minuten

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    // Auto-Logout
    localStorage.removeItem('token');
    router.push('/login');
  }, INACTIVITY_TIMEOUT);
}

// Trigger bei:
- Mausbewegung
- Tastaturinput
- Fenster-Fokus
```

#### **4.2 Token Expiry (Backend-Seite)**
```javascript
// JWT enthält "exp"-Claim
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // +7 Tage ab jetzt
);

// Middleware prüft Token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
  }
};
```

**Zwei-Schichten-Schutz:**
- Frontend: 15 Minuten Inactivity → Auto-Logout
- Backend: 7 Tage Expiry → Token ungültig

---

### 5. Kubernetes & Infrastructure Security

#### **5.1 Netzwerk-Isolation**
```yaml
# Ziel: Nur Backend darf auf MongoDB zugreifen
# Alle anderen Zugriffe blockiert

# Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mongodb-deny-all
spec:
  podSelector:
    matchLabels:
      app: mongodb
  policyTypes:
    - Ingress
  ingress:
    # Nur Pods mit app=backend dürfen Zugriff
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 27017
```

#### **5.2 Service Accounts (RBAC)**
```yaml
# Jeder Pod hat Minimal-Permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-role
rules:
  # Backend darf eigene Secrets lesen
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["db-secret"]
```

#### **5.3 Pod Security Context**
```yaml
# Deployment mit Security-Härtung
spec:
  securityContext:
    runAsNonRoot: true        # Nicht als root
    runAsUser: 1000           # Unprivileged User
    readOnlyRootFilesystem: true  # Read-only FS
  
  containers:
    - name: backend
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop: [ALL]         # Alle Capabilities entfernen
```

---

### 6. Daten-Verschlüsselung & Secrets Management (Requirement #2)

#### **6.1 Secrets in Umgebungsvariablen**
```env
# backend/.env (NICHT in Git!)
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@mongodb:27017/db
JWT_SECRET=super-secret-key-change-in-production
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
CLOUDINARY_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

**Sicherheit:**
- ✅ .env in .gitignore
- ✅ Secrets nicht in Source Code
- ✅ Verschiedene Secrets für Dev/Prod
- ⚠️ Keine automatische Rotation

#### **6.2 HTTPS/TLS (Requirement #2)**
```yaml
# Ingress mit TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  tls:
    - hosts:
        - example.com
      secretName: tls-secret  # Self-signed oder Let's Encrypt
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            backend:
              serviceName: frontend
              servicePort: 80
```

**Sicherheit:**
- ✅ HTTPS erzwingt Verschlüsselung
- ✅ TLS 1.2+ (TLS 1.3 empfohlen)
- ✅ Certificate Pinning (optional)
- ⚠️ Encryption at Rest (nicht für MongoDB Standard)

---

### 7. Logging & Monitoring (Requirement #4)

#### **7.1 Security Event Logging**
```javascript
// Verdächtige Aktivitäten werden geloggt
logger.warn('Possible injection attempt', {
  endpoint: '/api/auth/login',
  suspicious_keys: ['$ne', '.'],
  timestamp: new Date(),
  ip: req.ip
});

logger.info('User login successful', {
  userId: user._id,
  email: user.email,
  timestamp: new Date()
});

logger.error('Rate limit exceeded', {
  ip: req.ip,
  endpoint: '/api/auth/login',
  attempts: 10
});
```

#### **7.2 Audit Trails (Teilweise)**
```javascript
// Post-Operationen werden protokolliert
const Post = new Schema({
  ...
  createdBy: ObjectId,
  createdAt: Date,
  lastModifiedBy: ObjectId,
  lastModifiedAt: Date,
  deletedAt: Date  // Soft-Delete
});

// Middleware trackt Änderungen
Post.pre('save', async function() {
  this.lastModifiedAt = new Date();
  this.lastModifiedBy = req.user._id;
});
```

---

## Nicht-sichere Implementierungen und Begründungen

Dieses Kapitel dokumentiert bewusste Sicherheitslücken, technische Schulden und Trade-offs, die aus Zeit-, Komplexitäts- oder Scope-Gründen akzeptiert wurden.

### 5.1 Kritische Sicherheitslücken

#### **5.1.1 TLS/HTTPS nicht erzwungen**

**Status:** ❌ Nicht implementiert

**Beschreibung:**
- Ingress Controller hat TLS-Konfiguration, aber HTTPS ist nicht mandatory
- HTTP-Traffic wird akzeptiert
- Keine automatische Weiterleitung von HTTP zu HTTPS

**Risiko:**
- **CRITICAL**: Man-in-the-Middle (MITM) Angriffe möglich
- JWT Tokens können im Klartext abgefangen werden
- Credentials können bei Login gestohlen werden
- Vollständige Kompromittierung der Session möglich

**Begründung:**
- Lokale Entwicklungsumgebung ohne gültiges TLS-Zertifikat
- Self-signed Certificates würden Browser-Warnungen verursachen
- Let's Encrypt Integration erfordert öffentliche Domain
- Fokus lag auf Applikations-Sicherheit statt Netzwerk-Sicherheit

**Mitigation:**
- ⚠️ Nur in vertrauenswürdigen Netzwerken betreiben
- Für Production: TLS Termination im Ingress aktivieren
- cert-manager für automatische Let's Encrypt Zertifikate verwenden

**Production-Readiness:** NICHT akzeptabel - muss vor Go-Live implementiert werden

---

#### **5.1.2 File Upload ohne Validierung**

**Status:** ❌ Nicht implementiert

**Beschreibung:**
```javascript
// AKTUELL: Keine Validierung
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Akzeptiert ALLE Dateitypen
// Keine Größenlimits
// Keine MIME-Type Prüfung
```

**Risiko:**
- **CRITICAL**: Malware-Upload möglich
- Potenzielle Remote Code Execution (RCE) wenn Files lokal gespeichert würden
- Storage-Exhaustion durch große Dateien
- XSS durch manipulierte Bilddateien mit eingebettetem Script

**Begründung:**
- Zeitliche Priorisierung auf Authentifizierung und Authorization
- Cloudinary macht rudimentäre Content-Type Checks
- Files werden nicht lokal auf Server gespeichert (reduziert RCE-Risiko)
- Annahme: Cloudinary filtert gefährliche Inhalte

**Warum akzeptiert:**
- Files werden direkt zu Cloudinary (External Service) hochgeladen
- Kein direktes Serving von User-Uploads durch Backend
- Cloudinary hat eigene Security-Layer


**Production-Readiness:** NICHT akzeptabel - muss implementiert werden

---

#### **5.1.3 Rate Limiting fehlt**

**Status:** ❌ Nicht implementiert

**Beschreibung:**
- Keine Begrenzung von API-Requests pro User/IP
- Unendliche Login-Versuche möglich
- Keine Throttling-Mechanismen

**Risiko:**
- **HIGH**: Brute-Force Angriffe auf Login möglich
- DoS durch excessive Requests
- Resource Exhaustion (CPU, Memory, DB Connections)

**Begründung:**
- Würde zusätzliche Infrastruktur erfordern (Redis/Memcached für verteiltes Rate Limiting)
- bcrypt Cost Factor 10 verlangsamt Brute-Force bereits erheblich (~100ms pro Versuch)
- Fokus auf Applikationslogik statt Infrastructure Security
- Komplexität für MVP nicht gerechtfertigt

**Partial Mitigation:**
- bcrypt macht Brute-Force zeitintensiv (10.000 Versuche = ~16 Minuten)
- MongoDB Connection Pooling limitiert parallele DB-Zugriffe
- Kubernetes Resource Limits verhindern totale Resource-Exhaustion



**Production-Readiness:** Mittel - bcrypt bietet Basis-Schutz, aber unzureichend

---

### 5.2 Designentscheidungen mit Sicherheits-Trade-offs

#### **5.2.1 JWT in localStorage**

**Status:** ⚠️ Implementiert (suboptimal)

**Beschreibung:**
```javascript
// Frontend speichert JWT in localStorage
localStorage.setItem('token', jwtToken);

// Bei jedem Request:
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

**Risiko:**
- **MEDIUM**: XSS-Angriffe können Token stehlen
- localStorage ist von JavaScript zugänglich
- Token bleibt persistent auch nach Browser-Schließung

**Begründung:**
- Einfachste Lösung für Single Page Application (SPA)
- HttpOnly Cookies würden CORS-Handling komplizieren
- Refresh Token Rotation würde zusätzliche Komplexität bedeuten
- Vue.js sanitiert automatisch (reduziert XSS-Risiko)

**Alternative Ansätze (nicht implementiert):**
1. **HttpOnly Cookies** - Nicht von JavaScript zugreifbar, aber CORS-komplex
2. **In-Memory Storage** - Sicherer, aber verloren bei Page Refresh
3. **Refresh Token Rotation** - Sicherer, aber komplexe Implementierung

**Mitigation:**
- Token Expiry nach 7 Tagen (begrenzt Zeitfenster)
- Inactivity Timer (15 Minuten) im Frontend
- Vue.js sanitiert automatisch (XSS-Schutz)
- Content Security Policy könnte inline Scripts blockieren

**Production-Readiness:** Akzeptabel für Lernprojekt/MVP

---

#### **5.2.2 Role nicht im JWT Token**

**Status:** ⚠️ Implementiert (ineffizient)

**Beschreibung:**
```javascript
// JWT enthält NUR:
const token = jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Bei jedem Request:
const user = await User.findById(decoded.id);  // Extra DB-Query
if (user.role !== 'Admin') { ... }
```

**Risiko:**
- **LOW**: Performance-Problem (N+1 DB Queries)
- Skalierbarkeit beeinträchtigt
- Erhöhte Latenz bei jedem authorisierten Request

**Begründung:**
- Einfachere Implementierung
- Role kann sich ändern → DB ist "Source of Truth"
- Korrektheit wichtiger als Performance
- Bei Role-Änderung kein Token-Invalidierung nötig

**Trade-off:**
- **Vorteil**: Role-Änderungen wirken sofort (kein Token-Refresh nötig)
- **Nachteil**: Extra DB-Lookup bei JEDEM Request


**Production-Readiness:** Akzeptabel - Korrektheit > Performance für MVP

---


### 5.3 Bewusst nicht implementierte Security Features

#### **5.3.1 Encryption at Rest (MongoDB)**

**Status:** ❌ Nicht implementiert

**Risiko:** MEDIUM - DB-Administrator kann Daten im Klartext lesen

**Begründung:**
- MongoDB Enterprise Feature (kostenpdlichtig)
- Passwörter sind bcrypt-gehashed (sensitivste Daten geschützt)
- User-Content (Posts) hat niedrigeres Schutzbedürfnis
- Infrastruktur-Komplexität nicht gerechtfertigt

**Mitigation:**
- Wichtigste Daten (Passwords) sind gehashed
- Network Policy verhindert direkten DB-Zugriff
- DB Authentication erforderlich

**Production-Readiness:** Akzeptabel für nicht-kritische Daten

---

#### **5.3.2 Zentrales Audit Logging**

**Status:** ❌ Nicht implementiert

**Risiko:** MEDIUM - Security Events nicht zentral nachvollziehbar

**Beschreibung:**
- Keine ELK Stack (Elasticsearch, Logstash, Kibana)
- Keine Splunk oder ähnliche Log-Aggregation
- Logs nur lokal in Pods verfügbar

**Begründung:**
- Würde separate Infrastruktur erfordern
- Overhead für kleines Projekt unverhältnismäßig
- Basic Logging (console.log) ist vorhanden
- Kubernetes Logs sind abrufbar via kubectl

**Was fehlt:**
- Zentrale Log-Aggregation
- Security Event Correlation
- Alerting bei verdächtigen Aktivitäten
- Long-term Log Retention

**Production-Readiness:** Akzeptabel für MVP, kritisch für Enterprise

---

#### **5.3.3 Two-Factor Authentication (2FA)**

**Status:** ❌ Nicht implementiert (außer bei Google OAuth)

**Risiko:** MEDIUM - Gestohlene Credentials führen zu Account-Übernahme

**Begründung:**
- Komplexe Implementierung (TOTP, SMS, Email)
- Google OAuth bietet 2FA automatisch (wenn User aktiviert hat)
- Scope-Entscheidung für MVP
- UX-Komplexität

**Partial Coverage:**
- Google OAuth User haben 2FA (wenn bei Google aktiviert)
- Nur lokale Registrierung hat keine 2FA

**Production-Readiness:** Akzeptabel für Lernprojekt

---




