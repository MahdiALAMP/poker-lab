# How to Generate the Demo GIF

Since automated capture is limited in some environments, follow these steps to create `docs/demo.gif` for your repository:

### 1. Tools Needed
- **Screen Recorder**: Use [ShareX](https://getsharex.com/) (Windows), [QuickTime](https://support.apple.com/en-us/HT208721) (Mac), or [Peek](https://github.com/phw/peek) (Linux).
- **GIF Converter**: If your recorder doesn't output GIF directly, use [ezgif.com](https://ezgif.com/) or `ffmpeg`.

### 2. Recording Script (15-20 seconds)
1.  **Start Recording** at [http://localhost:3000](http://localhost:3000).
2.  **Upload**: Navigate to `/upload`. Paste a sample PokerStars hand (found in `packages/parser/tests/fixtures`) and click "Import".
3.  **Dashboard**: Go to `/dashboard`. Show the stats appearing.
4.  **Replayer**: Go to `/hands`. Open the first hand. Click through "Next Action" a few times.
5.  **Equity**: On the hand detail page, scroll to the Equity Calculator. Type a range (e.g., `AKo, JJ+`) and hit "Calculate".
6.  **Trainer**: Navigate to `/trainer`. Use the "Hero" player, start a session, and answer one question.
7.  **Stop Recording**.

### 3. Save as `docs/demo.gif`
Save the file as `demo.gif` in the `docs` folder. The `README.md` is already configured to display it.
