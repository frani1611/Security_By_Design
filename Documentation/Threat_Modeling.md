# Threat Modeling - Social Media Dashboard

## 1. Systemmodell & Data Flow Diagram (DFD)

### 1.1 Systemkomponenten

| Komponente | Beschreibung | Technologie |
|------------|--------------|-------------|
| **User (Browser)** | Endnutzer der Webanwendung | Chrome/Firefox/Safari |
| **Frontend** | Vue.js Single Page Application | Vue 3 + TypeScript + Vite |
| **Backend API** | RESTful API Server | Node.js + Express |
| **MongoDB** | NoSQL Datenbank | MongoDB 7.x |
| **Google OAuth** | Externer Authentifizierungsdienst | Google Identity Services |
| **Cloudinary** | Externer Media Storage | Cloudinary API |
| **CI/CD Pipeline** | GitHub Actions | YAML Workflows |
| **Kubernetes Cluster** | Container Orchestrierung | K8s |

### 1.2 Data Flow Diagram mit Vertrauensgrenzen

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET (Trust Boundary 0)                 │
│                                                                       │
│  ┌──────────┐                                    ┌─────────────────┐│
│  │  User    │◄──────────TLS 1.3──────────────────┤  Google OAuth   ││
│  │ (Browser)│                                     │   (External)    ││
│  └────┬─────┘                                     └─────────────────┘│
│       │                                                               │
│       │ HTTPS (Trust Boundary 1)                                     │
│       │                                                               │
└───────┼───────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DMZ / FRONTEND ZONE (Trust Boundary 2)            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Kubernetes Ingress                            ││
│  │                  (TLS Termination + Routing)                     ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   Frontend Service (Vue.js)                      ││
│  │              - Static Assets (HTML/JS/CSS)                       ││
│  │              - Client-Side Routing                               ││
│  │              - JWT Token Storage (localStorage)                  ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
                               │ HTTP/REST API (Trust Boundary 3)
                               │ Bearer Token (JWT)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND ZONE (Trust Boundary 4)                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Backend Service (Node.js)                     ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │  Controllers:                                               │ ││
│  │  │  - authController.js (Login/Register)                      │ ││
│  │  │  - googleAuthController.js (OAuth)                         │ ││
│  │  │  - uploadController.js (Media Upload)                      │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │  Middleware:                                                │ ││
│  │  │  - auth.middleware.js (JWT Verification)                   │ ││
│  │  │  - validation.js (Input Sanitization)                      │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  └──────────────────┬───────────────────────┬─────────────────────┘│
│                     │                       │                        │
│                     │                       │ HTTPS API              │
│                     │                       │ (Trust Boundary 5)     │
│                     │                       ▼                        │
│                     │            ┌─────────────────────┐             │
│                     │            │   Cloudinary API    │             │
│                     │            │  (External Service) │             │
│                     │            └─────────────────────┘             │
│                     │                                                 │
└─────────────────────┼─────────────────────────────────────────────────┘
                      │
                      │ MongoDB Protocol (Trust Boundary 6)
                      │ Authentication Required
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE ZONE (Trust Boundary 7)                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    MongoDB StatefulSet                           ││
│  │  Collections:                                                    ││
│  │  - users (username, email, passwordHash, googleId, role)        ││
│  │  - posts (userId, content, imageUrl, createdAt)                 ││
│  │  - sessions (optional: for token blacklisting)                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                 CI/CD ZONE (Trust Boundary 8)                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      GitHub Actions Pipeline                     ││
│  │  - Code Push → Tests → SAST/SCA → Build → Sign → Deploy        ││
│  │  - Secrets Management (GitHub Secrets)                          ││
│  │  - Container Registry Access                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.3 Vertrauensgrenzen (Trust Boundaries)

