# Interview Walkthrough: Poker Lab

Use this guide to prepare for technical interviews. It highlights the most impressive aspects of the project, including design decisions, technical hurdles, and scalability considerations.

---

## 🕒 The Elevator Pitch

### 30-Second Version
"I built **Poker Lab**, a full-stack study tool for professional poker players. It automates the process of importing raw hand histories into a specialized SQLite database, calculates real-time hand equity using a Monte Carlo engine, and features an interactive 'Trainer Mode' that generates quizzes from the user's own data. It’s built with Next.js, Prisma, and a multi-package Monorepo architecture."

### 2-Minute Version
"The core problem Poker Lab solves is the friction in off-table study. Pro players generate thousands of text-based hand histories that are difficult to analyze manually. I built a custom **state-machine parser** in TypeScript to normalize this data. 

On the frontend, I used **Next.js** for a sleek, dashboard-driven experience. One of the technical highlights is the **Equity Calculator package** I wrote, which uses Monte Carlo simulations to estimate win percentages against specific hand ranges. 

I also implemented a **Trainer Mode** that uses heuristics like Pot Odds and Minimum Defense Frequency (MDF) to grade a player's decisions in real-time. It’s not just a dashboard; it’s an active learning tool that bridges the gap between raw data and tactical improvement."

---

## 🛠 Key Technical Challenges & Solutions

### 1. Robust Parsing of Messy HH Formats
*   **Challenge**: PokerStars (and other sites) hand histories are plain text with varying whitespace, regional date formats, and complex action sequences (like multi-way all-ins).
*   **Solution**: I implemented a **State Machine Parser** using regex. Instead of a naive line-by-line approach, the parser tracks the 'current street' and maintains invariants (e.g., the pot total must always equal the sum of actions).
*   **Key Detail**: Positions calculation. I wrote logic to handle 2-max to 9-max tables, correctly identifying the 'Button' and then mapping SB, BB, UTG, etc., relative to the dealer seat.

### 2. Monte Carlo Equity Engine
*   **Challenge**: Calculating exact equity (hand vs range) is computationally expensive (O(N!) for all outcomes).
*   **Solution**: I implemented a **Monte Carlo simulator**. By sampling 10,000+ random board runouts, we get a statistically significant result in under 100ms.
*   **Optimization**: I built a **Caching Layer** in the equity package. Since ranges (like `AKs, QQ+`) are reused frequently, hashing the range and board state allows for near-instant retrieval.

### 3. Training & Grading Heuristics
*   **Challenge**: Building a 'solver' is a PhD-level task. I needed a way to provide feedback without a multi-terabyte GTO (Game Theory Optimal) solution.
*   **Solution**: I used **Calculated Heuristics**. The trainer compares the user's equity against the calculated Pot Odds. If your equity is > Pot Odds + a buffer, it's a 'Green' call. This teaches the fundamental math of the game rather than just memorizing 'correct' answers.

---

## ⚖️ Tradeoffs & Design Decisions

*   **Why SQLite?**: It’s a local study tool. Users want portability and zero setup. SQLite provides full relational power without the overhead of a Docker container or hosted DB.
*   **Why Next.js?**: The App Router allowed me to handle the heavy SQL analytics on the server while keeping the UI snappy.
*   **Why a Monorepo?**: By splitting the `parser`, `equity`, and `shared` logic into separate packages, I made the codebase more maintainable and testable in isolation.

---

## 🚀 "If I Had More Time..." (Roadmap)
*   **Multi-Site Support**: Adding parsers for GGPoker and Bovada/Ignition.
*   **Side Pot Logic**: Currently, the parser is optimized for simple pot structures; handling complex 3-4 way side pots is the next depth.
*   **Real Solver Integration**: Exporting hands to `.json` formats compatible with PIOSolver or GTO Wizard.

---

## 💬 Common Interviewer Q&A

**Q: How does the range parser work?**
A: "It uses a recursive tokenization strategy. It handles standard notation like `QQ+`, `77-TT`, and `AKs`. It expands these into a list of all possible 1,326 hole card combinations, which are then used as the sample pool for the Monte Carlo engine."

**Q: How would you scale the equity calculator?**
A: "Currently, it's CPU-bound in the Node process. For scale, I'd offload these calculations to **Web Workers** on the client or a specialized **Rust/WebAssembly** module to handle the permutations faster without blocking the main thread."

**Q: How do you handle database indexing?**
A: "I indexed the `timestamp`, `playerName`, and `street` columns in the `Action` and `Hand` tables. This is critical because the dashboard does heavy aggregate queries (e.g., 'What is my VPIP over the last 10,000 hands?')."

---

## 📋 Live Demo Plan (Screen Share)
1.  **The Hook**: Upload a `.txt` hand history file. Show the 'Parsing' progress.
2.  **The Data**: Jump to the Dashboard. Highlight the stats (VPIP/PFR) and explain the SQL aggregations behind them.
3.  **The Replayer**: Open a specific hand. Step through the actions. Point out the 'Pot Progression' UI.
4.  **The Math**: Open the Equity Calculator. Input a range (e.g., `JJ+, AQs+`). Click 'Calculate' and show the result.
5.  **The Quiz**: End with the Trainer. Answer one question, show the 'Math Feedback' (Pot Odds vs. Equity), and explain the heuristic grading.
