const labels = {
  "zh-TW": "中文 / Chinese",
  "en-US": "English",
  "vi-VN": "Tiếng Việt",
  "th-TH": "ภาษาไทย",
  "id-ID": "Bahasa Indonesia"
};

const voiceSettings = {
  "zh-TW": {
    rate: 0.78,
    pitch: 1.08,
    volume: 0.92,
    preferredNames: [
      "Mei-Jia",
      "Meijia",
      "Sin-Ji",
      "Ting-Ting",
      "Google 國語",
      "Google 中文",
      "Microsoft HsiaoChen",
      "Microsoft Hanhan"
    ]
  },
  "en-US": {
    rate: 0.88,
    pitch: 1,
    volume: 1,
    preferredNames: ["Samantha", "Google US English", "Microsoft Aria"]
  },
  "vi-VN": {
    rate: 0.86,
    pitch: 1,
    volume: 1,
    preferredNames: ["Linh", "Google tiếng Việt", "Microsoft HoaiMy"]
  },
  "th-TH": {
    rate: 0.82,
    pitch: 1,
    volume: 1,
    preferredNames: ["Kanya", "Google ภาษาไทย", "Microsoft Premwadee"]
  },
  "id-ID": {
    rate: 0.86,
    pitch: 1,
    volume: 1,
    preferredNames: ["Damayanti", "Google Bahasa Indonesia", "Microsoft Gadis"]
  }
};

const state = {
  allTerms: [],
  hospitalityTerms: [],
  foodTerms: [],
  terms: [],
  filtered: [],
  assignments: [],
  mode: "terms",
  activeAssignmentId: "",
  activeId: null,
  recognition: null
};

const pageTitle = document.querySelector("#pageTitle");
const termCount = document.querySelector("#termCount");
const matchCount = document.querySelector("#matchCount");
const searchInput = document.querySelector("#searchInput");
const languageSelect = document.querySelector("#languageSelect");
const categorySelect = document.querySelector("#categorySelect");
const countryFilter = document.querySelector("#countryFilter");
const countrySelect = document.querySelector("#countrySelect");
const cuisineFilter = document.querySelector("#cuisineFilter");
const cuisineSelect = document.querySelector("#cuisineSelect");
const voiceButton = document.querySelector("#voiceButton");
const statusText = document.querySelector("#statusText");
const termList = document.querySelector("#termList");
const termDetail = document.querySelector("#termDetail");
const assignmentSummary = document.querySelector("#assignmentSummary");
const assignmentSelect = document.querySelector("#assignmentSelect");
const assignmentDetail = document.querySelector("#assignmentDetail");
const clearAssignmentButton = document.querySelector("#clearAssignmentButton");
const assignmentPanel = document.querySelector(".assignment-panel");
const termsModeButton = document.querySelector("#termsModeButton");
const foodsModeButton = document.querySelector("#foodsModeButton");

init();

async function init() {
  try {
    const [termsResponse, foodsResponse] = await Promise.all([
      fetch("terms.json"),
      fetch("asian-foods.json")
    ]);
    state.hospitalityTerms = await termsResponse.json();
    state.foodTerms = await foodsResponse.json();
    state.allTerms = [...state.hospitalityTerms, ...state.foodTerms];
    state.terms = state.hospitalityTerms;
    state.assignments = buildAssignments(state.hospitalityTerms);
    state.filtered = state.terms;
    state.activeId = state.terms[0]?.id ?? null;
    setupFilters();
    setupAssignments();
    setupVoiceSearch();
    bindEvents();
    render();
  } catch (error) {
    statusText.textContent = "詞庫載入失敗，請確認 terms.json 存在。 / Failed to load the term database. Please check terms.json.";
  }
}