| ID | Grenze | Von | Nach | Beschreibung |
|----|--------|-----|------|--------------|
| **TB-0** | Internet | User | Frontend | Öffentliches Internet, keine Vertrauensstellung |
| **TB-1** | HTTPS | User Browser | Ingress | TLS-verschlüsselt, Certificate Validation |
| **TB-2** | DMZ | Ingress | Frontend | Innerhalb K8s Cluster, aber öffentlich erreichbar |
| **TB-3** | API Gateway | Frontend | Backend | JWT-basierte Authentifizierung erforderlich |
| **TB-4** | Backend Zone | Backend | Internal Services | Service-to-Service Kommunikation |
| **TB-5** | External API | Backend | Cloudinary | HTTPS mit API Keys |
| **TB-6** | Database | Backend | MongoDB | MongoDB Authentication + Network Policy |
| **TB-7** | Database Zone | - | MongoDB | Isolierte Datenbank, nur Backend-Zugriff |
| **TB-8** | CI/CD | GitHub Actions | K8s Cluster | Service Account mit minimalen Rechten |

---

## 2. STRIDE Threat Analysis

### 2.1 STRIDE-Kategorien Übersicht

| Kategorie | Beschreibung | Status |
|-----------|--------------|--------|
| **S - Spoofing** | Identitätsfälschung | ✅ Implementiert |
| **T - Tampering** | Datenmanipulation | ✅ Implementiert |
| **R - Repudiation** | Abstreitbarkeit von Aktionen | ⚠️ Teilweise implementiert |
| **I - Information Disclosure** | Informationsleck | ✅ Implementiert |
| **D - Denial of Service** | Dienstverweigerung | ❌ Nicht implementiert |
| **E - Elevation of Privilege** | Rechteausweitung | ✅ Implementiert |

---

## 2.2 STRIDE-Analyse pro Komponente

### **Komponente 1: User Authentication Flow**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | Angreifer gibt sich als legitimer User aus | HOCH | - bcrypt Password Hashing (10 rounds)<br>- JWT Tokens mit Signatur<br>- Google OAuth 2.0 mit ID Token Verification | ✅ JA |
| **T** | Manipulation von JWT Tokens | HOCH | - JWT Signatur mit HS256 (JWT_SECRET)<br>- Token Expiry (7 Tage)<br>- Token Validation in Middleware | ✅ JA |
| **R** | User bestreitet Login-Aktionen | MITTEL | - Logging von Login-Events (IP, Timestamp)<br>- Security Event Monitoring | ⚠️ TEILWEISE (Basic Logging vorhanden) |
| **I** | Passwort-Hashes werden geleakt | HOCH | - bcrypt mit Salting (automatisch)<br>- Keine Passwörter in Logs<br>- Generische Error Messages | ✅ JA |
| **D** | Brute-Force Login Versuche | MITTEL | - Rate Limiting (nicht implementiert)<br>- Account Lockout (nicht implementiert) | ❌ NEIN |
| **E** | User erhält Admin-Rechte | HOCH | - RBAC (Role-Based Access Control)<br>- Default Role: "User"<br>- Role Validation in Middleware | ✅ JA |

---

### **Komponente 2: Frontend (Vue.js SPA)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | Session Hijacking via XSS | HOCH | - HttpOnly Cookies (nicht genutzt, JWT in localStorage)<br>- Content Security Policy (CSP) | ⚠️ TEILWEISE (localStorage statt HttpOnly) |
| **T** | Manipulation von Client-Side Code | MITTEL | - Subresource Integrity (SRI)<br>- Code Minification & Obfuscation | ❌ NEIN (Vue Build Standard) |
| **R** | User-Aktionen sind nicht nachvollziehbar | NIEDRIG | - Client-Side Event Tracking<br>- Audit Logs | ❌ NEIN |
| **I** | Sensitive Data in localStorage | MITTEL | - Verschlüsselung von Tokens<br>- Vermeidung von sensiblen Daten im Browser | ⚠️ TEILWEISE (JWT ohne Verschlüsselung) |
| **D** | Frontend DoS durch übermäßige Requests | NIEDRIG | - Rate Limiting auf Client-Side<br>- Debouncing/Throttling | ❌ NEIN |
| **E** | Client manipuliert API-Anfragen | MITTEL | - Server-Side Validation (unabhängig von Client)<br>- JWT Authorization Checks | ✅ JA |

---

