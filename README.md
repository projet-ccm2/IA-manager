# IA-manager

Service for Twitch viewer achievements with AI-generated suggestions via Google Gemini.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
```

Set the environment variable:

```
GEMINI_API_KEY=your-api-key
```

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).

On the free tier, the API may return 429 (Too many requests) when rate limits are exceeded.

## Run

```bash
npm run dev
```

Other commands:

- `npm run build` - compile TypeScript
- `npm start` - run compiled app
- `npm test` - run tests

## API (Swagger)

### GET /health

Health check.

**Response 200**

| Field       | Type   |
| ----------- | ------ |
| status      | string |
| timestamp   | string |
| environment | string |

**Example**

```json
{
  "status": "healthy",
  "timestamp": "2025-02-24T12:00:00.000Z",
  "environment": "development"
}
```

---

### POST /request/adviceForAchievement

Generate a Twitch viewer achievement suggestion from a channel name and user prompt.

**Request body**

| Field       | Type   | Required |
| ----------- | ------ | -------- |
| channelName | string | yes      |
| prompt      | string | yes      |

**Response 200**

| Field       | Type   |
| ----------- | ------ |
| title       | string |
| description | string |
| goal        | number |
| reward      | number |
| label       | string |

`reward` is higher for harder achievements.

**Example request**

```json
{
  "channelName": "myStreamer",
  "prompt": "suggest an achievement for first time chatters"
}
```

**Example response**

```json
{
  "title": "First Chat",
  "description": "Send your first message in the channel",
  "goal": 1,
  "reward": 10,
  "label": "Chat 1 time"
}
```

**Error responses**

| Status | Error                 | When                                     |
| ------ | --------------------- | ---------------------------------------- |
| 400    | Validation error      | Missing or invalid channelName or prompt |
| 429    | Too many requests     | Gemini rate limit (free tier)            |
| 500    | Internal server error | Malformed request or unexpected error    |
| 502    | Bad gateway           | Invalid response from AI                 |
| 503    | Service unavailable   | AI service down or not configured        |
| 504    | Gateway timeout       | AI request timed out                     |
