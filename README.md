

#  Projektübersicht: Social Media Dashboard

##  Thema
**Social Media Dashboard**

##  Beschreibung
Ziel ist die **Erstellung eines Social Media Dashboards** mit integrierter **Bilder-Upload-Funktion** und **Account-Verwaltung**.  
Das Dashboard soll es Benutzern ermöglichen, Inhalte (z. B. Bilder oder Posts) sicher hochzuladen, zu verwalten.

---

##  Hauptfunktionen

### 1.  Bilder-Upload
- Upload von Bildern über das Dashboard (Drag & Drop oder Dateiauswahl)
- Automatische Komprimierung und Formatprüfung (z. B. JPG, PNG, WebP)
- Speicherung in **Cloudinary**

### 2.  Account-Erstellung & Verwaltung
- Registrierung mit E-Mail und sicherem Passwort (Passwort-Hashing)
- Login über sicheres Authentifizierungsverfahren 
- Multi-Faktor-Authentifizierung (MFA)
- Rollenbasiertes Berechtigungssystem (Admin, User)

---

##  Sicherheitsanforderungen (Kurzüberblick)

| Nr. | Requirement | Beschreibung / Maßnahme |
|-----|--------------|--------------------------|
| 1 | Sichere Authentifizierung | OAuth 2.0 / OpenID Connect, MFA, RBAC |
| 2 | Verschlüsselung sensibler Daten | TLS 1.3, AES-256, keine Klartext-Tokens |
| 3 | Schutz vor Web-Sicherheitslücken | Input Validation, CSRF-Token, sichere Cookies |
| 4 | Logging & Monitoring | Zentrales Log-System, Alerts bei Anomalien |
| 5 | API-Sicherheit | Secrets Vaults, Token-Rotation, Rate Limiting |
| 6 | Sichere Passwörter | Mindestlänge, Komplexität, Hashing |
| 7 | Automatisches Logout | Session-Timeout nach Inaktivität |

---

##  Systemarchitektur

###  Frontend
- **Framework:** Vue.js  
- **Beschreibung:**  
  Benutzeroberfläche für Uploads, Dashboard-Ansichten und Account-Verwaltung.  
  Kommunikation mit dem Backend über REST-APIs (Axios oder Fetch).  

###  Backend
- **Technologie:** Node.js (Express)  
- **Beschreibung:**  
  API-Server für Authentifizierung, Upload-Verarbeitung, Datenmanagement und Sicherheit.  
  Verbindung zur Datenbank und Integration mit Cloudinary für Bildspeicherung.  

###  Datenbank
- **Datenbank:** MongoDB  
- **Beschreibung:**  
  Speicherung von Benutzerdaten, Upload-Metadaten und Sitzungsinformationen.  

###  Speicher
- **Dienst:** Cloudinary  
- **Beschreibung:**  
  Cloud-basierte Bildspeicherung mit automatischer Skalierung, CDN und Optimierung.  

###  Containerisierung & Deployment
- **Container:** Docker  
- **Orchestrierung:** Kubernetes  
- **Beschreibung:**  
  Skalierbares Deployment von Frontend, Backend und Datenbank über Container.  

###  CI/CD-Pipeline
- **Tool:** GitHub Actions  
- **Beschreibung:**  
  Automatisiertes Build-, Test- und Deployment-Setup für kontinuierliche Integration und Auslieferung.  

---

## Schnellstart

### Backend starten (mit TLS/HTTPS)

```bash
cd Code/social-media-dashboard/backend

# Zertifikate generieren (einmalig)
node generate-certs.js

# TLS aktivieren und starten
$env:TLS_ENABLED="true"
npm start
```

**Ergebnis:** Backend läuft auf `https://localhost:5000` mit TLS-Verschlüsselung

### Frontend starten

```bash
cd Code/social-media-dashboard/frontend

npm install
npm run dev
```

**Ergebnis:** Frontend läuft auf `http://localhost:5173`

### Docker Compose starten (mit TLS)

```bash
cd Code/social-media-dashboard

docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend:** https://localhost:5000 (mit TLS)
- **MongoDB:** localhost:27017

---

## TLS/HTTPS Konfiguration

Die Anwendung ist **TLS-ready** mit selbstsigniertem Zertifikat:

| Komponente | TLS-Status | Zertifikat |
|-----------|-----------|-----------|
| Backend | ✅ HTTPS | `certs/server.crt` + `certs/server.key` |
| Docker | ✅ HTTPS | Auto-generiert beim Build |
| Kubernetes | ✅ HTTPS | cert-manager ready (Let's Encrypt) |

**Zertifikat-Details:**
- Gültig für 365 Tage
- CN: localhost
- RSA 2048-Bit
- Selbstsigniert (Entwicklung/Testing)

**Für Production:** Verwende echte Zertifikate (Let's Encrypt, CA-signiert)

