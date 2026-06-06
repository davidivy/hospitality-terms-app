from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def assert_contains(path: Path, text: str, description: str) -> None:
    content = path.read_text(encoding="utf-8")
    if text not in content:
        raise AssertionError(f"{description}: missing {text!r} in {path.name}")


def main() -> None:
    terms = json.loads((ROOT / "terms.json").read_text(encoding="utf-8"))
    if len(terms) != 1783:
        raise AssertionError(f"expected 1783 terms, got {len(terms)}")

    missing = []
    for term in terms:
        term_id = term.get("id", "<missing-id>")
        for section in ("terms", "usage"):
            value = term.get(section, {}).get("th-TH", "")
            if not value.strip():
                missing.append(f"{term_id}.{section}.th-TH")
        for index, example in enumerate(term.get("examples", []), start=1):
            value = example.get("th-TH", "")
            if not value.strip():
                missing.append(f"{term_id}.examples[{index}].th-TH")

    if missing:
        raise AssertionError("missing Thai fields:\n" + "\n".join(missing[:20]))

    app_js = ROOT / "app.js"
    index_html = ROOT / "index.html"
    assert_contains(index_html, '<option value="th-TH">ภาษาไทย</option>', "home language selector")
    assert_contains(index_html, "ภาษาไทย", "home Thai search placeholder")
    assert_contains(app_js, '"th-TH": "ภาษาไทย"', "Thai label")
    assert_contains(app_js, '"th-TH": {', "Thai voice playback settings")
    assert_contains(app_js, "...Object.values(term.terms)", "home search includes translated terms")
    assert_contains(app_js, "...Object.values(term.usage)", "home search includes Thai usage")
    assert_contains(app_js, "renderAssignmentLanguageRows(term.terms)", "daily assignments render all languages")
    assert_contains(app_js, "speak(button.dataset.text, button.dataset.lang)", "voice playback buttons")

    print("OK: 1783 terms include th-TH terms, usage, examples; search, voice, and assignments are wired.")


if __name__ == "__main__":
    main()
