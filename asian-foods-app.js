const labels = {
  "zh-TW": "中文",
  "en-US": "English",
  "vi-VN": "Tiếng Việt",
  "th-TH": "ภาษาไทย",
  "id-ID": "Bahasa Indonesia"
};

const categoryOrder = [
  "經典大菜",
  "經典主食",
  "經典台菜",
  "經典湯品",
  "地方小吃",
  "台灣經典小吃",
  "台灣夜市鹹食",
  "台灣夜市甜食",
  "飯之屬",
  "粥之屬",
  "麵之屬",
  "粉之屬",
  "羹之屬",
  "水族之屬",
  "肉之屬",
  "果之屬",
  "卵之屬",
  "醬之屬",
  "飲之屬",
  "餅之屬",
  "店之屬",
  "米其林必比登推介",
  "代表飲料（酒精）",
  "代表飲料（非酒精）",
  "調味料及應用的香料植物",
  "用餐禮儀",
  "典故介紹"
];

const cuisineOrder = ["魯菜", "川菜", "粵菜", "蘇菜", "閩菜", "浙菜", "湘菜", "徽菜"];

const state = {
  items: [],
  filtered: [],
  activeId: null,
  selectedCuisine: "all"
};

const totalCount = document.querySelector("#totalCount");
const matchCount = document.querySelector("#matchCount");
const searchInput = document.querySelector("#searchInput");
const countrySelect = document.querySelector("#countrySelect");
const categorySelect = document.querySelector("#categorySelect");
const drinkSelect = document.querySelector("#drinkSelect");
const yearSelect = document.querySelector("#yearSelect");
const quickLists = document.querySelector("#quickLists");
const resultList = document.querySelector("#resultList");
const detailPanel = document.querySelector("#detailPanel");

init();

