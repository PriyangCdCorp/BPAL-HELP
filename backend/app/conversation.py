import re
import unicodedata


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).strip().lower()
    text = re.sub(r"[\\s\\.,!?;:¿¡]+", " ", text)
    return text.strip()


_GREETING_RESPONSES = {
    "en": "Hello! How can I help you today? I can help with your questions.",
    "fr": "Bonjour ! Comment puis-je vous aider aujourd'hui ? Je peux vous aider avec vos questions.",
}

_ENGLISH_GREETING = {
    "hi", "hello", "hey", "hiya", "good morning", "good afternoon",
    "good evening", "how are you", "how are you doing", "how is it going",
    "thanks", "thank you", "thanks a lot", "bye", "goodbye", "see you",
}
_FRENCH_GREETING = {
    "bonjour", "salut", "bonsoir", "coucou", "comment ça va",
    "comment allez vous", "merci", "merci beaucoup", "au revoir", "à bientôt",
}


def greeting_response(message: str) -> str | None:
    """Return a lightweight local response for standalone greetings/thanks/goodbyes.

    Messages that contain a substantive question are deliberately not classified
    as greetings, so they continue through document retrieval.
    """
    normalized = _normalize(message)
    if normalized in _ENGLISH_GREETING:
        if normalized in {"thanks", "thank you", "thanks a lot"}:
            return "You're welcome! Let me know if you'd like help with anything else."
        if normalized in {"bye", "goodbye", "see you"}:
            return "Goodbye! Feel free to come back whenever you need help."
        return _GREETING_RESPONSES["en"]
    if normalized in _FRENCH_GREETING:
        if normalized in {"merci", "merci beaucoup"}:
            return "Avec plaisir ! N'hésitez pas si vous avez besoin d'autre chose."
        if normalized in {"au revoir", "à bientôt"}:
            return "Au revoir ! Revenez quand vous le souhaitez."
        return _GREETING_RESPONSES["fr"]
    return None
