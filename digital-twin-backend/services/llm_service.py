"""
LLM Service — defaults to local Ollama (Llama3).
No API key required. Set USE_OLLAMA=true (default).
Fallback to intelligent rule-based mock if Ollama is not running.
"""
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

# ── Config ───────────────────────────────────────────────────────────────────
USE_OLLAMA      = os.getenv("USE_OLLAMA", "true").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2")

# OpenAI kept as optional override
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL    = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Groq support
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama3-8b-8192")

_llm = None
_llm_ready = None   # None = untested, True/False = tested


def _try_build_llm():
    """Try to build an LLM instance. Returns None if unavailable."""
    global _llm, _llm_ready

    groq_api_key = os.getenv("GROQ_API_KEY", "")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # 1) Try Groq if key is present
    if groq_api_key:
        try:
            from langchain_openai import ChatOpenAI
            # Use Groq's OpenAI compatible endpoint
            _llm = ChatOpenAI(
                api_key=groq_api_key, 
                base_url="https://api.groq.com/openai/v1", 
                model=groq_model, 
                temperature=0.1
            )
            # Test connectivity
            _llm.invoke("ping")
            _llm_ready = True
            print(f"[OK] Groq LLM ready: {groq_model}")
            return _llm
        except Exception as e:
            print(f"[WARNING] Groq unavailable: {e}")
            _llm_ready = False
            return None

    openai_api_key = os.getenv("OPENAI_API_KEY", "")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # 2) Fallback to OpenAI if key is set
    if openai_api_key and not openai_api_key.startswith("sk-YOUR"):
        try:
            from langchain_openai import ChatOpenAI
            _llm = ChatOpenAI(model=openai_model, temperature=0.1, api_key=openai_api_key)
            _llm_ready = True
            return _llm
        except Exception as e:
            print(f"[WARNING] OpenAI unavailable: {e}")
            _llm_ready = False
            return None

    # 3) Fallback to built-in Ollama
    if USE_OLLAMA:
        try:
            from langchain_ollama import ChatOllama
            llm = ChatOllama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1)
            # Quick connectivity test
            llm.invoke("ping")
            _llm = llm
            _llm_ready = True
            print(f"[OK] Ollama LLM ready: {OLLAMA_MODEL} @ {OLLAMA_BASE_URL}")
            return _llm
        except Exception as e:
            print(f"[WARNING] Ollama unavailable ({e}) — using mock fallback. Start Ollama and run: ollama pull {OLLAMA_MODEL}")
            _llm_ready = False
            return None

    _llm_ready = False
    return None


def get_llm():
    global _llm, _llm_ready
    if _llm_ready is True:
        return _llm
        
    # Reload environment in case .env was modified while server is running
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    return _try_build_llm()

def has_real_llm() -> bool:
    return get_llm() is not None


def _extract_json(text: str) -> str:
    """Extract JSON from LLM response that may include markdown fences."""
    # Try markdown json block first
    m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if m:
        return m.group(1).strip()
    # Try raw JSON object/array
    m = re.search(r"(\{[\s\S]+\}|\[[\s\S]+\])", text)
    if m:
        return m.group(1).strip()
    return text.strip()


async def llm_json_call(system_prompt: str, user_message: str, fallback_fn=None) -> dict:
    """Call LLM expecting JSON output. Falls back to fallback_fn on any error."""
    llm = get_llm()
    if llm is None:
        return fallback_fn(user_message) if fallback_fn else {"error": "LLM not available"}

    from langchain.schema import HumanMessage, SystemMessage
    # Reinforce JSON-only output for Llama
    system_with_json = (
        system_prompt +
        "\n\nCRITICAL: Return ONLY a raw JSON object. No markdown, no explanation, no ```json fences. Start with { and end with }."
    )
    messages = [
        SystemMessage(content=system_with_json),
        HumanMessage(content=user_message),
    ]
    try:
        response = await llm.ainvoke(messages)
        content = response.content if hasattr(response, "content") else str(response)
        json_str = _extract_json(content)
        return json.loads(json_str)
    except Exception as e:
        print(f"[WARNING] LLM JSON parse error: {e} — using fallback")
        if fallback_fn:
            return fallback_fn(user_message)
        return {"error": str(e)}


async def llm_text_call(system_prompt: str, user_message: str, fallback_fn=None) -> str:
    """Call LLM expecting plain text output."""
    llm = get_llm()
    if llm is None:
        return fallback_fn(user_message) if fallback_fn else "LLM not available. Start Ollama: `ollama serve` then `ollama pull llama3.2`"

    from langchain.schema import HumanMessage, SystemMessage
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]
    try:
        response = await llm.ainvoke(messages)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        print(f"[WARNING] LLM text error: {e}")
        if fallback_fn:
            return fallback_fn(user_message)
        return f"LLM error: {e}"
