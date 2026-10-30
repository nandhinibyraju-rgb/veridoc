# VERYNTH — AI-Powered Code Migration Engine

> *"Automated, verified library migrations using Qwen2.5-Coder-7B-Instruct with zero breaking regressions."*

VERYNTH is an end-to-end code migration engine designed to safely transition software repositories across major breaking API changes. Powered by Alibaba Cloud's open-weight **Qwen2.5-Coder-7B-Instruct** model (with a deterministic pattern-matching fallback engine), VERYNTH scans project dependencies, detects deprecated API invocations, synthesizes semantic code patches, displays side-by-side diffs, and executes automated verification tests before approving code changes.

---

## 1. Problem Statement

Modern software stacks deteriorate rapidly as dependencies deprecate and remove legacy interfaces:
- **Breaking Library Upgrades**: In Pandas 2.0+, `DataFrame.append()` was permanently removed in favor of `pd.concat()`. Running unmigrated legacy pipelines raises immediate `AttributeError: 'DataFrame' object has no attribute 'append'`.
- **Nuanced Behavioral Regressions**: Naive search-and-replace often introduces subtle bugs—such as automatically appending `ignore_index=True` when the original code relies on index preservation, corrupting joined data downstream.
- **Dependabot Limitations**: Traditional dependency tools flag outdated versions or open pull requests that bump version numbers in `requirements.txt`, but they **cannot refactor code semantics** or guarantee test passes.
- **Developer Overhead**: Manual migrations require reading deprecation guides, tracking every call site, rewriting boilerplate, and validating test suites—taking days of senior engineering time.

---

## 2. The VERYNTH Solution

VERYNTH delivers an automated, self-healing migration workflow:
1. **Automated Repository & Dependency Analysis**: Scans source trees (`.py`), parses package manifests (`requirements.txt`), and identifies exact line numbers of deprecated API calls.
2. **Precision Migration Synthesis**: Leverages **Qwen2.5-Coder-7B-Instruct** (via Ollama) to generate idiomatic replacements preserving:
   - Index behavior (retains original indices; only applies `ignore_index=True` if original append specified it).
   - Column structures and data types.
   - Comments, docstrings, and surrounding logic.
3. **Deterministic Fallback Engine**: If Ollama or GPU resources are offline, a rule-based deterministic migration engine guarantees 100% operational uptime for standard transformation rules.
4. **Isolated Test Verification**: Executes the project's test suite against the migrated code in an isolated temporary staging directory, verifying that all tests pass before migration approval.
5. **Human-in-the-Loop Review**: Side-by-side code comparison highlighting original vs. modified code with full syntax styling and test output panels.
6. **Immutable Audit History**: Every import, analysis, migration generation, test execution, and approval/rejection event is logged with timestamps, duration metrics, and user attribution.

---

## 3. Architecture

```text
+-----------------------------------------------------------------------------------------+
|                                    VERYNTH ARCHITECTURE                                 |
+-----------------------------------------------------------------------------------------+

  [ Developer / Browser ]
         │
         ▼  HTTP / REST (JWT Auth)
  +─────────────────────────────────────────────────────────────+
  |  Frontend: React + Vite + Vanilla CSS                       |
  |  - Obsidian (#0A0D14), Champagne Titanium, Glacier Teal     |
  |  - Three.js Interactive Particle Animation Canvas           |
  |  - Project Dashboard with Real-Time AI Engine Status        |
  |  - Side-by-Side Code Diff Viewer & Test Results Runner       |
  |  - Migration Audit History Timeline                         |
  +─────────────────────────────────────────────────────────────+
         │
         │ REST API (Bearer Token)
         ▼
  +─────────────────────────────────────────────────────────────+
  |  Backend: Node.js + Express (Port 5000)                     |
  |  - Security: Helmet, CORS client isolation, Path validation |
  |  - Auth: JWT + bcrypt password hashing                      |
  |  - Database: SQLite via better-sqlite3 (WAL Mode)           |
  +─────────────────────────────────────────────────────────────+
         │                                       │
         ▼                                       ▼
  +─────────────────────────+          +─────────────────────────────────────────+
  |  Static Analyzer        |          |  AI Migration Engine                    |
  |  - requirements.txt     |          |                                         |
  |  - AST & Regex Scanner  |          |  A. Qwen2.5-Coder-7B-Instruct (Ollama)  |
  |  - Deprecation Catalog  |          |     - Temperature: 0.1, Strict Prompts  |
  |  - Line-level pinpoint  |          |  B. Deterministic Rule Engine           |
  +─────────────────────────+          |     (100% testable uptime guarantee)    |
         │                             +─────────────────────────────────────────+
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                             ▼
  +─────────────────────────────────────────────────────────────+
  |  Verification Test Runner                                   |
  |  - Isolated temporary staging environment                   |
  |  - Safe project path enforcement (trusted demo project)     |
  |  - Subprocess execution with UTF-8 encoding & timeout caps  |
  |  - Real test output capture and assertion verification      |
  +─────────────────────────────────────────────────────────────+
```

---

## 4. Open-Weight Model & Licensing

