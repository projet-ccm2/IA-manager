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

### POST /achievements/suggestions

Generate a Twitch viewer achievement suggestion from a free-text prompt.

**Request body**

| Field                  | Type     | Required |
| ---------------------- | -------- | -------- |
| prompt                 | string   | yes      |
| supportedTriggerLabels | string[] | no       |

**Response 200**

| Field       | Type    |
| ----------- | ------- |
| title       | string  |
| description | string  |
| goal        | number  |
| reward      | number  |
| secret      | boolean |
| public      | boolean |
| active      | boolean |
| type        | object  |

`type`:

| Field | Type                     |
| ----- | ------------------------ |
| label | string                   |
| data  | string or number or null |

**Example request**

```json
{
  "prompt": "Create an achievement for viewers who send 100 messages in the channel.",
  "supportedTriggerLabels": [
    "message",
    "message_content",
    "channel_point_cost",
    "redeem_channel_point",
    "api_caller"
  ]
}
```

**Example response**

```json
{
  "title": "First 100 Messages",
  "description": "Unlock this achievement after sending 100 messages in the channel.",
  "goal": 100,
  "reward": 250,
  "secret": false,
  "public": false,
  "active": true,
  "type": {
    "label": "message",
    "data": null
  }
}
```

**Error responses**

| Status | Error                 | When                                                         |
| ------ | --------------------- | ------------------------------------------------------------ |
| 400    | Validation error      | Missing/invalid `prompt` or invalid `supportedTriggerLabels` |
| 422    | Unprocessable Entity  | Gemini returned invalid/incomplete JSON for the contract     |
| 429    | Too many requests     | Gemini rate limit (free tier)                                |
| 500    | Internal server error | Malformed request or unexpected error                        |
| 503    | Service unavailable   | AI service down or missing configuration                     |
| 504    | Gateway timeout       | AI request timed out                                         |