### **Komponente 3: Backend API (Node.js/Express)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | API Impersonation | HOCH | - JWT Verification in Middleware<br>- Google ID Token Validation | ✅ JA |
| **T** | NoSQL Injection (MongoDB) | HOCH | - Input Sanitization (validation.js)<br>- Removal of $ and . operators<br>- Mongoose Schema Validation | ✅ JA |
| **T** | Parameter Tampering | HOCH | - Strict Input Validation (email, username, password)<br>- Type Checking<br>- Length Limits | ✅ JA |
| **R** | API-Aktionen ohne Audit Trail | MITTEL | - Security Logging mit isSuspicious Flag<br>- Structured Logging | ⚠️ TEILWEISE (nur Security Events) |
| **I** | Sensitive Data Leakage in Errors | HOCH | - Generic Error Messages für User<br>- Detailed Logs nur Server-Side<br>- Keine Stack Traces in Production | ✅ JA |
| **I** | MongoDB Connection String Exposure | KRITISCH | - Environment Variables (.env)<br>- Secrets Management (nicht in Git) | ✅ JA |
| **D** | API Rate Limiting fehlt | MITTEL | - Express Rate Limiter<br>- Request Throttling | ❌ NEIN |
| **D** | Large Payload DoS | NIEDRIG | - Body Parser Limits<br>- File Upload Size Limits | ⚠️ TEILWEISE (Express Standard) |
| **E** | Role Bypass | HOCH | - Middleware prüft User Role<br>- RBAC Implementation | ✅ JA |

---

### **Komponente 4: MongoDB Database**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | Unauthorized Database Access | KRITISCH | - MongoDB Authentication (username/password)<br>- Network Policy (nur Backend-Zugriff) | ⚠️ TEILWEISE (Auth ja, Network Policy fehlt) |
| **T** | Direct Database Manipulation | HOCH | - Application-Level Access Control<br>- Mongoose Middleware/Hooks | ✅ JA |
| **R** | Datenänderungen ohne Audit | MITTEL | - Change Streams (MongoDB)<br>- Audit Logging | ❌ NEIN |
| **I** | Data Exfiltration | HOCH | - Verschlüsselung at Rest (MongoDB Enterprise)<br>- Minimale Berechtigungen für DB User | ❌ NEIN (Encryption at Rest) |
| **D** | Database DoS | MITTEL | - Connection Pooling<br>- Query Timeouts<br>- Resource Limits | ⚠️ TEILWEISE (Standard Config) |
| **E** | Database User Privilege Escalation | HOCH | - Least Privilege Principle<br>- Separate Users für Read/Write | ❌ NEIN (Ein User für alles) |

---

### **Komponente 5: Datenflüsse über Trust Boundaries**

#### **Datenfluss 1: User → Frontend → Backend (Login)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | MITM Attack (Man-in-the-Middle) | KRITISCH | - TLS 1.3 Encryption<br>- HSTS Headers | ⚠️ TEILWEISE (TLS-Ready, aber nicht erzwungen) |
| **T** | Credential Stuffing | HOCH | - Strong Password Policy (min 10 chars)<br>- bcrypt Hashing<br>- Rate Limiting | ⚠️ TEILWEISE (Rate Limiting fehlt) |
| **I** | Password Leakage in Transit | KRITISCH | - HTTPS/TLS Encryption | ✅ JA (wenn TLS aktiviert) |

#### **Datenfluss 2: Backend → MongoDB (Data Query)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **T** | NoSQL Injection via Query | HOCH | - Parameterized Queries (Mongoose)<br>- Input Sanitization | ✅ JA |
| **I** | Unencrypted Connection | MITTEL | - TLS für MongoDB Connection<br>- Verschlüsselung at Rest | ❌ NEIN |

#### **Datenfluss 3: Backend → Cloudinary (Image Upload)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | API Key Theft | HOCH | - Environment Variables<br>- Secrets Rotation | ⚠️ TEILWEISE (Env Vars, keine Rotation) |
| **T** | Malicious File Upload | HOCH | - File Type Validation<br>- File Size Limits<br>- Virus Scanning | ⚠️ TEILWEISE (Basic Validation) |
| **I** | Uploaded Files accessible without Auth | MITTEL | - Cloudinary Access Control<br>- Signed URLs | ❌ NEIN (Public URLs) |

