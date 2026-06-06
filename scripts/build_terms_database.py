from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path("/Users/chiashanyeh/Downloads")

PDF_SOURCES = [
    {
        "category": "房務管理",
        "path": DOWNLOADS / "???????????- 房務管理專業術語.pdf",
    },
    {
        "category": "客務管理",
        "path": DOWNLOADS / "???????????- 客務管理專業術語.pdf",
    },
    {
        "category": "旅館管理",
        "path": DOWNLOADS / "???????????- 旅館管理專業術語.pdf",
    },
    {
        "category": "餐飲管理",
        "path": DOWNLOADS / "???????????- 餐飲管理專業術語.pdf",
    },
    {
        "category": "餐飲管理",
        "path": DOWNLOADS / "???????????-? ???new????.pdf",
    },
]

LANG_PLACEHOLDERS = {
    "vi-VN": "Chờ bổ sung bản dịch",
    "th-TH": "รอเพิ่มคำแปลภาษาไทย",
    "id-ID": "Menunggu terjemahan",
}

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


def normalize_english(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    normalized = normalized.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    normalized = re.sub(r"\s+", " ", normalized.strip().lower())
    return normalized


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", normalize_english(value))
    return slug.strip("-") or "term"


def clean_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("\u3000", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip(" -\t\r\n")


def extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def is_entry_start(line: str) -> bool:
    return bool(re.match(r"^\s*\d+\s+\S+", line))


def split_entry(line: str) -> tuple[str, str] | None:
    line = clean_text(re.sub(r"^\s*\d+\s+", "", line))
    if not line or line in {"英文 中文", "英文 中文 "}:
        return None

    matches = list(re.finditer(r"[\u4e00-\u9fff]", line))
    if not matches:
        return None

    first_chinese = matches[0].start()
    english = clean_text(line[:first_chinese])
    chinese = clean_text(line[first_chinese:])

    if not english or not chinese:
        return None

    return english, chinese


def parse_entries(text: str) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    current = ""

    for raw_line in text.splitlines():
        line = clean_text(raw_line)
        if not line or line == "英文 中文":
            continue

        if is_entry_start(line):
            if current:
                entry = split_entry(current)
                if entry:
                    entries.append(entry)
            current = line
        elif current:
            current = f"{current} {line}"

    if current:
        entry = split_entry(current)
        if entry:
            entries.append(entry)

    return entries


def merge_entries() -> tuple[list[dict], dict]:
    merged: OrderedDict[str, dict] = OrderedDict()
    source_counts = Counter()
    raw_counts = Counter()

    for source in PDF_SOURCES:
        category = source["category"]
        path = source["path"]
        text = extract_pdf_text(path)
        entries = parse_entries(text)
        source_counts[category] += len(entries)

        for english, chinese in entries:
            key = normalize_english(english)
            raw_counts[key] += 1
            if key not in merged:
                merged[key] = {
                    "english": clean_text(english),
                    "chinese_values": [],
                    "categories": [],
                    "sources": [],
                }

            item = merged[key]
            if chinese not in item["chinese_values"]:
                item["chinese_values"].append(chinese)
            if category not in item["categories"]:
                item["categories"].append(category)
            item["sources"].append(path.name)

    terms = []
    used_ids = Counter()
    category_order = ["旅館管理", "房務管理", "客務管理", "餐飲管理"]

    for item in merged.values():
      categories = sorted(item["categories"], key=lambda value: category_order.index(value))
      primary_category = categories[0]
      chinese = "；".join(item["chinese_values"])
      base_id = slugify(item["english"])
      used_ids[base_id] += 1
      term_id = base_id if used_ids[base_id] == 1 else f"{base_id}-{used_ids[base_id]}"

      terms.append({
          "id": term_id,
          "category": primary_category,
          "categories": categories,
          "phonetic": "",
          "terms": {
              "zh-TW": chinese,
              "en-US": item["english"],
              "vi-VN": LANG_PLACEHOLDERS["vi-VN"],
              "th-TH": thai_term_label(item["english"], chinese),
              "id-ID": LANG_PLACEHOLDERS["id-ID"],
          },
          "usage": {
              "zh-TW": f"「{item['english']}」屬於{primary_category}專業術語，中文意思為「{chinese}」。",
              "en-US": f"Professional term used in {primary_category}. Chinese meaning: {chinese}.",
              "vi-VN": "Nội dung giải thích tiếng Việt đang chờ bổ sung.",
              "th-TH": thai_usage(item["english"], chinese, primary_category),
              "id-ID": "Penjelasan bahasa Indonesia menunggu pelengkapan.",
          },
          "examples": [
              {
                  "zh-TW": f"請說明 {item['english']} 在{primary_category}中的意思。",
                  "en-US": f"Please explain the meaning of {item['english']} in {primary_category}.",
                  "vi-VN": "Câu ví dụ tiếng Việt đang chờ bổ sung.",
                  "th-TH": thai_example(item["english"], primary_category),
                  "id-ID": "Kalimat contoh bahasa Indonesia menunggu pelengkapan.",
              }
          ],
          "source": {
              "categories": categories,
              "duplicateCount": raw_counts[normalize_english(item["english"])],
              "files": sorted(set(item["sources"])),
          },
      })

    terms.sort(key=lambda term: (category_order.index(term["category"]), normalize_english(term["terms"]["en-US"])))

    stats = {
        "sourceEntryCounts": dict(source_counts),
        "uniqueTerms": len(terms),
        "duplicateEntriesRemoved": sum(raw_counts.values()) - len(raw_counts),
        "multiCategoryTerms": sum(1 for term in terms if len(term["categories"]) > 1),
    }
    return terms, stats


def main() -> None:
    terms, stats = merge_entries()
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "terms.json").write_text(json.dumps(terms, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "data" / "terms-import-summary.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
