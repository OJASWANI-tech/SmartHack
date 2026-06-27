# 🚀 SmartHack — Intelligent Hackathon Management Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

EventWiSE is an award-winning, end-to-end event orchestration and hackathon management ecosystem designed to handle complex administrative challenges automatically. By combining **algorithmic team matching**, **real-time statistical anomaly detection**, and **automated secure access routing**, EventWiSE shifts the operational burden away from organizers, ensuring a transparent, fair, and seamless hackathon experience.

---

## 📖 Table of Contents
- [💡 The Problem & The EventWiSE Solution](#-the-problem--the-eventwise-solution)
- [🧠 Technical Innovations (Our Secret Sauce)](#-technical-innovations-our-secret-sauce)
- [⚙️ System Architecture](#️-system-architecture)
- [🛡️ Security & Sandbox Safeguards](#️-security--sandbox-safeguards)
- [📂 Codebase Structure](#-codebase-structure)
- [🚀 Quick Start & Orchestration](#-quick-start--orchestration)
- [🧪 CLI Verification Tools](#-cli-verification-tools)

---

## 💡 The Problem & The EventWiSE Solution

| Pain Point in Hackathons | The EventWiSE Solution |
| :--- | :--- |
| **Biased & Outlier Judging** | **Statistical Outlier Anomaly Engine** dynamically flags biased scorecards and halts results progression until audited. |
| **Manual, Sub-Optimal Team Matching** | **Algorithmic Matchmaker** groups participants by experience mix, institution caps, and skill sets with generative LLM rationales. |
| **Weak Authentication & Leak Risks** | **Single-Use JTI Magic Links** expire securely, preventing unauthorized access or credential leakages. |
| **Testing Inundated by Live Emails** | **Resend Sandbox Interceptors** automatically redirect non-production emails to authorized tester accounts. |

---

## 🧠 Technical Innovations (Our Secret Sauce)

### 📊 Real-Time Multi-Dimensional Anomaly Engine
Organizers often struggle with rogue or biased judging. EventWiSE implements a statistical outlier detector (Z-Score variant) running across four dimensions: *Innovation, Code Quality, Presentation,* and *Impact*. If a judge submits scores that diverge significantly from the panel average, the system:
1. Flags the team's evaluation status as `in_progress`.
2. Creates an **Approval Gate** block on stage transitions.
3. Logs the outlier's reasoning using an LLM-assisted audit trial.

### 🧩 Self-Healing State Ledger
Wiping and re-seeding databases during dry runs often leads to orphaned records. Our API router implements a **self-healing cleanup trigger** that automatically sweeps and deletes orphaned ledger rows when loading active records, ensuring consistent synchronization with no duplicates.

---

## ⚙️ System Architecture

The following diagram illustrates the flow of data from participant signup through team scoring and final anomaly checks:

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Participant/Judge
    participant FE as Frontend React App
    participant BE as FastAPI Backend
    participant Worker as Celery Worker
    participant DB as PostgreSQL
    participant Cache as Redis

    Participant->>FE: Click Magic Invite Link
    FE->>BE: GET /api/v1/tokens/verify?token=XYZ
    BE->>DB: Query Token state & JTI validation
    DB-->>BE: Active Token Data
    BE-->>FE: Authenticate Context & Allow Access
    
    Participant->>FE: Submit Evaluation Scoresheet
    FE->>BE: POST /api/v1/events/{id}/scores
    BE->>Cache: Enqueue Consolidation Task
    Cache->>Worker: Recalculate panel averages
    Worker->>Worker: Run Statistical Z-Score Outlier Check
    alt Anomaly Detected
        Worker->>DB: Insert anomaly record & raise Approval Gate
    else Clean Score
        Worker->>DB: Save Finalized Scores & unlock Leaderboard
    end
```

---

## 🛡️ Security & Sandbox Safeguards

- **Strict Sandbox Interception**: Standard emails are intercepted on staging. If the API key is marked under test, all emails (Welcome, Invite, Credentials) are safely rerouted to **`shubhtech1056@gmail.com`**.
- **JTI Replay Attack Guard**: All issued tokens include a unique cryptographic token identifier (`jti`) saved in the database. Once used or expired, the identifier is marked `revoked` and cannot be replayed.

---

## 📂 Codebase Structure

```bash
eventflow/
├── backend/                  # FastAPI Application Core
│   ├── app/
│   │   ├── api/v1/endpoints/ # API Route handlers (mentors, events, anomalies)
│   │   ├── core/             # JWT Auth, security configurations
│   │   ├── models/           # SQLAlchemy DB Models (FinalizedTeam, Score, etc.)
│   │   └── services/         # Email dispatchers & scoring matrix calculations
│   └── requirements.txt
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Universal layout structures & Skeletons
│   │   └── pages/            # Organizers, Participant, and Judge Views
│   └── package.json
├── ai_app/                   # Celery & Worker Application
│   ├── celery_app.py         # Celery configurations
│   └── tasks/                # Background tasks (LLM analyses, email dispatches)
└── docker-compose.yml        # Docker Multi-container Orchestration Config
```

---

## 🚀 Quick Start & Orchestration

### Running Everything Instantly (Docker Compose)
Ensure you have Docker and Docker Compose installed, then run:
```bash
docker-compose up --build
```
This boots:
- **FastAPI Backend** on `http://localhost:8000`
- **React Frontend** on `http://localhost:5173`
- **PostgreSQL Database** on port `5432`
- **Redis Cache & Broker** on port `6379`
- **Celery Worker** queueing task processing

---

### Manual/Local Orchestration Setup

#### 1. Setup Database & Cache
Create a local PostgreSQL database named `eventflow` and start your local Redis server.

#### 2. Configure Environment variables (`backend/.env`)
```env
DATABASE_URL=postgresql+asyncpg://postgres:<your_password>@localhost:5432/eventflow
RESEND_API_KEY=re_yourAPIKeyHere
REDIS_URL=redis://localhost:6379
```

#### 3. Start Backend API
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Synchronize Database schema
python ../init_db_tables.py

# Start Uvicorn
uvicorn app.main:app --reload --port 8000
```

#### 4. Start Celery Worker
In a new terminal window:
```bash
cd ai_app
source ../backend/venv/bin/activate
celery -A celery_app worker --loglevel=info -Q llm_queue
```

#### 5. Start React Dev Server
In another terminal window:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 CLI Verification & Diagnostics Tools

EventWiSE comes equipped with CLI scripts to run instant sanity tests on your database environment:
- **`python seed_data.py`**: Seeds initial mock participants, events, and schedules.
- **`python check_finalized_teams.py`**: Performs verification audits on finalized team entries and current score snapshots.
- **`python reset_db.py`**: Truncates transactional tables, resetting identifiers back to 1.
