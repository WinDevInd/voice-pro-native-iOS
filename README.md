# Voice Pro

Voice Pro is a React, TypeScript, and Capacitor dictation app with browser and native iOS speech recognition, live waveform feedback, editable transcripts, AI cleanup, and locally persisted writing context.

## Requirements

- Node.js 20+
- npm 10+
- Xcode 15+ for iOS
- CocoaPods

## Setup

```bash
npm install
cp .env.example .env
```

Set `LLM_API_KEY` only in `.env`. Vite never receives the key; refinement requests go through the Express server.

## Run locally

Start the web client and backend together:

```bash
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:8787`.

You can also run them separately:

```bash
npm run dev:web
npm run dev:server
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `LLM_API_KEY` | For live AI refinement | Server-only API key |
| `LLM_API_URL` | No | OpenAI-compatible chat completions URL |
| `LLM_MODEL` | No | Model name; defaults to `gpt-4o-mini` |
| `PORT` | No | Backend port; defaults to `8787` |

Without an API key, the server returns a clear configuration error rather than exposing or simulating credentials.

## Quality commands

```bash
npm run typecheck
npm run lint
npm run format
npm test
npm run build
```

## iOS

Install dependencies, build the web app, and sync it into the native project:

```bash
npm run build
npx cap sync ios
```

Open the generated project in Xcode:

```bash
npx cap open ios
```

Choose a signing team, select a device or simulator, and run. Microphone and speech-recognition usage descriptions are included in `ios/App/App/Info.plist`. After changing web code or Capacitor plugins, run `npm run build && npx cap sync ios` again.

Browser speech recognition support varies by browser; Chrome and Safari provide the best experience. Native iOS uses `@capacitor-community/speech-recognition`.
