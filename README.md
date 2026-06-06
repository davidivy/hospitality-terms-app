# 葉佳山老師教程『旅館』與『餐飲』專業查詢系統

這是一個給旅館、客務、房務課程使用的專有名詞學習 App。學生可以用中文、英文、越南文、泰文、印尼文搜尋，查看翻譯、用法解釋與例句，並使用瀏覽器語音輸入與語音播放。

目前資料庫由 5 份 PDF 專業術語檔匯入，已依旅館管理、房務管理、客務管理、餐飲管理分類並去除重複詞。匯入統計保存在 `data/terms-import-summary.json`。

首頁會自動將全部詞庫切成每日聽寫作業，每份約 15 個單字，作業編號以 `01`、`02`、`03` 依序排列。老師可在課堂上指定：「同學複習作業編號 05，下週上課考聽寫。」

## 開啟方式

因為瀏覽器載入 `terms.json` 需要本機伺服器，請在此資料夾執行：

```bash
python3 -m http.server 4173
```

然後開啟：

```text
http://localhost:4173
```

## 詞庫格式

請把新詞加入 `terms.json`，格式如下：

```json
{
  "id": "unique-id",
  "category": "客務管理",
  "categories": ["客務管理"],
  "phonetic": "/example/",
  "terms": {
    "zh-TW": "中文",
    "en-US": "English",
    "vi-VN": "Tiếng Việt",
    "th-TH": "ภาษาไทย",
    "id-ID": "Bahasa Indonesia"
  },
  "usage": {
    "zh-TW": "中文用法解釋。",
    "en-US": "English usage explanation.",
    "vi-VN": "Giải thích cách dùng bằng tiếng Việt.",
    "th-TH": "คำอธิบายการใช้งานภาษาไทย。",
    "id-ID": "Penjelasan penggunaan dalam bahasa Indonesia."
  },
  "examples": [
    {
      "zh-TW": "中文例句。",
      "en-US": "English example sentence.",
      "vi-VN": "Câu ví dụ tiếng Việt.",
      "th-TH": "ประโยคตัวอย่างภาษาไทย。",
      "id-ID": "Kalimat contoh bahasa Indonesia."
    }
  ]
}
```

## 下一步

把旅館、客務、房務專有英文給我後，我可以協助批次補上中文、越南文、泰文、印尼文翻譯、用法解釋與例句。