function bindEvents() {
  searchInput.addEventListener("input", filterTerms);
  languageSelect.addEventListener("change", () => {
    setupVoiceSearch();
    filterTerms();
  });
  categorySelect.addEventListener("change", filterTerms);
  countrySelect.addEventListener("change", filterTerms);
  cuisineSelect.addEventListener("change", filterTerms);
  voiceButton.addEventListener("click", startVoiceSearch);
  assignmentSelect.addEventListener("change", applyAssignment);
  clearAssignmentButton.addEventListener("click", clearAssignment);
  termsModeButton.addEventListener("click", () => setMode("terms"));
  foodsModeButton.addEventListener("click", () => setMode("foods"));

  if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      window.speechSynthesis.getVoices();
    });
  }
}

function buildAssignments(terms) {
  const size = 15;
  const assignments = [];

  for (let index = 0; index < terms.length; index += size) {
    const termsForAssignment = terms.slice(index, index + size);
    const number = String(assignments.length + 1).padStart(2, "0");
    assignments.push({
      id: number,
      title: `作業編號 ${number} / Assignment ${number}`,
      terms: termsForAssignment,
      start: index + 1,
      end: index + termsForAssignment.length
    });
  }

  return assignments;
}

function setupAssignments() {
  assignmentSummary.textContent = `共 ${state.assignments.length} 份作業，每份約 15 個單字，可作為課堂聽寫複習。 / ${state.assignments.length} assignments, about 15 words each, for class dictation review.`;
  state.assignments.forEach((assignment) => {
    const option = document.createElement("option");
    option.value = assignment.id;
    option.textContent = `${assignment.title}（${assignment.start}-${assignment.end}）`;
    assignmentSelect.append(option);
  });
}

function setupFilters() {
  setupCategories();
  setupCountries();
  setupCuisines();
}

function setupCategories() {
  categorySelect.innerHTML = `<option value="all">全部 / All</option>`;
  const categoryOrder = state.mode === "foods"
    ? ["經典大菜", "地方小吃", "代表飲料（酒精）", "代表飲料（非酒精）", "調味料及應用的香料植物", "用餐禮儀", "典故介紹"]
    : ["旅館管理", "房務管理", "客務管理", "餐飲管理"];
  const categories = [...new Set(state.terms.flatMap((term) => term.categories ?? [term.category]))]
    .sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "zh-Hant");
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });
}

function setupCountries() {
  countrySelect.innerHTML = `<option value="all">全部國家 / All countries</option>`;
  const countries = [...new Set(state.foodTerms.map((term) => term.country))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    countrySelect.append(option);
  });
}

function setupCuisines() {
  cuisineSelect.innerHTML = `<option value="all">全部菜系 / All cuisines</option>`;
  const cuisineOrder = ["魯菜", "川菜", "粵菜", "蘇菜", "閩菜", "浙菜", "湘菜", "徽菜"];
  const cuisines = [...new Set(state.foodTerms.map((term) => term.cuisine).filter(Boolean))]
    .sort((a, b) => cuisineOrder.indexOf(a) - cuisineOrder.indexOf(b));
  cuisines.forEach((cuisine) => {
    const option = document.createElement("option");
    option.value = cuisine;
    option.textContent = cuisine;
    cuisineSelect.append(option);
  });
}

function setMode(mode) {
  if (state.mode === mode) {
    return;
  }

  state.mode = mode;
  state.terms = mode === "foods" ? state.foodTerms : state.hospitalityTerms;
  state.filtered = state.terms;
  state.activeId = state.terms[0]?.id ?? null;
  state.activeAssignmentId = "";
  searchInput.value = "";
  assignmentSelect.value = "";
  categorySelect.value = "all";
  countrySelect.value = "all";
  cuisineSelect.value = "all";
  setupCategories();
  render();
}

function setupVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceButton.title = "此瀏覽器不支援語音搜尋 / Voice search is not supported in this browser";
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.lang = languageSelect.value;
  state.recognition.interimResults = false;
  state.recognition.maxAlternatives = 1;

  state.recognition.addEventListener("start", () => {
    voiceButton.classList.add("listening");
    statusText.textContent = `正在聽 ${labels[languageSelect.value]} 語音搜尋。 / Listening for ${labels[languageSelect.value]} voice search.`;
  });

  state.recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript.trim();
    searchInput.value = transcript;
    statusText.textContent = `已辨識：${transcript} / Recognized: ${transcript}`;
    filterTerms();
  });

  state.recognition.addEventListener("end", () => {
    voiceButton.classList.remove("listening");
  });

  state.recognition.addEventListener("error", () => {
    statusText.textContent = "語音搜尋未成功，請再試一次或改用文字搜尋。 / Voice search failed. Please try again or type your search.";
  });
}

