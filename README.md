# Study Sage

Study Sage is a full-stack personalized study helper that ingests learning material from a URL, extracts meaningful content, generates a structured summary, recommends follow-up resources, creates a quiz, evaluates answers, and supports follow-up chatbot conversations.

## Stack

- Frontend: React + Vite
- Backend: Express
- AI layer: OpenAI when configured, with a local heuristic fallback for offline/demo use
- Resource discovery: live web lookups against public search pages, with graceful fallback suggestions

## Supported source types

- PDF
- Video links, including YouTube transcript support when available
- Audio links
- Images
- Compressed files (`.zip`)
- General web pages

## Project structure

```text
client/   React + Vite user interface
server/   Express API, content ingestion, AI orchestration
```

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and add your API key if you want live AI generation:

   ```bash
   copy server\\.env.example server\\.env
   ```

3. Start the full app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`

## Environment

See [server/.env.example](server/.env.example).

If `OPENAI_API_KEY` is not set, the app still runs in a lightweight fallback mode using heuristic summarization, quiz generation, and chat responses so you can demo the full flow without external services.