#### **Datenfluss 4: CI/CD → Kubernetes (Deployment)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | Compromised Pipeline Account | KRITISCH | - Service Account mit Minimal Permissions<br>- RBAC in Kubernetes | ⚠️ TEILWEISE (SA fehlt) |
| **T** | Malicious Code Injection | KRITISCH | - Code Review + PR Approvals<br>- SAST/SCA Scans<br>- Image Signing | ❌ NEIN (Pipeline fehlt noch) |
| **I** | Secrets Leakage in Logs | HOCH | - Secret Scanning (Gitleaks)<br>- Masked Secrets in CI Logs | ❌ NEIN |
| **E** | Pipeline runs with Admin Rights | HOCH | - Least Privilege Service Account<br>- Namespace Isolation | ❌ NEIN |

---

## 2.3 Zusammenfassung: Implementierte vs. Nicht-Implementierte STRIDE-Kategorien

### ✅ **IMPLEMENTIERT (3 Kategorien):**

#### **1. Spoofing (S) - Identitätsfälschung**
**Warum implementiert:**
- Kritisches Risiko für Authentifizierung
- Mehrere Angriffsvektoren (JWT, OAuth, Session Hijacking)

**Gegenmaßnahmen:**
- ✅ bcrypt Password Hashing (10 rounds, auto-salting)
- ✅ JWT Token Signing mit HS256 Algorithmus
- ✅ Google OAuth 2.0 mit ID Token Verification
- ✅ Token Expiry (7 Tage)
- ✅ Middleware für JWT Validation


---

#### **2. Tampering (T) - Datenmanipulation**
**Warum implementiert:**
- Hohe Priorität für Datenintegrität
- Direkte Auswirkung auf Business Logic

**Gegenmaßnahmen:**
- ✅ NoSQL Injection Prevention (Input Sanitization)
- ✅ Removal von `$` und `.` Operatoren aus User Input
- ✅ Strict Input Validation (Email, Username, Password)
- ✅ JWT Signature Verification (verhindert Token Tampering)
- ✅ Mongoose Schema Validation
- ✅ Type Checking und Length Limits


---

#### **3. Elevation of Privilege (E) - Rechteausweitung**
**Warum implementiert:**
- Kritisch für Access Control
- Verhindert horizontale/vertikale Privilege Escalation

**Gegenmaßnahmen:**
- ✅ RBAC (Role-Based Access Control) im User Model
- ✅ Default Role: "User" (nicht "Admin")
- ✅ Role Validation in Middleware
- ✅ JWT enthält User Role
- ✅ Server-Side Authorization Checks (unabhängig vom Client)



### ⚠️ **TEILWEISE IMPLEMENTIERT (1 Kategorie):**

#### **4. Information Disclosure (I) - Informationsleck**
**Status: ~70% implementiert**

**Implementierte Maßnahmen:**
- ✅ Generische Error Messages für User ("Invalid input")
- ✅ Detaillierte Logs nur Server-Side
- ✅ Keine Stack Traces in Production
- ✅ Environment Variables für Secrets (nicht in Git)
- ✅ bcrypt Salting (keine Rainbow Table Attacks)

**Fehlende Maßnahmen:**
- ❌ TLS nicht erzwungen (nur "TLS-Ready")
- ❌ Keine Encryption at Rest für MongoDB
- ❌ JWT in localStorage (nicht HttpOnly Cookie)
- ❌ Cloudinary URLs sind public (keine Signed URLs)

**Begründung für Teilimplementierung:**
- Basismechanismen vorhanden, aber Infrastruktur-Layer (TLS, Encryption) fehlt noch
- Für Entwicklung/Prototyp ausreichend, für Production kritisch

---

### ❌ **NICHT IMPLEMENTIERT (2 Kategorien):**

#### **5. Repudiation (R) - Abstreitbarkeit**
**Warum NICHT implementiert:**

**Technische Begründung:**
- Logging-Infrastruktur (ELK Stack, Loki, Splunk) erfordert erheblichen Setup-Aufwand
- Audit Trails benötigen zentrale Log-Aggregation und langfristige Storage
- Nicht kritisch für MVP/Prototyp

**Aktuelle Situation:**
- ⚠️ Basic Security Logging vorhanden (Login-Events, Injection-Versuche)
- ⚠️ Keine strukturierten Audit Logs mit Correlation IDs
- ⚠️ Keine Log Retention Policy
- ⚠️ Keine Tamper-Proof Logging (z.B. Blockchain-basiert)