function startVoiceSearch() {
  if (!state.recognition) {
    return;
  }

  state.recognition.lang = languageSelect.value;
  state.recognition.start();
}

function filterTerms() {
  const query = normalize(searchInput.value);
  const category = categorySelect.value;
  const country = countrySelect.value;
  const cuisine = cuisineSelect.value;
  const assignment = state.mode === "terms"
    ? state.assignments.find((item) => item.id === state.activeAssignmentId)
    : null;
  const assignmentIds = new Set(assignment?.terms.map((term) => term.id) ?? []);

  state.filtered = state.terms.filter((term) => {
    const termCategories = term.categories ?? [term.category];
    const assignmentMatch = !assignment || assignmentIds.has(term.id);
    const categoryMatch = category === "all" || termCategories.includes(category);
    const countryMatch = state.mode !== "foods" || country === "all" || term.country === country;
    const cuisineMatch = state.mode !== "foods" || cuisine === "all" || term.cuisine === cuisine;
    const text = [
      term.country,
      term.cuisine,
      term.story,
      ...termCategories,
      ...Object.values(term.usage),
      term.phonetic,
      ...Object.values(term.terms),
      ...(term.examples ?? []).flatMap((example) => Object.values(example))
    ].join(" ");
    return assignmentMatch && categoryMatch && countryMatch && cuisineMatch && normalize(text).includes(query);
  });

  if (!state.filtered.some((term) => term.id === state.activeId)) {
    state.activeId = state.filtered[0]?.id ?? null;
  }

  render();
}

function applyAssignment() {
  state.activeAssignmentId = assignmentSelect.value;
  searchInput.value = "";
  categorySelect.value = "all";
  filterTerms();
  renderAssignmentDetail();
}

function clearAssignment() {
  state.activeAssignmentId = "";
  assignmentSelect.value = "";
  searchInput.value = "";
  categorySelect.value = "all";
  filterTerms();
  renderAssignmentDetail();
}

function render() {
  const isFoodsMode = state.mode === "foods";
  pageTitle.textContent = isFoodsMode
    ? "亞洲國家之料理查詢 / Asian Cuisine Search"
    : "葉佳山老師教程『旅館』與『餐飲』專業查詢系統 / Prof. David Yeh Hospitality and Culinary Search System";
  termCount.textContent = isFoodsMode ? `${state.terms.length} 筆 / items` : `${state.terms.length} 詞 / terms`;
  matchCount.textContent = `${state.filtered.length} 筆 / results`;
  assignmentPanel.hidden = isFoodsMode;
  countryFilter.hidden = !isFoodsMode;
  cuisineFilter.hidden = !isFoodsMode;
  termsModeButton.classList.toggle("active", !isFoodsMode);
  foodsModeButton.classList.toggle("active", isFoodsMode);
  statusText.textContent = isFoodsMode
    ? "可依國家、八大菜系、分類、五語名稱、典故或香料植物搜尋。 / Search by country, cuisine, category, five-language names, stories, or spices."
    : "可輸入或按麥克風搜尋。 / Type or use the microphone to search.";
  renderList();
  renderDetail();
  renderAssignmentDetail();
}

