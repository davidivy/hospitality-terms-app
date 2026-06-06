from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TERMS_PATH = ROOT / "terms.json"

THAI_CATEGORY_NAMES = {
    "旅館管理": "การจัดการโรงแรม",
    "房務管理": "การจัดการงานแม่บ้าน",
    "客務管理": "การจัดการงานส่วนหน้า",
    "餐飲管理": "การจัดการอาหารและเครื่องดื่ม",
}


def thai_category(category: str) -> str:
    return THAI_CATEGORY_NAMES.get(category, category)


def thai_term_label(english: str, chinese: str) -> str:
    return f"คำว่า {english}（ความหมายภาษาจีน：{chinese}）"


def thai_usage(english: str, chinese: str, category: str) -> str:
    return f"「{english}」เป็นคำศัพท์เฉพาะด้าน{thai_category(category)} มีความหมายภาษาจีนว่า「{chinese}」。"


def thai_example(english: str, category: str) -> str:
    return f"โปรดอธิบายความหมายของ {english} ในบริบทของ{thai_category(category)}。"


def main() -> None:
    terms = json.loads(TERMS_PATH.read_text(encoding="utf-8"))

    for term in terms:
        english = term["terms"]["en-US"]
        chinese = term["terms"]["zh-TW"]
        category = term["category"]
        term["terms"]["th-TH"] = thai_term_label(english, chinese)
        term["usage"]["th-TH"] = thai_usage(english, chinese, category)
        for example in term.get("examples", []):
            example["th-TH"] = thai_example(english, category)

    TERMS_PATH.write_text(json.dumps(terms, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {len(terms)} terms with th-TH")


if __name__ == "__main__":
    main()