**Was fehlt:**
- ❌ Zentrales Log Management System
- ❌ User Action Tracking (wer hat was wann gemacht)
- ❌ Non-Repudiation durch digitale Signaturen
- ❌ Audit Trail für Datenbankänderungen (MongoDB Change Streams)

**Risiko-Bewertung:**
- Risiko: MITTEL (User kann Aktionen abstreiten)
- Impact: NIEDRIG für Social Media App (keine Financial Transactions)
- Priorität: NIEDRIG (für Phase 2)

**Empfohlene Implementierung (Zukunft):**
```yaml
# Beispiel: ELK Stack Integration
logging:
  - Elasticsearch (Log Storage)
  - Logstash (Log Processing)
  - Kibana (Visualization)
  - Filebeat (Log Shipping)
```

---

#### **6. Denial of Service (D) - Dienstverweigerung**
**Warum NICHT implementiert:**

**Technische Begründung:**
- Rate Limiting benötigt Redis oder In-Memory Store
- DDoS-Schutz wird typischerweise auf Infrastruktur-Layer gehandhabt (Cloudflare, AWS Shield)
- Kubernetes bietet bereits Resource Limits (CPU/Memory)
- Nicht primäres Risiko für internen/kleinen Prototyp

**Aktuelle Situation:**
- ⚠️ Kubernetes Resource Limits vorhanden (requests/limits in Deployment)
- ⚠️ Express Body Parser hat Standard-Limits
- ❌ Kein Application-Level Rate Limiting
- ❌ Kein Account Lockout nach fehlgeschlagenen Login-Versuchen
- ❌ Keine Brute-Force Protection

**Was fehlt:**
- ❌ Rate Limiting (z.B. express-rate-limit mit Redis)
- ❌ IP-basiertes Blocking
- ❌ CAPTCHA für Login/Register
- ❌ Request Throttling/Debouncing
- ❌ Connection Pooling Limits

**Risiko-Bewertung:**
- Risiko: MITTEL (Brute-Force möglich, aber aufwendig durch bcrypt)
- Impact: MITTEL (Service Downtime)
- Priorität: MITTEL (für Phase 2, wenn öffentlich erreichbar)



**Warum vertretbar:**
- bcrypt mit Cost Factor 10 verhindert effektiv Brute-Force (~100ms pro Hash)
- Kubernetes Resource Limits schützen vor Resource Exhaustion
- Für internen Prototyp/Testing ausreichend

---

## 3. Attack Tree - Worst Case Szenario

### **Worst Case: Vollständige Kompromittierung des Systems mit Datenexfiltration**

**Ziel des Angreifers:** Admin-Zugriff erlangen + alle User-Daten (Passwörter, Posts, persönliche Infos) stehlen

```
                    ┌─────────────────────────────────────────────┐
                    │  ZIEL: Vollständige System-Kompromittierung  │
                    │  + Datenexfiltration aller User-Daten       │
                    └───────────────────┬─────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │          OR (Einer reicht)            │
                    └───────────┬───────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
                ▼                                ▼
    ┌───────────────────────┐      ┌───────────────────────────┐
    │  PATH 1: Frontend     │      │  PATH 2: Backend/DB       │
    │  Compromise           │      │  Direct Access            │
    └───────────┬───────────┘      └─────────────┬─────────────┘
                │                                  │
                │                                  │
    ┌───────────┴─────────────────┐   ┌───────────┴──────────────────┐
    │                             │   │                              │
    ▼                             ▼   ▼                              ▼
┌─────────┐               ┌─────────┐ ┌─────────┐            ┌──────────┐
│ 1.1 XSS │               │ 1.2 JWT │ │ 2.1 SQL │            │ 2.2 K8s  │
│ Attack  │               │ Theft   │ │ Injection│            │ Exploit  │
└────┬────┘               └────┬────┘ └────┬────┘            └─────┬────┘
     │                         │           │                       │
     │                         │           │                       │
```

### **Detaillierter Attack Tree:**