function renderList() {
  termList.innerHTML = "";

  if (state.filtered.length === 0) {
    termList.innerHTML = `<div class="empty-state"><p>查無符合詞彙。 / No matching terms found.</p></div>`;
    return;
  }

  state.filtered.forEach((term) => {
    const termCategories = term.categories ?? [term.category];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `term-card${term.id === state.activeId ? " active" : ""}${term.domain === "asian-food" ? " food-card" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(getLocalized(term.terms, "en-US"))}</strong>
      <span>${escapeHtml(getLocalized(term.terms, "zh-TW"))}｜${escapeHtml(getLocalized(term.terms, "vi-VN"))}</span>
      <span>${escapeHtml(getLocalized(term.terms, "th-TH"))}｜${escapeHtml(getLocalized(term.terms, "id-ID"))}</span>
      ${term.country ? `<span class="country-chip">${escapeHtml(term.country)}</span>` : ""}
      ${term.cuisine ? `<span class="cuisine-chip">${escapeHtml(term.cuisine)}</span>` : ""}
      <span class="badge">${termCategories.map(escapeHtml).join("、")}</span>
    `;
    button.addEventListener("click", () => {
      state.activeId = term.id;
      render();
      termDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    termList.append(button);
  });
}

function renderAssignmentDetail() {
  const assignment = state.assignments.find((item) => item.id === state.activeAssignmentId);

  if (!assignment) {
    assignmentDetail.innerHTML = "<p>選擇作業後，會列出本次聽寫單字與對應中文。 / Select an assignment to view the dictation words and Chinese meanings.</p>";
    return;
  }

  const rows = assignment.terms.map((term, index) => `
    <li class="assignment-term-card">
      <div class="assignment-term-number">${String(index + 1).padStart(2, "0")}</div>
      <div class="assignment-term-body">
        <h4>${escapeHtml(term.terms["en-US"])}</h4>
        <div class="assignment-language-list">
          ${renderAssignmentLanguageRows(term.terms)}
        </div>
      </div>
    </li>
  `).join("");

  assignmentDetail.innerHTML = `
    <div class="assignment-callout">
      <strong>${assignment.title}</strong>
      <p>老師可宣布：「同學複習${assignment.title}，下週上課考聽寫。」 / Teacher note: Review ${assignment.title} for next week's dictation.</p>
    </div>
    <ol class="assignment-terms">${rows}</ol>
  `;

  assignmentDetail.querySelectorAll(".speak-icon").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.text, button.dataset.lang));
  });
}

function renderAssignmentLanguageRows(content) {
  return Object.entries(labels).map(([lang, label]) => `
    <div class="assignment-language-row">
      <span>${label}</span>
      <strong>${escapeHtml(getLocalized(content, lang))}</strong>
      ${renderSpeakIcon(getLocalized(content, lang), lang, label)}
    </div>
  `).join("");
}

function renderDetail() {
  const term = state.terms.find((item) => item.id === state.activeId);

  if (!term) {
    termDetail.innerHTML = `
      <div class="empty-state">
        <h2>沒有符合的專有名詞 / No matching terms</h2>
        <p>請換一個關鍵字，或調整類別。 / Try another keyword or adjust the category.</p>
      </div>
    `;
    return;
  }
  const termCategories = term.categories ?? [term.category];
  const metaText = [term.phonetic, termCategories.join("、")].filter(Boolean).join("｜");

  if (term.domain === "asian-food") {
    renderFoodDetail(term, termCategories);
    return;
  }

  const translations = renderLanguageRows(term.terms, "translation", true);
  const usages = renderLanguageRows(term.usage, "language-row", false);

  const examples = (term.examples ?? []).map((example, index) => `
    <li class="example-card">
      <h4>例句 ${index + 1} / Example ${index + 1}</h4>
      ${renderLanguageRows(example, "language-row", false)}
    </li>
  `).join("");

  termDetail.innerHTML = `
    <div class="detail-header">
      <div class="title-line">
        <div>
          <h2>${escapeHtml(term.terms["en-US"])}</h2>
          <div class="phonetic">${escapeHtml(metaText)}</div>
        </div>
      </div>
      <div class="translation-grid">${translations}</div>
    </div>
    <section class="section">
      <h3>解釋用法 / Usage Notes</h3>
      <div class="language-stack">${usages}</div>
    </section>
    <section class="section">
      <h3>例句 / Examples</h3>
      <ul class="examples">${examples}</ul>
    </section>
  `;

  termDetail.querySelectorAll(".speak-icon").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.text, button.dataset.lang));
  });
}

