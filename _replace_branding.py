from pathlib import Path

root = Path(r"C:\Users\HP\Desktop\eventflow-main")
replacements = [
    ("HackSmart", "HackSmart"),
    ("HackSmart", "HackSmart"),
    ("HackSmart Organizing Committee", "HackSmart Organizing Committee"),
    ("HackSmart", "HackSmart"),
    ("HackSmart", "HackSmart"),
    ("HackSmart", "HackSmart"),
]
exclude_dirs = {".git", "node_modules", "venv", "__pycache__", ".venv", "dist", "build"}
exclude_files = {".env", "package-lock.json"}
text_ext = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".md", ".json", ".sql", ".yml", ".yaml", ".txt", ".toml", ".ini"}

updated = []
for path in root.rglob("*"):
    if not path.is_file():
        continue
    if any(part in exclude_dirs for part in path.parts):
        continue
    if path.name in exclude_files:
        continue
    if path.suffix.lower() not in text_ext and path.name not in {"Dockerfile", "Makefile", "Procfile"}:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        continue
    new_text = text
    for old, new in replacements:
        new_text = new_text.replace(old, new)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        updated.append(str(path.relative_to(root)))

print("UPDATED_FILES")
for item in updated:
    print(item)
print(f"COUNT={len(updated)}")
