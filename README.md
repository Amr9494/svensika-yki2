# Svenska YKI 2

Dynamic Swedish YKI practice based on the provided YKI preparation guide.

## Current MVP
- dynamic vocabulary questions
- verb-form questions
- V2/BIFF/question/indirect-question/en-ett/future/preposition exercises
- sentence ordering
- speaking and writing prompts
- A1–B2 and topic filters
- adaptive weighting toward weaker items
- local progress with `localStorage`

## Run
Serve the folder with a static HTTP server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Next
Expand the curriculum from the full PDF, add spaced repetition, AI generation/evaluation through a server-side API, trusted web-source retrieval, audio practice, and deployment.