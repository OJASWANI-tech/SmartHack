import logging
import re

logger = logging.getLogger("prompt_security")

RESTRICTED_INPUT_PATTERNS = [
    r"ignore (all |previous |above )?instructions",
    r"\byou are now\b",
    r"\bact as\b",
    r"new instructions?:",
    r"\bsystem prompt\b",
    r"<\|system\|>",
    r"disregard (all |previous |your )?(instructions|rules|guidelines)",
    r"forget (everything|all instructions)",
    r"pretend (you are|to be)",
]

REDACTION_PATTERNS = [
    r"\b\d+\.\d+\s*/\s*10\b",
    r"\bevaluator weight\b",
    r"\bcommittee (note|comment|feedback)\b",
    r"\banomaly\b",
    r"\binternal (score|note|data|flag)\b",
]


def sanitize_for_prompt(text: str) -> str:
    if not text:
        return text

    for pattern in RESTRICTED_INPUT_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            logger.warning("Prompt input sanitized because pattern matched: %s", pattern)
            return "[Content removed: contains restricted patterns]"
    return text


def post_process_response(text: str) -> str:
    if not text:
        return text

    cleaned = text
    for pattern in REDACTION_PATTERNS:
        if re.search(pattern, cleaned, flags=re.IGNORECASE):
            logger.warning("AI response redacted because pattern matched: %s", pattern)
            cleaned = re.sub(pattern, "[REDACTED]", cleaned, flags=re.IGNORECASE)
    return cleaned