- **Model Used**: `qwen2.5-coder:7b-instruct` (Alibaba Cloud Qwen team)
- **Model Architecture**: 7.61 billion parameters, state-of-the-art code reasoning, fill-in-the-middle capability, and 128k context support.
- **Model License**: **Apache 2.0** (Open Source / Open Weight).
- **Application License**: **MIT License** (see [LICENSE](file:///c:/Users/nandh/OneDrive/Desktop/medical/LICENSE)).

---

## 5. Technology Stack

- **Frontend**: React 19, Vite, Three.js (WebGL 3D background animation), Vanilla CSS (Custom Design System: Obsidian `#0A0D14`, Champagne Titanium `#E5D5B8`, Glacier Teal `#00F0FF`, JetBrains Mono & Inter typography), Axios, React Router.
- **Backend**: Node.js, Express, Helmet, CORS, better-sqlite3.
- **Database**: SQLite (`server/data/verynth.db`, WAL Mode, automatic foreign keys).
- **AI Engine**: Ollama API (`http://localhost:11434/api/generate`) with `qwen2.5-coder:7b-instruct`, plus a deterministic regex/AST transformation engine.
- **Test Runner**: Python 3.x with Pandas (supports Pandas 2.x / 3.x verification).

---

## 6. Setup & Running Locally

### Prerequisites
- **Node.js**: v18+ (tested on Node v24+)
- **Python**: v3.10+ with `pandas` installed (`pip install pandas`)
- **Ollama (Optional)**: If running local LLM inference, install [Ollama](https://ollama.com/) and pull the model:
  ```bash
  ollama run qwen2.5-coder:7b-instruct
  ```
  *(Note: If Ollama is not running, VERYNTH automatically engages its built-in deterministic engine).*

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/nandhinibyraju-rgb/veridoc.git
cd veridoc

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Configuration
Verify `server/.env` configuration:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secure_random_jwt_secret_here
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b-instruct
```

Verify `client/.env` configuration:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Build & Run

**Production / Unified Mode (Frontend mounted on Backend):**
```bash
# Build frontend
cd client
npm run build

# Start backend server
cd ../server
node src/index.js
# Access app at: http://localhost:5000
```

**Development Mode (Separate Terminals):**
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
# Access app at: http://localhost:5173
```

---

## 7. Demo Credentials & Reproducible Walkthrough

### Pre-Seeded Credentials
- **Email:** `demo@verynth.dev`
- **Password:** `Demo@1234`
*(Autofill button available on login page).*

### Reproducible Demonstration Steps
1. **Sign In**: Navigate to `http://localhost:5000/login` and log in with the demo account.
2. **Import Demo Project**: On `/dashboard`, click **"Import Pandas Demo Project"**. This mounts the trusted sample data pipeline (`demo-project/src/data_pipeline.py`).
3. **Analyze Deprecations**: Click **"Analyze Dependencies"**. The engine scans the project, identifying Pandas 1.4 requirements and 9 instances of deprecated `DataFrame.append()`.
4. **Generate Migration**: Select target `Pandas 2.x` and click **"Generate AI Migration"**. The model transforms all `df.append()` calls to `pd.concat()` while preserving index semantics.
5. **Inspect Diff**: Review the side-by-side original and migrated code views.
6. **Execute Tests**: Click **"Run Verification Tests"**. All 7 unit tests execute in an isolated environment and pass cleanly (`7 passed, 0 failed`).
7. **Approve Migration**: Click **"Approve Migration"** to finalize.
8. **Audit Trail**: Navigate to `/history` to inspect the complete cryptographic audit trail.

---

## 8. Verification & Test Evidence

### Unmigrated Code (Fails on Pandas 2.x/3.x)
```text
Running 7 tests...

  ✓ test_load_sales_data passed
  ✓ test_load_returns_data passed
  ✗ test_merge_transactions FAILED: 'DataFrame' object has no attribute 'append'
  ✗ test_merge_preserves_dtypes FAILED: 'DataFrame' object has no attribute 'append'
  ✗ test_add_summary_row FAILED: 'DataFrame' object has no attribute 'append'
  ✗ test_build_quarterly_report FAILED: 'DataFrame' object has no attribute 'append'
  ✗ test_categorize_products FAILED: 'DataFrame' object has no attribute 'append'

Results: 2 passed, 5 failed, 7 total
```

### Migrated Code (Passes 100%)
```text
Running 7 tests...

  ✓ test_load_sales_data passed
  ✓ test_load_returns_data passed
  ✓ test_merge_transactions passed
  ✓ test_merge_preserves_dtypes passed
  ✓ test_add_summary_row passed
  ✓ test_build_quarterly_report passed
  ✓ test_categorize_products passed

Results: 7 passed, 0 failed, 7 total
```

---

## 9. Security Verification & Boundaries

- **Sandboxing Boundaries**: Test execution is strictly restricted to the pre-authorized trusted demo project path (`demo-project`). Arbitrary repository test execution is disabled to prevent command injection and unauthorized file modifications.
- **Path Traversal Protection**: All filesystem operations validate paths against pre-approved whitelists using canonical `path.resolve()` checks.
- **Credential Safety**: No `.env` secrets or API tokens are checked into git. `.gitignore` explicitly prevents database artifacts (`*.db`) and sensitive configurations from being tracked.
- **Authentication**: All mutation endpoints (`/api/projects/*`, `/api/migrations/*`) require valid JWT bearer tokens with standard header validation.

---

## 10. Known Limitations

- **Language Scope**: Currently optimized for Python library migrations (specifically Pandas, with extensible architecture for NumPy and SciPy).
- **Single-File Isolation**: Inter-file dependency graphs requiring whole-repository refactoring are processed file-by-file.
- **Execution Sandboxing**: Current test runner relies on local subprocess execution within a temporary directory; production enterprise deployment would utilize Docker containers or Firecracker microVMs.

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
The underlying AI model Qwen2.5-Coder-7B-Instruct is licensed under the [Apache 2.0 License](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct).