async function init() {
  if (window.location.protocol === "file:") {
    detailPanel.innerHTML = `
      <div class="empty-state">
        <h2>請改用本機網址開啟</h2>
        <p>直接用檔案開啟會讓資料庫與外部連結無法正常運作。</p>
        <div class="link-actions center">
          <a href="http://127.0.0.1:4180/asian-foods.html"><span aria-hidden="true">⌂</span>開啟查詢頁</a>
        </div>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch("asian-foods.json");
    state.items = await response.json();
    state.filtered = state.items;
    state.activeId = state.items[0]?.id ?? null;
    setupFilters();
    bindEvents();
    render();
  } catch (error) {
      detailPanel.innerHTML = `<div class="empty-state"><h2>資料載入失敗</h2><p>請確認 asian-foods.json 存在。</p></div>`;
  }
}

function bindEvents() {
  searchInput.addEventListener("input", filterItems);
  countrySelect.addEventListener("change", () => {
    if (countrySelect.value !== "中國") {
      state.selectedCuisine = "all";
    }
    filterItems();
  });
  categorySelect.addEventListener("change", filterItems);
  drinkSelect.addEventListener("change", filterItems);
  yearSelect.addEventListener("change", filterItems);
}

function setupFilters() {
  addOptions(countrySelect, unique(state.items.map((item) => item.country)).sort((a, b) => a.localeCompare(b, "zh-Hant")));
  addOptions(categorySelect, unique(state.items.map((item) => item.category)).sort(sortBy(categoryOrder)));
  addOptions(yearSelect, unique(state.items.flatMap((item) => item.years ?? (item.year ? [item.year] : []))).sort((a, b) => b - a));
  renderQuickLists();
}

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function renderQuickLists() {
  quickLists.innerHTML = [
    renderChipGroup("國家地區", unique(state.items.map((item) => item.country)).sort((a, b) => a.localeCompare(b, "zh-Hant")), "country"),
    renderChipGroup("查詢分類", unique(state.items.map((item) => item.category)).sort(sortBy(categoryOrder)), "category"),
    renderChipGroup("中國八大菜系", unique(state.items.map((item) => item.cuisine).filter((value) => cuisineOrder.includes(value))).sort(sortBy(cuisineOrder)), "cuisine")
  ].join("");

  quickLists.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      searchInput.value = "";
      if (button.dataset.filter === "country") {
        countrySelect.value = button.dataset.value;
        state.selectedCuisine = "all";
      }
      if (button.dataset.filter === "category") {
        categorySelect.value = button.dataset.value;
        state.selectedCuisine = "all";
      }
      if (button.dataset.filter === "cuisine") {
        countrySelect.value = "中國";
        state.selectedCuisine = button.dataset.value;
      }
      filterItems();
    });
  });
}

function renderChipGroup(title, values, filter) {
  return `
    <div class="quick-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="chip-row">
        ${values.map((value) => `<button class="chip" type="button" data-filter="${escapeHtml(filter)}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
      </div>
    </div>
  `;
}

function filterItems() {
  const query = normalize(searchInput.value);
  const country = countrySelect.value;
  const cuisine = state.selectedCuisine;
  const category = categorySelect.value;
  const drink = drinkSelect.value;
  const year = yearSelect.value;

  state.filtered = state.items.filter((item) => {
    const countryMatch = country === "all" || item.country === country;
    const cuisineMatch = cuisine === "all" || item.cuisine === cuisine;
    const categoryMatch = category === "all" || item.category === category || (item.categories ?? []).includes(category);
    const drinkMatch = drink === "all" || item.drinkType === drink;
    const itemYears = item.years ?? (item.year ? [item.year] : []);
    const yearMatch = year === "all" || itemYears.map(String).includes(year);
    const text = [
      item.country,
      cuisineOrder.includes(item.cuisine) ? item.cuisine : "",
      item.category,
      item.drinkType,
      item.year,
      item.badge,
      item.icon,
      item.story,
      ...Object.values(item.terms ?? {}),
      ...Object.values(item.usage ?? {})
    ].join(" ");

    return countryMatch && cuisineMatch && categoryMatch && drinkMatch && yearMatch && normalize(text).includes(query);
  });

  if (!state.filtered.some((item) => item.id === state.activeId)) {
    state.activeId = state.filtered[0]?.id ?? null;
  }

  render();
}

function render() {
  totalCount.textContent = `${state.items.length} 筆`;
  matchCount.textContent = `${state.filtered.length} 筆符合`;
  renderList();
  renderDetail();
}

function renderList() {
  resultList.innerHTML = "";

  if (state.filtered.length === 0) {
    resultList.innerHTML = `<div class="empty-state"><p>查無符合資料。</p></div>`;
    return;
  }

  state.filtered.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `food-card${item.id === state.activeId ? " active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(item.terms["zh-TW"])}</strong>
      <span>${escapeHtml(item.terms["en-US"])}</span>
      <span>${escapeHtml(item.terms["vi-VN"])}｜${escapeHtml(item.terms["th-TH"])}</span>
      <span>${escapeHtml(item.terms["id-ID"])}</span>
      <div class="tag-row">
        ${item.icon ? `<span class="badge-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>` : ""}
        <span class="tag">${escapeHtml(item.country)}</span>
        ${cuisineOrder.includes(item.cuisine) ? `<span class="tag cuisine">${escapeHtml(item.cuisine)}</span>` : ""}
        <span class="tag category">${escapeHtml(item.category)}</span>
        ${item.year ? `<span class="tag year">${escapeHtml(item.year)}</span>` : ""}
        ${item.badge ? `<span class="tag michelin">${escapeHtml(item.badge)}</span>` : ""}
      </div>
    `;
    button.addEventListener("click", () => {
      state.activeId = item.id;
      render();
      detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    resultList.append(button);
  });
}

function renderDetail() {
  const item = state.items.find((entry) => entry.id === state.activeId);

  if (!item) {
    detailPanel.innerHTML = `<div class="empty-state"><h2>沒有符合資料</h2><p>請調整篩選條件或關鍵字。</p></div>`;
    return;
  }

  detailPanel.innerHTML = `
    <div class="detail-hero">
      <div class="detail-title">
        <div class="detail-tags">
          ${item.icon ? `<span class="badge-icon large" aria-hidden="true">${escapeHtml(item.icon)}</span>` : ""}
          <span class="tag">${escapeHtml(item.country)}</span>
          ${cuisineOrder.includes(item.cuisine) ? `<span class="tag cuisine">${escapeHtml(item.cuisine)}</span>` : ""}
          <span class="tag category">${escapeHtml(item.category)}</span>
          ${item.drinkType ? `<span class="tag drink">${escapeHtml(item.drinkType)}</span>` : ""}
          ${item.year ? `<span class="tag year">${escapeHtml(item.year)}</span>` : ""}
          ${item.badge ? `<span class="tag michelin">${escapeHtml(item.badge)}</span>` : ""}
        </div>
        <h2>${escapeHtml(item.terms["zh-TW"])}</h2>
        <p class="subtitle">${escapeHtml(item.terms["en-US"])}</p>
        <div class="link-actions">
          ${item.referenceUrl ? `<a href="${escapeHtml(item.referenceUrl)}" rel="noopener" aria-label="開啟參考網址"><span aria-hidden="true">↗</span>參考網址</a>` : ""}
          ${item.youtubeUrl ? `<a href="${escapeHtml(item.youtubeUrl)}" rel="noopener" aria-label="開啟 YouTube 影片"><span aria-hidden="true">▶</span>YouTube 影片</a>` : ""}
          <a href="asian-foods.html#searchTop" class="back-link" aria-label="回到查詢頁"><span aria-hidden="true">⌂</span>回到查詢頁</a>
        </div>
      </div>
    </div>
    <section class="section">
      <h3>五語名稱</h3>
      <div class="language-grid">${renderLanguages(item.terms, true)}</div>
    </section>
    <section class="section">
      <h3>內容說明</h3>
      <div class="language-stack">${renderLanguages(item.usage, false)}</div>
    </section>
    <section class="section">
      <h3>典故介紹</h3>
      <p class="story-text">${escapeHtml(item.story)}</p>
    </section>
    ${renderAwardMeta(item)}
  `;
}

function renderAwardMeta(item) {
  if (!item.award) return "";
  return `
    <section class="section">
      <h3>標章與年度更新</h3>
      <div class="meta-grid">
        <div><span>標章</span><strong>${escapeHtml(item.award.name)}</strong></div>
        <div><span>年度</span><strong>${escapeHtml((item.years ?? [item.year]).join("、"))}</strong></div>
        <div><span>更新方式</span><strong>${escapeHtml(item.award.updateMode ?? "逐年更新")}</strong></div>
        <div><span>官方來源</span><strong>${escapeHtml(item.award.publisher ?? "MICHELIN Guide")}</strong></div>
      </div>
    </section>
  `;
}

function renderLanguages(content, strong) {
  return Object.entries(labels).map(([lang, label]) => `
    <div class="language-card">
      <span>${escapeHtml(label)}</span>
      ${strong ? `<strong>${escapeHtml(content[lang] ?? content["zh-TW"])}</strong>` : `<p>${escapeHtml(content[lang] ?? content["zh-TW"])}</p>`}
    </div>
  `).join("");
}

function nameOf(item) {
  return item?.terms?.["zh-TW"] ?? item?.terms?.["en-US"] ?? "亞洲飲食";
}

function unique(values) {
  return [...new Set(values)];
}

function sortBy(order) {
  return (a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "zh-Hant");
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  };
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
