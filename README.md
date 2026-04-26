# IA-manager

Service for Twitch viewer achievements with AI-generated suggestions via Google Gemini.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
```

Set the Google Cloud environment variables:

```
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=global
GEMINI_MODEL=gemini-2.5-flash
```

This service uses Vertex AI through the Google Gen AI SDK. Make sure the Vertex AI API is enabled in your Google Cloud project and the runtime has credentials for that project.

For local development, the most reliable check is to use Application Default Credentials:

```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id
```

Then verify the full AI path with:

```bash
npm run smoke:ai
```

If that command returns JSON with `ok: true`, the project, credentials, model access, and SDK wiring are all working.

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
    "countMessage",
    "contentMessage",
    "countCostChannelPoint",
    "countRedeemChannelPoint",
    "apicaller"
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
    "label": "countMessage",
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
