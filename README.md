# Wellness Assistant — AI Healthcare Chatbot

An embeddable AI chat widget that answers general health and wellness questions
(nutrition, exercise, sleep, healthy habits, common symptoms) in a natural,
conversational way — with built-in medical disclaimers and no diagnosis claims.

🔗 **Live demo:** https://wellness-ai-assistant.onrender.com
*(hosted on a free tier — the first message may take 30-50 seconds if it's been idle)*

Click the chat bubble in the bottom-right corner of the demo to try it.
![Wellness Assistant chat widget](screenshot.png)
## What's included

- `backend/` — FastAPI server that talks to OpenAI and keeps conversation
  history per visitor session.
- `frontend/widget.js` + `frontend/widget.css` — a self-contained chat widget
  (floating bubble → chat window) that can be dropped into any existing website.
- `frontend/demo.html` — a sample "client website" page showing the widget
  embedded in context, served automatically at `/` by the backend for demos.

## Running it locally

1. `cd backend`
2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   venv\Scripts\pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and add your own OpenAI API key:
   ```
   OPENAI_API_KEY=sk-...
   ```
4. Run it:
   ```
   venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8100
   ```
5. Open `http://localhost:8100` in a browser to see the demo page with the
   widget in the bottom-right corner.

## Embedding on a real website

Add these two lines before `</body>` on any page:

```html
<link rel="stylesheet" href="https://YOUR-DEPLOYED-URL/static/widget.css" />
<script src="https://YOUR-DEPLOYED-URL/static/widget.js" data-api-url="https://YOUR-DEPLOYED-URL"></script>
```

That's it — no other setup needed on the website side.

## Using your own API key (for the client)

The chatbot needs an OpenAI API key to work, billed to whoever's key is used.
**The client should use their own key**, not the developer's, since usage is
ongoing (every visitor question costs a small amount).

Steps for the client:
1. Create an account at platform.openai.com and add a payment method.
2. Generate an API key under "API keys".
3. Add it as the `OPENAI_API_KEY` environment variable wherever this is hosted
   (e.g. in the Render dashboard under Environment, or in `.env` if self-hosting).
4. Restart/redeploy the service — no code changes needed.

## Configuration reference (`backend/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Which OpenAI model to use |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated list of websites allowed to embed the widget (restrict this in production) |

## Notes on safety behavior

The system prompt instructs the assistant to:
- Never diagnose conditions or recommend medications/dosages.
- Recommend seeing a licensed healthcare professional for personal/urgent concerns.
- Direct users to emergency services immediately if a message suggests a medical emergency.
