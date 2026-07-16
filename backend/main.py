import os
import time
import uuid
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
MAX_HISTORY_MESSAGES = 12
SESSION_TTL_SECONDS = 60 * 60 * 2

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.")

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are Wellness Assistant, a friendly and knowledgeable AI chat assistant embedded on a health and wellness website.

Your role:
- Answer general health, nutrition, exercise, sleep, and wellness questions in a warm, natural, conversational tone (like a knowledgeable friend, not a textbook).
- Keep answers concise and practical (2-4 short paragraphs or a brief list), easy to read on a small mobile chat window.
- Remember and use the conversation so far to answer natural follow-up questions.

Strict safety rules:
- You are NOT a doctor and must never diagnose a condition, name a specific disease as the cause of someone's symptoms, or recommend specific medications or dosages.
- For anything symptom-related, personal, urgent, or medical in nature, give general educational information only, and clearly recommend seeing a licensed healthcare professional for personal advice, diagnosis, or treatment.
- If a question suggests a medical emergency (e.g. chest pain, severe bleeding, difficulty breathing, thoughts of self-harm), tell the person to seek emergency care immediately (e.g. call local emergency services) before anything else.
- Do not present yourself as a replacement for professional medical, nutritional, or mental health care.

Always keep this in mind, but do not repeat a disclaimer in every single message robotically — weave it in naturally, especially for symptom or diagnosis-adjacent questions, and always include one when the topic is symptom/medical in nature."""

app = FastAPI(title="Wellness Assistant Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, Dict] = {}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str


def _cleanup_sessions() -> None:
    now = time.time()
    expired = [sid for sid, s in sessions.items() if now - s["last_seen"] > SESSION_TTL_SECONDS]
    for sid in expired:
        sessions.pop(sid, None)


def _get_session(session_id: str | None) -> tuple[str, Dict]:
    _cleanup_sessions()
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]
    new_id = session_id or str(uuid.uuid4())
    sessions[new_id] = {"messages": [], "last_seen": time.time()}
    return new_id, sessions[new_id]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": OPENAI_MODEL, "active_sessions": len(sessions)}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    session_id, session = _get_session(req.session_id)
    history: List[dict] = session["messages"]

    history.append({"role": "user", "content": req.message})
    history = history[-MAX_HISTORY_MESSAGES:]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=400,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}") from exc

    reply = completion.choices[0].message.content.strip()

    history.append({"role": "assistant", "content": reply})
    session["messages"] = history[-MAX_HISTORY_MESSAGES:]
    session["last_seen"] = time.time()

    return ChatResponse(session_id=session_id, reply=reply)


@app.delete("/api/chat/{session_id}")
def reset_session(session_id: str) -> dict:
    sessions.pop(session_id, None)
    return {"status": "cleared"}


FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_demo():
        return FileResponse(os.path.join(FRONTEND_DIR, "demo.html"))