function renderFoodDetail(term, termCategories) {
  const translations = renderLanguageRows(term.terms, "translation", true);
  const usages = renderLanguageRows(term.usage, "language-row", false);

  termDetail.innerHTML = `
    <div class="food-hero">
      <div class="food-hero-body">
        <div class="food-chip-row">
          <span class="country-chip">${escapeHtml(term.country)}</span>
          ${term.cuisine ? `<span class="cuisine-chip">${escapeHtml(term.cuisine)}</span>` : ""}
        </div>
        <h2>${escapeHtml(getLocalized(term.terms, "zh-TW"))}</h2>
        <div class="phonetic">${escapeHtml(termCategories.join("、"))}</div>
        <div class="link-actions">
          <a href="${escapeHtml(term.referenceUrl)}" target="_blank" rel="noopener">參考網址 / Reference</a>
          <a href="${escapeHtml(term.youtubeUrl)}" target="_blank" rel="noopener">YouTube 影片</a>
        </div>
      </div>
    </div>
    <section class="section">
      <h3>五語名稱 / Names in Five Languages</h3>
      <div class="translation-grid">${translations}</div>
    </section>
    <section class="section">
      <h3>內容說明 / Description</h3>
      <div class="language-stack">${usages}</div>
    </section>
    <section class="section">
      <h3>典故介紹 / Background Story</h3>
      <p class="story-text">${escapeHtml(term.story)}</p>
    </section>
  `;

  termDetail.querySelectorAll(".speak-icon").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.text, button.dataset.lang));
  });
}

function renderLanguageRows(content, className, emphasize) {
  return Object.entries(labels).map(([lang, label]) => `
    <div class="${className}">
      <span>${label}</span>
      <div class="translation-line">
        ${emphasize ? `<strong>${escapeHtml(getLocalized(content, lang))}</strong>` : `<p>${escapeHtml(getLocalized(content, lang))}</p>`}
        ${renderSpeakIcon(getLocalized(content, lang), lang, label)}
      </div>
    </div>
  `).join("");
}

function renderSpeakIcon(text, lang, label) {
  return `
    <button class="speak-icon" type="button" data-lang="${lang}" data-text="${escapeHtml(text)}" title="播放 ${label} 發音 / Play ${label} pronunciation" aria-label="播放 ${label} 發音 / Play ${label} pronunciation">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
        <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
      </svg>
    </button>
  `;
}

function speak(text, lang) {
  if (!window.speechSynthesis) {
    statusText.textContent = "此瀏覽器不支援語音播放。 / Speech playback is not supported in this browser.";
    return;
  }

  window.speechSynthesis.cancel();
  const settings = voiceSettings[lang] ?? { rate: 0.88, pitch: 1, volume: 1, preferredNames: [] };
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  utterance.voice = findPreferredVoice(lang, settings.preferredNames);
  window.speechSynthesis.speak(utterance);
}

function findPreferredVoice(lang, preferredNames) {
  const voices = window.speechSynthesis.getVoices();
  const normalizedLang = lang.toLocaleLowerCase();
  const languageVoices = voices.filter((voice) => voice.lang.toLocaleLowerCase().startsWith(normalizedLang));
  const relaxedLanguageVoices = languageVoices.length > 0
    ? languageVoices
    : voices.filter((voice) => voice.lang.toLocaleLowerCase().startsWith(normalizedLang.split("-")[0]));

  return preferredNames
    .map((name) => relaxedLanguageVoices.find((voice) => voice.name.toLocaleLowerCase().includes(name.toLocaleLowerCase())))
    .find(Boolean) ?? relaxedLanguageVoices[0] ?? null;
}

function normalize(value) {
  return (value ?? "").toString().trim().toLocaleLowerCase();
}

function escapeHtml(value) {
  return (value ?? "").toString().replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getLocalized(content, lang) {
  if (!content) {
    return "";
  }

  return content[lang] ?? content["zh-TW"] ?? content["en-US"] ?? "待補 / Pending";
}
