# Threat Modeling - Social Media Dashboard

## 1. Systemmodell & Data Flow Diagram (DFD)

### 1.1 Systemkomponenten

| Komponente | Beschreibung | Technologie |
|------------|--------------|-------------|
| **User (Browser)** | Endnutzer der Webanwendung | Chrome/Firefox/Safari |
| **Frontend** | Vue.js Single Page Application | Vue 3 + TypeScript + Vite |
| **Backend API** | RESTful API Server | Node.js + Express (Port 5000) |
| **MongoDB** | NoSQL Datenbank | MongoDB 7.x (Port 27017) |
| **Google OAuth** | Externer Authentifizierungsdienst | Google Identity Services |
| **Cloudinary** | Externer Media Storage | Cloudinary API |
| **CI/CD Pipeline** | Workflow nach jedem Push auf Main | GitHub Actions |
| **Kubernetes Cluster** | Container Orchestrierung | K3D (TLS-ready) |

### 1.2 Data Flow Diagram mit Vertrauensgrenzen

![DFD-Diagramm](https://github.com/user-attachments/assets/1feb87cc-0272-4623-86e4-005f0201fb92)

### 1.3 Vertrauensgrenzen (Trust Boundaries)

| ID | Grenze | Von | Nach | Beschreibung |
|----|--------|-----|------|--------------|
| **TB-0** | Internet | User | Frontend | Öffentliches Internet, keine Vertrauensstellung |
| **TB-1** | HTTP/HTTPS | User Browser | Ingress | TLS-ready aber in Dev: HTTP (TLS_ENABLED=false) |
| **TB-2** | DMZ | Ingress | Frontend | Innerhalb K3D Cluster, aber öffentlich erreichbar |
| **TB-3** | API Gateway | Frontend | Backend | JWT Auth + HTTPS-ready (Dev: HTTP, Prod: HTTPS) |
| **TB-4** | Backend Zone | Backend | Internal Services | Service-to-Service Kommunikation |
| **TB-5** | External API | Backend | Cloudinary | HTTPS mit API Keys |
| **TB-6** | Database | Backend | MongoDB | MongoDB Authentication + Network Policy |
| **TB-7** | Database Zone | - | MongoDB | Isolierte Datenbank, nur Backend-Zugriff |
| **TB-8** | CI/CD | GitHub Actions | K3D | Image-Deployment auf K3D |

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
| **S** | MITM Attack (Man-in-the-Middle) | KRITISCH | - TLS 1.3 Encryption<br>- HSTS Headers | ✅ JA (TLS-Ready: Backend hat TLS Support, Zertifikate generiert)<br>⚠️ Dev-Mode: TLS_ENABLED=false für lokales Testing |
| **T** | Credential Stuffing | HOCH | - Strong Password Policy (min 10 chars)<br>- bcrypt Hashing<br>- Rate Limiting | ⚠️ TEILWEISE (Rate Limiting fehlt) |
| **I** | Password Leakage in Transit | KRITISCH | - HTTPS/TLS Encryption | ✅ JA (wenn TLS aktiviert) |

#### **Datenfluss 2: Backend → MongoDB (Data Query)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **T** | NoSQL Injection via Query | HOCH | - Parameterized Queries (Mongoose)<br>- Input Sanitization | ✅ JA |
| **I** | Unencrypted Connection | MITTEL | - TLS für MongoDB Connection<br>- Verschlüsselung at Rest | ❌ NEIN (MongoDB läuft auf mongodb://localhost:27017 ohne TLS) |

#### **Datenfluss 3: Backend → Cloudinary (Image Upload)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | API Key Theft | HOCH | - Environment Variables<br>- Secrets Rotation | ⚠️ TEILWEISE (Env Vars, keine Rotation) |
| **T** | Malicious File Upload | HOCH | - File Type Validation<br>- File Size Limits<br>- Virus Scanning | ⚠️ TEILWEISE (Basic Validation) |
| **I** | Uploaded Files accessible without Auth | MITTEL | - Cloudinary Access Control<br>- Signed URLs | ❌ NEIN (Public URLs) |

#### **Datenfluss 4: CI/CD → Kubernetes (Deployment)**

| STRIDE | Bedrohung | Risiko | Gegenmaßnahme | Implementiert? |
|--------|-----------|--------|---------------|----------------|
| **S** | Compromised Pipeline Account | KRITISCH | - Service Account mit Minimal Permissions<br>- RBAC in Kubernetes | ✅ SA implementiert |
| **T** | Malicious Code Injection | KRITISCH | - Code Review + PR Approvals<br>- SAST/SCA Scans<br>- Image Signing | ⚠️ TEILWEISE |
| **I** | Secrets Leakage in Logs | HOCH | - Secret Scanning (Gitleaks)<br>- Masked Secrets in CI Logs | ✅ Secret Scanning implementiert |
| **E** | Pipeline runs with Admin Rights | HOCH | - Least Privilege Service Account<br>- Namespace Isolation | ✅ Implementiert |

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

## 3. Attack Tree – Worst Case: Vollständige Kompromittierung der Datenbank (MongoDB)

Ziel des Angreifers: Persistenter Admin‑Zugriff auf MongoDB, vollständige Exfiltration und Manipulation aller Daten (Users, Posts), inkl. Passwort‑Hashes und Metadaten.

```
                         ┌────────────────────────────────────────────┐
                         │ ROOT: MongoDB vollständig kompromittiert   │
                         │ (Admin-Zugriff + Datenexfiltration)        │
                         └───────────────┬────────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │         OR          │
                              └──────────┬──────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          │                              │                              │
          ▼                              ▼                              ▼
  PATH A: Netz-Exposition         PATH B: Zugangsdaten‑Kompromiss  PATH C: App‑Layer Angriff
  (Direkter DB-Zugriff)           (Creds/Secrets Leak)             (Injection/Bypass)
          │                              │                              │
   ┌──────┴──────┐                ┌──────┴──────┐                ┌──────┴──────┐
   │ A1: Port    │                │ B1: .env    │                │ C1: NoSQL   │
   │ 27017 offen │                │/Config Leak │                │ Injection   │
   └──────┬──────┘                └──────┬──────┘                └──────┬──────┘
          │                              │                              │
   ┌──────┴──────┐                ┌──────┴──────┐                ┌──────┴──────┐
   │ A2: Kein    │                │ B2: Schwache │               │ C2: Auth‑    │
   │ Network     │                │ DB‑Passwörter│               │ Bypass via   │
   │ Policy      │                │/Reuse        │               │ gestohlenes  │
   └──────┬──────┘                └──────┬──────┘               │ JWT/Role     │
          │                              │                       └──────────────┘
   ┌──────┴──────┐                ┌──────┴──────┐                
   │ A3: Remote  │                │ B3: K3D/CI  │
   │ Zugriff per │                │ Secret Leak │
   │ mongosh     │                └─────────────┘
   └─────────────┘

          ┌──────────────────────────────────────────────────────────┐
          │                 KONVERGENZ (ANY)                         │
          └───────────────┬──────────────────────────────────────────┘
                          │
                          ▼
              Admin‑Zugriff auf MongoDB (readWriteAnyDatabase)
                          │
          ┌───────────────┴────────────────────────┐
          │                AND                      │
          └───────────────┬────────────────────────┘
                          │
                          ▼
              Daten‑Dump (mongodump/aggregation) + Manipulation
                          │
                          ▼
              Persistenz (neuer Admin‑User, Backdoor‑Trigger)
```

Details pro Pfad und Gegenmaßnahmen

- PATH A – Netz‑Exposition
  - A1: Port 27017 extern erreichbar; Scanner (Shodan/Nmap) finden offene MongoDB.
  - A2: Keine Kubernetes NetworkPolicies; seitlicher Zugriff aus kompromittiertem Pod.
  - A3: Direkter Zugriff via `mongosh`/`mongodump` mit erratenen/geleakten Creds.
  - Gegenmaßnahmen: NetworkPolicies (deny‑all, nur Backend → DB), Service nicht extern exposen, IP‑Allowlist, Firewall, Kubernetes `ClusterIP` für MongoDB.

- PATH B – Zugangsdaten‑Kompromiss
  - B1: Leaks aus `.env`, ConfigMaps, Logs oder Git‑Historie (DB URI/User/Pass).
  - B2: Schwache/rotierte Passwörter fehlen; Reuse across envs → leicht zu bruten.
  - B3: Secret‑Leak aus CI/K3D (ServiceAccount, falsch gesetzte RBAC/Secrets).
  - Gegenmaßnahmen: Secret‑Management (K3D Secrets/External Vault), regelmäßige Rotation, starke Passwörter, `Least Privilege` für DB‑User, CI RBAC hardening.

- PATH C – App‑Layer Angriff
  - C1: NoSQL Injection/unsichere Queries → unautorisierter DB‑Zugriff über Backend.
  - C2: Auth‑Bypass mit gestohlenem Admin‑JWT/fehlerhafter RBAC → privilegierte DB‑Operationen via API.
  - Gegenmaßnahmen: strikte Input‑Validierung/Sanitization (Entfernung `$`/`.`), Parametrisierung, Defense‑in‑Depth (RBAC im Backend + DB‑Rollen getrennt), kurze Token‑TTL, HttpOnly Cookies statt localStorage.

Exfiltration, Manipulation, Persistenz (nach Admin‑Zugriff)

- Daten‑Exfiltration: `mongodump --archive`, große Aggregationsqueries, Export Collections.
- Manipulation: Update/Delete ganzer Collections, Passwort‑Hash‑Ersetzung, Rollenänderungen.
- Persistenz: Neuer Admin‑User, Änderung Auth‑Mechanismen, Backdoor‑Trigger über Scheduled Jobs.

Mitigation ‑ Priorisierte Maßnahmen (Top 10)

1. Kubernetes NetworkPolicies: nur Backend → MongoDB, deny‑all default.
2. Secrets Hardening: K3D Secrets/Vault, keine Secrets in Logs/Repos.
3. Passwort‑Policy für DB‑User: starke, unique, regelmäßige Rotation.
4. DB‑Rollen trennen: `read`/`write` getrennt, kein `readWriteAnyDatabase` im App‑User.
5. TLS für DB‑Verbindung: `mongodb+srv`/TLS erzwingen, Zertifikate verwalten.
6. IP‑Allowlist/Firewall: nur Cluster‑intern, keine öffentliche Exposition von 27017.
7. CI/CD RBAC: Least Privilege, getrennte Namespaces, Secret‑Zugriff minimieren.
8. Audit/Change Streams: DB‑Änderungen nachverfolgbar, Alarmierung bei Admin‑Aktionen.
9. Backup/Restore Schutz: Signierte/verschlüsselte Backups, Zugriff nur für Backup‑Service.
10. App‑Layer Schutz: strikte Validierung, Rate‑Limiting, kurze Token‑TTL, HttpOnly Cookies.

Attack Path Metrics (DB‑fokussiert)

| Attack Path | Schwierigkeit | Wahrscheinlichkeit | Impact    | Priorität |
|-------------|---------------|--------------------|-----------|-----------:|
| A1/A2 (Netz) | NIEDRIG       | MITTEL             | KRITISCH  | 1         |
| B1/B3 (Secrets) | MITTEL     | MITTEL             | KRITISCH  | 2         |
| C1 (NoSQL)   | HOCH          | NIEDRIG            | KRITISCH  | 3         |
| C2 (Auth‑Bypass) | MITTEL    | NIEDRIG            | HOCH      | 4         |
| Backup‑Missbrauch | MITTEL   | NIEDRIG            | KRITISCH  | 5         |

Hinweis: Diese DB‑zentrierte Darstellung ersetzt den bisherigen System‑Worst‑Case und richtet alle Maßnahmen auf die Verhinderung einer Datenbank‑Kompromittierung aus.


