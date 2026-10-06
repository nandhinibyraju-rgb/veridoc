# Veridoc — Clinical Evidence Assistant for Doctors

> *"The latest clinical evidence, graded and verified, in seconds."*

Veridoc is an evidence-based clinical decision support assistant engineered specifically for physicians and healthcare providers. A clinician asks a complex clinical question and immediately receives a structured, current synthesis of peer-reviewed clinical trials and practice guidelines. Every claim is assigned a GRADE certainty rating and grounded exclusively in live-verified NCBI PubMed data with zero fabricated citations.

---

## 1. Problem Statement

Physicians face an overwhelming flood of medical literature: over 1 million biomedical papers are published annually. During rapid bedside or outpatient consultations, doctors need authoritative, up-to-date answers in seconds. However:
- Traditional search engines and standard generative AI models hallucinate medical outcomes, invent studies, or cite non-existent PMIDs.
- Manual PubMed searches take 15–30 minutes to review, filter study designs, and appraise evidence strength.
- Critical nuances—such as conflicting trial endpoints, study age (>5 years old), and retracted publications—are easily missed under clinical time constraints.

---

## 2. Solution

Veridoc bridges the gap between raw biomedical databases and instant clinical answers:
1. **Live PubMed Querying on Every Request**: Real-time integration with NCBI PubMed E-utilities (`esearch` and `efetch`) ensures results reflect the latest published literature.
2. **Hierarchy-Based Study Ranking**: Automatically prioritizes Systematic Reviews / Meta-Analyses (Rank 100) and Randomized Controlled Trials (Rank 80) over observational or narrative literature.
3. **Automated Retraction Detection**: Flags or excludes retracted publications to protect patient safety.
4. **GRADE-Graded Evidence Synthesis**: Every finding is categorized into High, Moderate, Low, or Very Low certainty with explicit rationale.
5. **Zero-Hallucination Citation Verification**: Every PMID cited in claims is verified against the real NCBI record. Any ungrounded PMID is dropped, and reference lists are constructed exclusively from real PubMed metadata.
6. **Per-Doctor Audit Trail**: Queries are archived in a secure local database with live re-check capability as new evidence emerges.

---

## 3. Architecture

```text
+-----------------------------------------------------------------------------------------+
|                                    VERIDOC ARCHITECTURE                                  |
+-----------------------------------------------------------------------------------------+

  [ Clinician (Browser) ]
         │
         ▼  HTTP / JSON (JWT Auth)
  +─────────────────────────────────────────────────────────────+
  |  Frontend: React + Vite + Tailwind CSS                      |
  |  - Clinical Light Theme (#F8FAFC, #0F766E, #14B8A6)         |
  |  - Interactive Ask Page with 3 Clickable Case Queries       |
  |  - Bottom Line Card (Source Serif typography)               |
  |  - Graded Findings with GRADE Badges & Citation Chips       |
  |  - Verified Reference Modal & Audit History View            |
  +─────────────────────────────────────────────────────────────+
         │
         │ REST API (Bearer Token)
         ▼
  +─────────────────────────────────────────────────────────────+
  |  Backend: Node.js + Express (Port 5000)                     |
  |  - Security: Helmet, CORS client isolation, Rate Limiting   |
  |  - Input Validation: Zod schemas for all endpoints          |
  |  - Auth: JWT + bcrypt password hashing                      |
  |  - Database: SQLite via better-sqlite3 (WAL Mode)           |
  +─────────────────────────────────────────────────────────────+
         │                                       │
         ▼                                       ▼
  +─────────────────────────+          +─────────────────────────────────────────+
  |  NCBI PubMed E-Utilities|          |  Evidence Synthesis Engine              |
  |  (Live on every request)|          |                                         |
  |  1. ESearch (max 15 ids)|          |  A. Gemini LLM (Strict System Prompt)   |
  |  2. EFetch (XML parse)  |          |     - Temperature: 0.1, JSON Schema     |
  |  3. Retraction Screen   |          |     - Strict no-outside-memory rule     |
  |  4. Study Type Ranker   |          |  B. Clinical Synthesis Fallback Engine  |
  +─────────────────────────+          |     (Ensures 100% testable uptime)      |
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                             ▼
  +─────────────────────────────────────────────────────────────+
  |  Citation Verification & Reference Builder                  |
  |  - Drops any PMID not in retrieved NCBI set                 |
  |  - Generates references exclusively from PubMed XML         |
  |  - Flags studies >5 years old & retracted papers            |
  +─────────────────────────────────────────────────────────────+
```

---

## 4. Existing Solutions and How Veridoc Differs

Clinical resources like **UpToDate**, **DynaMed**, and **OpenEvidence** are powerful tools widely used across medicine. However, they typically present curated summaries where doctors must trust a "black box" of proprietary syntheses or wait months for editorial committees to refresh clinical topics.

