# Poker Lab

> **Elevator Pitch:** Poker Lab is a specialized study tool for NLHE cash game players designed to bridge the gap between messy raw hand histories and actionable tactical insights. It streamlines the off-table workflow by automating hand parsing into a normalized PostgreSQL database, providing real-time equity calculations via Monte Carlo simulations, and offering a heuristic-based "Trainer Mode" that quizzes users on their actual played spots to sharpen post-flop decision-making.

## Features

- [x] **PokerStars HH Importer**: State-machine parser handles raw text hand histories and stores normalized relational data.
- [x] **Analytics Dashboard**: Visualizes VPIP, PFR, 3-Bet%, and C-Bet frequency.
- [x] **Interactive Replayer**: Street-by-street visualization with pot progression tracking and position-aware layouts.
- [x] **Equity Calculator**: Monte Carlo hand-vs-range engine with range notation support such as `QQ+`, `AKs`, and `22-55`.
- [x] **Mini Trainer Mode**: Auto-generates quizzes from imported hands and grades decisions using pot odds, MDF, and equity heuristics.

## Tech Stack

| Technology | Role | Rationale |
| :--- | :--- | :--- |
| **Next.js 14** | Full-stack framework | Keeps the UI and API routes in one application using the App Router. |
| **Prisma** | ORM | Provides type-safe database access and a schema-driven data model. |
| **PostgreSQL** | Database | Provides a production-ready relational database for normalized hand, player, and action data. |
| **Tailwind CSS** | Styling | Provides utility-first responsive styling. |
| **TypeScript** | Language | Shares domain types across the parser, equity, and web packages. |
| **Vitest** | Testing | Tests parser and equity behavior in isolation. |

## System Design

```mermaid
graph TD
    A[Raw Hand History .txt] -->|PokerStarsParser| B(Normalized JSON)
    B -->|Prisma| C[(PostgreSQL DB)]
    C -->|Analytics Queries| D[Dashboard UI]
    C -->|Hand Selection| E[Trainer Engine]

    F[Hand + Board] -->|Monte Carlo Engine| G[Equity Results]
    E -->|Heuristics + Equity| H[Grading Rubric]
    H -->|Feedback| I[User Interface]

    subgraph "Packages"
        Parser[@poker-lab/parser]
        Equity[@poker-lab/equity]
        Shared[@poker-lab/shared]
    end
```

## Data Model

- **Hand**: Stores hand metadata such as site ID, timestamp, stakes, board cards, and pot total.
- **PlayerInHand**: Links players to hands, stores table position and stack information, and tracks hole cards when available.
- **Action**: Stores each fold, check, call, bet, and raise in sequence across all streets.

## Core Logic

### 1. Hand Parsing

The `@poker-lab/parser` package uses regular expressions plus state tracking to convert PokerStars hand histories into structured data.

- **Position mapping**: Calculates BTN, SB, BB, UTG, and related positions from the button seat and table size.
- **Street tracking**: Tracks preflop, flop, turn, and river state while parsing actions.
- **Validation**: Normalizes parsed data before it is persisted through Prisma.

### 2. Equity Calculator

The `@poker-lab/equity` package estimates hand-vs-range equity with Monte Carlo sampling.

- Filters invalid villain combinations that conflict with known cards.
- Supports common range notation such as `QQ+`, `77-TT`, and `AKs`.
- Repeated scenarios can reuse cached results.

### 3. Trainer Mode

Trainer Mode selects decisions from imported hands and compares the user's choice with poker-math heuristics.

- Uses pot odds, estimated equity, and Minimum Defense Frequency (MDF).
- Provides educational feedback rather than claiming to produce exact GTO solutions.

## Setup & Run

### Prerequisites

- Node.js 18+
- npm
- A PostgreSQL database

### 1. Clone and install

```bash
npm install
```

### 2. Configure the database

Copy the example environment file:

```bash
cp apps/web/.env.example apps/web/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
```

Then update `DATABASE_URL` in `apps/web/.env` with your PostgreSQL connection string.

Example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pokerlab?schema=public"
```

### 3. Initialize the schema

```bash
npm run db:push
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Testing

Run package tests from the repository root:

```bash
npm test
```

## Troubleshooting

- **Node/npm not found**: Install Node.js 18+ and ensure it is available on your PATH.
- **Database connection error**: Verify PostgreSQL is running and that `DATABASE_URL` points to a valid database.
- **Prisma schema not found**: Run the provided npm scripts from the repository root.
- **Port 3000 already in use**: Start Next.js on a different port, for example `npm run dev -- --port 3001`.

## Limitations & Roadmap

- Current parser support is focused on PokerStars hand histories.
- Side-pot and multi-way equity support are limited.
- Future work could add additional poker-site formats, richer multi-way analysis, and solver-output integrations.

## Ethics & Intended Use

Poker Lab is intended for **off-table study only**. Using real-time assistance during active play may violate poker-site rules and terms of service.