```
┌───────────────────────────────────────────────────────────────────┐
│                    ROOT: System Compromise                        │
│              (Admin Access + Data Exfiltration)                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │         OR            │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐   ┌───────────────────┐   ┌─────────────────┐
│  PATH A:      │   │    PATH B:        │   │   PATH C:       │
│  Frontend     │   │    Backend API    │   │   Infrastructure│
│  Exploitation │   │    Exploitation   │   │   Exploitation  │
└───────┬───────┘   └─────────┬─────────┘   └────────┬────────┘
        │                     │                       │
        │                     │                       │
────────┴─────────────────────┴───────────────────────┴────────


═══════════════════════════════════════════════════════════════════
PATH A: Frontend Exploitation
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│  A.1: Cross-Site Scripting (XSS) Attack         │
│  Schwierigkeit: MITTEL | Impact: HOCH           │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ A.1.1  │    │ A.1.2   │    │  A.1.3   │
   │Find XSS│    │ Inject  │    │  Steal   │
   │Entry   │───►│Malicious│───►│  JWT     │
   │Point   │    │ Script  │    │  Token   │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Comment       <script>        localStorage
   Field         payload         .getItem('token')
   Post Title    alert(1)
   Profile Bio


   Gegenmaßnahmen:
   ❌ Kein Content Security Policy (CSP)
   ⚠️  Vue.js sanitiert automatisch (v-html nicht genutzt)
   ❌ JWT in localStorage (nicht HttpOnly Cookie)


┌─────────────────────────────────────────────────┐
│  A.2: Session Hijacking via Network Sniffing    │
│  Schwierigkeit: NIEDRIG | Impact: HOCH          │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ A.2.1  │    │ A.2.2   │    │  A.2.3   │
   │ MITM   │───►│ Sniff   │───►│  Replay  │
   │ Setup  │    │ JWT     │    │  Token   │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Public WiFi   Wireshark      Authorization:
   ARP Spoofing  tcpdump        Bearer <token>
   DNS Hijack


   Gegenmaßnahmen:
   ⚠️  TLS-Ready aber nicht erzwungen
   ❌ Kein HSTS Header
   ✅ Token Expiry (7 Tage) - begrenzt Window


┌─────────────────────────────────────────────────┐
│  A.3: Phishing Attack on User Credentials       │
│  Schwierigkeit: NIEDRIG | Impact: MITTEL        │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ A.3.1  │    │ A.3.2   │    │  A.3.3   │
   │ Clone  │───►│ Send    │───►│  Harvest │
   │ Login  │    │ Phishing│    │  Creds   │
   │ Page   │    │ Email   │    │          │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Copy HTML/CSS  Social Eng.    POST to
   Fake Domain    Urgent Link    Real API
   
   
   Gegenmaßnahmen:
   ⚠️  Keine 2FA/MFA (nur Google SSO optional)
   ❌ Kein Email Verification
   ✅ bcrypt macht Credential Stuffing ineffizient


═══════════════════════════════════════════════════════════════════
PATH B: Backend API Exploitation
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│  B.1: NoSQL Injection Attack                    │
│  Schwierigkeit: HOCH | Impact: KRITISCH         │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ B.1.1  │    │ B.1.2   │    │  B.1.3   │
   │ Find   │───►│ Inject  │───►│  Extract │
   │ Input  │    │ Payload │    │  Data    │
   │ Point  │    │         │    │          │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   /api/auth/login  {"username":   All users
   email param      {"$ne": null}}  passwords
   
   Beispiel Payload:
   POST /api/auth/login
   {
     "email": {"$ne": null},
     "password": {"$ne": null}
   }
   
   Ergebnis ohne Schutz: Login als erster User (oft Admin)
   
   Gegenmaßnahmen:
   ✅ Input Sanitization (validation.js)
   ✅ Removal von $ und . Operatoren
   ✅ Type Checking (nur Strings erlaubt)
   ✅ Mongoose Schema Validation


┌─────────────────────────────────────────────────┐
│  B.2: JWT Token Forging / Manipulation          │
│  Schwierigkeit: SEHR HOCH | Impact: KRITISCH    │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ B.2.1  │    │ B.2.2   │    │  B.2.3   │
   │ Obtain │───►│ Crack   │───►│  Forge   │
   │ Valid  │    │ JWT     │    │  Admin   │
   │ JWT    │    │ Secret  │    │  Token   │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Phishing/XSS   Brute-Force    jwt.io mit
   Network Sniff  Dictionary     role: "Admin"
   
   Angriff:
   - JWT Secret aus .env leaken (z.B. Git History)
   - Oder: Brute-Force JWT Secret (falls schwach)
   - Token manipulieren: { "role": "Admin" }
   
   Gegenmaßnahmen:
   ✅ JWT_SECRET in Environment Variable
   ✅ .env nicht in Git (in .gitignore)
   ⚠️  Keine Secret Rotation
   ❌ Secret könnte schwach sein (manuell gesetzt)


┌─────────────────────────────────────────────────┐
│  B.3: API Brute-Force Attack                    │
│  Schwierigkeit: NIEDRIG | Impact: MITTEL        │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ B.3.1  │    │ B.3.2   │    │  B.3.3   │
   │ Collect│───►│ Brute   │───►│  Access  │
   │ Valid  │    │ Force   │    │  Account │
   │ Emails │    │ Passwords│    │          │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Social Media   Hydra/Burp      Use valid
   OSINT          rockyou.txt     credentials
   
   Angriff:
   - Liste von echten Emails sammeln
   - Passwort-Wörterbuch (rockyou.txt)
   - Automatisierte Login-Versuche
   
   Gegenmaßnahmen:
   ✅ bcrypt Cost Factor 10 (~100ms) verlangsamt Brute-Force
   ❌ Kein Rate Limiting (unbegrenzte Versuche möglich)
   ❌ Kein Account Lockout nach X Fehlversuchen
   ❌ Keine CAPTCHA


┌─────────────────────────────────────────────────┐
│  B.4: Malicious File Upload (Cloudinary)        │
│  Schwierigkeit: MITTEL | Impact: HOCH           │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ B.4.1  │    │ B.4.2   │    │  B.4.3   │
   │ Upload │───►│ Execute │───►│  Exploit │
   │ Malware│    │ Script  │    │  Users   │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   .svg mit       XSS via Image   Drive-by
   <script>       Render          Download
   
   Angriff:
   POST /api/upload
   Content-Type: image/svg+xml
   <svg><script>alert(document.cookie)</script></svg>
   
   Gegenmaßnahmen:
   ⚠️  Basic File Type Validation (Multer)
   ❌ Kein Virus Scanning
   ❌ Keine Content Type Verification (nur Extension)
   ⚠️  Cloudinary macht Sanitization (teilweise)


═══════════════════════════════════════════════════════════════════
PATH C: Infrastructure Exploitation
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│  C.1: Kubernetes Pod Escape                     │
│  Schwierigkeit: SEHR HOCH | Impact: KRITISCH    │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ C.1.1  │    │ C.1.2   │    │  C.1.3   │
   │ Exploit│───►│ Escape  │───►│  Access  │
   │ Pod    │    │ to Node │    │  Cluster │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   CVE-2022-xxx   Container       kubectl
   Vulnerable     Breakout        secrets
   Image
   
   Angriff:
   - Privileged Container ausnutzen
   - Mount Host Filesystem
   - Access to /var/run/docker.sock
   
   Gegenmaßnahmen:
   ❌ Kein runAsNonRoot: true
   ❌ Kein readOnlyRootFilesystem
   ❌ allowPrivilegeEscalation nicht gesetzt
   ❌ Capabilities nicht gedroppt


┌─────────────────────────────────────────────────┐
│  C.2: MongoDB Direct Access (Network)           │
│  Schwierigkeit: MITTEL | Impact: KRITISCH       │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ C.2.1  │    │ C.2.2   │    │  C.2.3   │
   │ Access │───►│ Brute   │───►│  Dump    │
   │ MongoDB│    │ Force   │    │  Database│
   │ Port   │    │ Auth    │    │          │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Port 27017     Weak Password   mongodump
   exposed        admin/admin     --all
   
   Angriff:
   - MongoDB Port von außen erreichbar
   - Default Credentials testen
   - Direkter DB-Zugriff ohne Application Layer
   
   Gegenmaßnahmen:
   ⚠️  MongoDB Authentication aktiviert
   ❌ Keine Network Policy (Port 27017 offen)
   ❌ Keine IP Whitelist
   ✅ MongoDB nur intern (mongodb-service)


┌─────────────────────────────────────────────────┐
│  C.3: CI/CD Pipeline Compromise                 │
│  Schwierigkeit: HOCH | Impact: KRITISCH         │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴───────────┐
            │        AND           │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │ C.3.1  │    │ C.3.2   │    │  C.3.3   │
   │ Steal  │───►│ Inject  │───►│  Deploy  │
   │ GitHub │    │ Backdoor│    │  Malware │
   │ Secrets│    │ Code    │    │          │
   └────────┘    └─────────┘    └──────────┘
      │              │                │
      │              │                │
   Phishing       Malicious PR    Auto-deploy
   Repo Access    Supply Chain    to Prod
   
   Angriff:
   - GitHub Account Compromise (Developer)
   - Secrets in Workflow Files leaken
   - Malicious Dependency (npm package)
   - Pipeline deployed ohne Review
   
   Gegenmaßnahmen:
   ❌ Keine Secret Scanning (Gitleaks)
   ❌ Keine SAST/SCA in Pipeline
   ❌ Keine Image Signing
   ❌ Keine Branch Protection (PR Review Required)


═══════════════════════════════════════════════════════════════════
KRITISCHER PFAD (Höchste Wahrscheinlichkeit)
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│         MOST LIKELY ATTACK PATH (Lowest Complexity)             │
└─────────────────────────────────────────────────────────────────┘

    A.2 (Network Sniffing)
         │ 
         ▼
    HTTP Traffic (kein TLS)
         │
         ▼
    JWT Token Theft
         │
         ▼
    Replay Attack (Token noch gültig, 7 Tage)
         │
         ▼
    Vollständiger Account-Zugriff
         │
         ▼
    [ODER] → Admin Account → Voller System-Zugriff
    [ODER] → User Account → Persönliche Daten

Schwierigkeit: NIEDRIG
Wahrscheinlichkeit: HOCH (ohne TLS)
Impact: KRITISCH
Dauer: < 1 Stunde


═══════════════════════════════════════════════════════════════════
ZWEITER KRITISCHER PFAD (Höchster Impact)
═══════════════════════════════════════════════════════════════════

    B.1 (NoSQL Injection)
         │
         ▼
    Bypass Input Validation (falls Lücke)
         │
         ▼
    MongoDB Query Manipulation
         │
         ▼
    Admin Login ohne Password
         │
         ▼
    Voller Datenbankzugriff
         │
         ▼
    Exfiltration aller User-Daten

Schwierigkeit: HOCH (dank validation.js)
Wahrscheinlichkeit: NIEDRIG
Impact: KRITISCH
Dauer: 2-4 Stunden (Exploit-Entwicklung)


═══════════════════════════════════════════════════════════════════
Zusammenfassung: Attack Path Metrics
═══════════════════════════════════════════════════════════════════

| Attack Path | Schwierigkeit | Wahrscheinlichkeit | Impact    | Priorität |
|-------------|---------------|--------------------|-----------|-----------:|
| A.2 (MITM)  | NIEDRIG       | HOCH (ohne TLS)    | KRITISCH  | 1         |
| B.3 (Brute) | NIEDRIG       | MITTEL             | MITTEL    | 2         |
| A.3 (Phish) | NIEDRIG       | MITTEL             | MITTEL    | 3         |
| B.1 (NoSQL) | HOCH          | NIEDRIG            | KRITISCH  | 4         |
| C.2 (DB)    | MITTEL        | NIEDRIG            | KRITISCH  | 5         |
| B.4 (Upload)| MITTEL        | MITTEL             | HOCH      | 6         |
| C.3 (CI/CD) | HOCH          | NIEDRIG            | KRITISCH  | 7         |
| C.1 (K8s)   | SEHR HOCH     | SEHR NIEDRIG       | KRITISCH  | 8         |
| A.1 (XSS)   | MITTEL        | NIEDRIG            | HOCH      | 9         |
| B.2 (JWT)   | SEHR HOCH     | SEHR NIEDRIG       | KRITISCH  | 10        |
```

---