*Note: Veridoc does not claim to be broader or more accurate than comprehensive editorial systems like UpToDate.* Instead, Veridoc differentiates itself through **transparency, immediate verification, and clinician control**:

1. **Verified Citations**: Rather than generating static text citations that clinicians must blindly trust, Veridoc provides interactive pill citation chips tied directly to live NCBI PubMed accession numbers.
2. **Where Sources Disagree**: Explicitly surfaces trial conflict areas and heterogeneous subgroup outcomes rather than flattening them into a generic consensus.
3. **Visible Evidence Age**: Immediately tags literature published more than 5 years ago (`Older evidence (>5 yrs)`), guarding against outdated therapeutic protocols.
4. **Honest Uncertainty**: Explicitly triggers an *Insufficient Published Evidence* state when randomized or systematic literature does not support a firm clinical conclusion.
5. **Per-Doctor Audit History & Live Re-check**: Maintains an individual audit log of clinical queries with a one-click *"Re-check PubMed"* capability to identify newly published trials.

---

## 5. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Axios, Lucide React
- **Backend**: Node.js, Express, Helmet, CORS, Express-Rate-Limit
- **Database**: SQLite via `better-sqlite3` (file-based in `server/data/veridoc.db`)
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` + Zod schema validation
- **Data Source**: NCBI PubMed E-utilities (`esearch.fcgi`, `efetch.fcgi`, parsed with `fast-xml-parser`)
- **AI Synthesis**: Google Gemini API (`@google/generative-ai` / `@google/genai`) with clinical fallback engine

---

## 6. Environment Variables

### Server (`server/.env`)
```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=c64a71f32377e33adc72f43b73b7cce91990a6c5e82a27b3f2e35bf655c42e3e
GEMINI_API_KEY=PASTE_KEY_HERE
NCBI_API_KEY=
```
*(Server starts smoothly even if `NCBI_API_KEY` is blank or `GEMINI_API_KEY` is a placeholder).*

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000
```

---

## 7. Setup & Running Locally

### Prerequisites
- Node.js v18+ (tested on Node v24.14)
- npm v9+

### 1. Clone & Install
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment
- Confirm `server/.env` exists (or copy from `server/.env.example`).
- Confirm `client/.env` exists (or copy from `client/.env.example`).

### 3. Start Development Servers
In two separate terminals:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

### 4. Demo Login Credentials
A pre-seeded clinician account is provided out-of-the-box:
- **Email:** `demo@veridoc.com`
- **Password:** `Demo@1234`
*(The login page includes a one-click "Click to Autofill Demo Doctor" button).*

---

## 8. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check (`{"ok": true}`) |
| `POST` | `/api/auth/register` | Public | Register new clinician (`name, email, password`) |
| `POST` | `/api/auth/login` | Public | Login clinician and receive JWT token |
| `GET` | `/api/auth/me` | JWT | Get authenticated clinician profile |
| `POST` | `/api/evidence/ask` | JWT | Execute live PubMed query, rank & synthesize |
| `GET` | `/api/evidence/history` | JWT | Retrieve clinician's query audit list |
| `GET` | `/api/evidence/history/:id` | JWT | Retrieve detailed saved inquiry and references |
| `DELETE` | `/api/evidence/history/:id`| JWT | Delete inquiry record from audit history |
| `POST` | `/api/evidence/recheck/:id`| JWT | Re-queries PubMed for updated trial evidence |
| `POST` | `/api/evidence/followup/:id`| JWT | Follow-up clinical question on existing evidence |

---

## 9. Limitations & Clinical Boundaries

- **Abstracts Only**: Veridoc synthesizes evidence strictly from abstracts indexed in PubMed. Full-text articles, institutional paywalls, supplementary statistical appendices, and unpublished registry data are not parsed.
- **Decision Support Only**: Veridoc is an informational clinical decision support tool. It does **not** constitute medical advice and is not a substitute for clinical judgment, individualized diagnostic workup, or institution-specific clinical guidelines.

---

## 10. Deployment Steps

### Frontend Deployment (Vercel)
1. Push repository to GitHub/GitLab.
2. In Vercel, import the repository and set the **Root Directory** to `client`.
3. Set the Environment Variable:
   - `VITE_API_URL` = `https://your-backend-service.onrender.com`
4. The included `client/vercel.json` ensures client-side routing rewrites all routes to `/index.html`.
5. Deploy.

### Backend Deployment (Render)
1. In Render, create a new **Web Service** connected to your repository.
2. Set **Root Directory** to `server`.
3. Build Command: `npm install`
4. Start Command: `npm run start`
5. Set Environment Variables:
   - `PORT` = `5000` (or leave default, Render injects `PORT`)
   - `CLIENT_URL` = `https://your-client.vercel.app`
   - `JWT_SECRET` = `<generate strong random secret>`
   - `GEMINI_API_KEY` = `<your Google Gemini API key>`
   - `NCBI_API_KEY` = `<optional NCBI key>`
6. Deploy.
