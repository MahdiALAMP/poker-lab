# Poker Lab 🃏🔬

![Poker Lab Demo](docs/demo.gif)

> **Elevator Pitch:** Poker Lab is a specialized study tool for NLHE cash game players designed to bridge the gap between messy raw hand histories and actionable tactical insights. It streamlines the off-table workflow by automating hand parsing into a normalized SQLite database, providing real-time equity calculations via Monte Carlo simulations, and offering a heuristic-based "Trainer Mode" that quizzes users on their actual played spots to sharpen post-flop decision-making.

## 🚀 Features

- [x] **PokerStars HH Importer**: Robust state-machine parser handles messy text formats into a normalized relational DB.
- [x] **Analytics Dashboard**: Instant visualization of VPIP, PFR, 3-Bet%, and C-Bet frequency.
- [x] **Interactive Replayer**: Street-by-street visualization with pot progression tracking and position-aware layouts.
- [x] **Equity Calculator**: High-performance Monte Carlo engine (Hand vs. Range) with a flexible range notation parser (e.g., `QQ+, AKs, 22-55`).
- [x] **Mini Trainer Mode**: Auto-generated 10-question quizzes from your own hands, grading decisions (Green/Yellow/Red) based on pot odds, MDF, and equity heuristics.

## 🛠 Tech Stack

| Technology | Role | Rationale |
| :--- | :--- | :--- |
| **Next.js 14** | Full-stack Framework | Unified API routes and Frontend; App Router for excellent SEO/performance. |
| **Prisma** | ORM | Type-safe database queries and automated schema migrations. |
| **SQLite** | Database | Zero-config, portable, and lightning-fast for single-user local study environments. |
| **Tailwind CSS** | Styling | Modern, responsive UI with custom glassmorphism components. |
| **TypeScript** | Language | Domain-driven design with shared types across parser, equity, and web packages. |

## 📐 System Design

```mermaid
graph TD
    A[Raw Hand History .txt] -->|PokerStarsParser| B(Normalized JSON)
    B -->|Prisma| C[(SQLite DB)]
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

## 📊 Data Model

- **Hand**: Stores metadata (site ID, timestamp, stakes, board cards, pot total).
- **PlayerInHand**: Links players to hands, calculating positions (BTN, SB, BB, etc.) and tracking hole cards (if shown).
- **Action**: Granular tracking of every fold, check, call, bet, and raise across all streets.

## 🧠 Core Logic

### 1. Hand Parsing
The `@poker-lab/parser` package uses a robust regular expression-based state machine. 
- **Key Edge Case**: Correctly calculating table positions (UTG, HJ, CO, BTN) regardless of whether the table is 2-max (Heads Up), 6-max, or full ring.
- **Invariants**: Ensures pot totals match the sum of individual actions to detect parsing errors early.

### 2. Equity Calculator
Uses a **Monte Carlo approach** in `@poker-lab/equity`.
- **Performance**: Skips invalid hands in the villain range (dead cards) and runs ~10,000 simulations per second.
- **Caching**: Results are cached by `(Hand, Board, Range)` to provide instant feedback when re-calculating common scenarios.

### 3. Trainer Mode
The trainer selects "Hero Defending" scenarios (facing a C-bet).
- **Grading**: Uses a rubric based on **Pot Odds** vs. **Equity** and **Minimum Defense Frequency (MDF)**.
- **Honesty Note**: These are *heuristics*, not GTO solutions. The tool focuses on teaching the "math of the game" rather than exact solver frequencies.

## 💻 Setup & Run

Follow these steps to get Poker Lab running on your machine (**Windows PowerShell Safe**):

1.  **Clone & Install**
    ```powershell
    npm install
    ```

2.  **Initialize Database**
    ```powershell
    npm run db:push
    ```

3.  **Run Development Server**
    ```powershell
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠 Troubleshooting

- **Node/npm not found**: Ensure [Node.js](https://nodejs.org/) (v18+) is installed and added to your PATH.
- **Prisma Schema Path**: If you see "Schema not found", ensure you are running commands from the root directory.
- **DATABASE_URL**: The project uses `.env` with `file:./dev.db`. Create this file if it's missing.
- **Port already in use**: If 3000 is busy, run `PORT=3001 npm run dev`.

## ⚠️ Limitations & Roadmap

- **Current Limitations**: Does not support side pots, multi-way equity (Hand vs. Range vs. Range), or non-PokerStars formats.
- **Roadmap**: 
    - Support for GGPoker and Ignition hand histories.
    - Multi-way pot support.
    - Integration with simple solver outputs for more precise Trainer grading.

## ⚖️ Ethics & Intended Use

Poker Lab is intended for **off-table study only**. Using this tool or its logic (RTA - Real Time Assistance) during active play is a violation of most poker site terms of service and is considered cheating. Study hard, play fair.
