# Personalized-Study-Help-Chatbot

This project is a full-stack learning assistant that I built to turn study material into an interactive learning workflow. The idea is simple: a user can provide a source such as a PDF, YouTube link, webpage, image, zip file, or supported local upload, and the system extracts the content, summarizes it, identifies the main topics, recommends more resources, generates a quiz, and supports follow-up questions through a chatbot interface.

I have referred to the project as `Study Bot` inside the app, but the main project name is **Personalized-Study-Help-Chatbot**.

## Problem Statement

Students usually consume study material in a scattered way. Notes are in one place, videos are somewhere else, quizzes are separate, and there is no unified way to ask follow-up questions on top of the same content.

This project tries to solve that by creating one end-to-end pipeline:

- accept study content from different formats
- extract useful information from it
- generate a structured summary
- recommend additional learning resources
- create a quiz for self-assessment
- provide a chatbot for further clarification

## Main Features

- URL-based content ingestion for:
  - PDF
  - video links
  - audio links
  - image links
  - zip/compressed files
  - webpages/articles
- Local file upload support for:
  - PDF
  - image
  - zip
- Automatic content extraction and preprocessing
- Structured summary with:
  - overview
  - core topics
  - learning objectives
  - key takeaways
  - study plan
- Resource recommendation section for additional reading, videos, and multimedia learning
- Quiz generation and answer evaluation
- Chatbot support for follow-up questions on the same study session
- OpenAI-powered mode when API key is configured
- Fallback heuristic mode when no API key is provided

## System Architecture

The application follows a simple client-server architecture.

```text
User
  |
  v
React + Vite Frontend
  |
  v
Express Backend API
  |
  +--> Content Ingestion Layer
  |      - URL fetching
  |      - local file upload parsing
  |      - PDF parsing
  |      - image handling
  |      - webpage extraction
  |      - YouTube transcript handling
  |      - zip extraction
  |
  +--> AI / Study Generation Layer
  |      - summary generation
  |      - topic identification
  |      - quiz generation
  |      - quiz evaluation
  |      - chatbot responses
  |
  +--> Resource Discovery Layer
  |      - article suggestions
  |      - video suggestions
  |      - multimedia suggestions
  |
  +--> Session Store
         - keeps generated study sessions in memory
```

## Architecture Explanation

### 1. Frontend

The frontend is built using **React with Vite**. It is responsible for:

- taking user input
- allowing either a link or local file upload
- showing the summary and topic breakdown
- showing recommended resources
- collecting quiz answers
- displaying chatbot responses

### 2. Backend

The backend is built using **Express** and acts as the core processing layer. It handles:

- incoming study session requests
- uploaded files and remote URLs
- content parsing based on source type
- sending extracted content into the AI/fallback logic
- returning the generated study session to the frontend

### 3. Ingestion Layer

The ingestion layer is responsible for converting raw input into text/context that can be analyzed. Different handlers are used depending on the source:

- PDFs are parsed into text
- webpages are scraped for meaningful headings and paragraphs
- YouTube links attempt transcript extraction
- images are prepared for multimodal analysis
- zip files extract readable text-like files

### 4. AI Layer

The AI layer has two modes:

- **Live AI mode**: used when `OPENAI_API_KEY` is configured
- **Fallback mode**: used when no key is present

Live AI mode gives better summarization, quiz quality, and chatbot responses. Fallback mode keeps the full application usable for demo or offline-style testing.

### 5. Session Storage

The current version stores study sessions in memory on the backend. This means:

- sessions are available while the server is running
- sessions are lost when the backend restarts

For a production version, this can be replaced with a database.

## End-to-End Flow

1. The user selects a content type.
2. The user either pastes a URL or uploads a supported local file.
3. The backend ingests and parses the source.
4. Extracted content is sent to the study generation layer.
5. The system creates:
   - summary
   - topic map
   - learning objectives
   - key takeaways
   - study plan
   - quiz questions
   - chatbot context
   - recommended resources
6. The frontend displays the study workspace.
7. The user can answer quiz questions and ask follow-up questions in the chatbot.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- AI SDK: OpenAI Node SDK
- Parsing/utility libraries:
  - `pdf-parse`
  - `cheerio`
  - `youtube-transcript`
  - `jszip`
  - `multer`
- Development tools:
  - `nodemon`
  - `concurrently`

## Project Structure

```text
Personalized-Study-Help-Chatbot/
|
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- lib/
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   |-- styles.css
|   |-- index.html
|   |-- package.json
|
|-- server/
|   |-- src/
|   |   |-- routes/
|   |   |-- services/
|   |   |   |-- content/
|   |   |   |-- aiService.js
|   |   |   |-- resourceDiscoveryService.js
|   |   |   |-- studyService.js
|   |   |-- utils/
|   |   |-- app.js
|   |   |-- index.js
|   |-- .env.example
|   |-- package.json
|
|-- package.json
|-- README.md
```

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

On Windows PowerShell:

```powershell
Copy-Item server\.env.example server\.env
```

### 3. Add OpenAI key if needed

Open `server/.env` and configure:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
ENABLE_WEB_DISCOVERY=true
```

If `OPENAI_API_KEY` is left empty, the project still works in fallback mode.

### 4. Run the project

```bash
npm run dev
```

### 5. Open the app

```text
http://localhost:5173
```

## API Behavior

The backend exposes study session APIs for:

- creating a session from a URL
- creating a session from uploaded file content
- evaluating quiz answers
- answering chatbot questions
- checking health / AI mode

The frontend uses these APIs to build the complete study experience in one page.

## Current Limitations

- sessions are stored only in memory
- local uploads currently support PDF, image, and zip files only
- fallback mode is useful, but not as strong as live AI mode for high-quality summaries and quiz generation
- audio links do not yet have full transcription support
- recommendation quality depends on search result availability

## Future Improvements

- add persistent database storage for sessions
- add authentication and saved study history
- support direct audio transcription
- improve quiz quality further with stronger document-specific question generation
- add progress tracking and analytics for learners
- support flashcards and revision sheets

## Why I Built It This Way

I wanted the project to feel like more than just a summarizer. The goal was to create a complete study workflow where content understanding, revision, self-testing, and doubt solving all happen inside one system. That is why the project combines ingestion, summarization, recommendations, quiz evaluation, and chatbot interaction instead of treating them as separate features.

## Conclusion

Personalized-Study-Help-Chatbot is designed as an end-to-end study assistant that can take raw learning material and turn it into a more guided learning experience. It combines multiple input formats, backend processing, AI-assisted understanding, and an interactive frontend into a single project.
