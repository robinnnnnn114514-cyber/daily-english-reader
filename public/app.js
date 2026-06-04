const articleList = document.querySelector("#articleList");
const articleNode = document.querySelector("#article");
const windowText = document.querySelector("#windowText");
const sourceText = document.querySelector("#sourceText");
const statusText = document.querySelector("#statusText");
const refreshButton = document.querySelector("#refreshButton");
const translateButton = document.querySelector("#translateButton");
const favoritesButton = document.querySelector("#favoritesButton");
const favoritesCount = document.querySelector("#favoritesCount");
const favoritesPanel = document.querySelector("#favoritesPanel");
const favoritesList = document.querySelector("#favoritesList");
const closeFavoritesButton = document.querySelector("#closeFavoritesButton");
const popover = document.querySelector("#popover");
const popoverWord = document.querySelector("#popoverWord");
const popoverMeanings = document.querySelector("#popoverMeanings");
const popoverSource = document.querySelector("#popoverSource");
const audioButton = document.querySelector("#audioButton");
const favoriteToggle = document.querySelector("#favoriteToggle");

const FAVORITES_STORAGE_KEY = "daily-english-reader:favorites";

let state = {
  articles: [],
  activeIndex: 0,
  definitions: new Map(),
  favorites: new Map(),
  currentDefinition: null,
  translations: new Map(),
  translationMode: false,
  translationLoading: false,
  favoritesOpen: false,
  refreshTimer: null
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function normalizeWord(word) {
  return String(word || "").toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function audioUrlForWord(word) {
  const normalized = normalizeWord(word);
  return normalized ? `/api/audio?word=${encodeURIComponent(normalized)}` : "";
}

function playAudio(url) {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(() => {
    statusText.textContent = "\u7f8e\u97f3\u6682\u65f6\u65e0\u6cd5\u64ad\u653e\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5";
  });
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    state.favorites = new Map(stored.map((item) => {
      const word = normalizeWord(item.word);
      return [word, {
        ...item,
        word,
        audioUrl: item.audioUrl || audioUrlForWord(word),
        importance: Number(item.importance || 0)
      }];
    }));
  } catch {
    state.favorites = new Map();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favorites.values()]));
}

function favoriteLabel(count) {
  return count ? `\u5df2\u6536\u85cf ${count} \u4e2a\u5355\u8bcd` : "\u6682\u65e0\u6536\u85cf\u5355\u8bcd";
}

function renderFavoriteToggle() {
  const word = normalizeWord(state.currentDefinition?.word);
  const isSaved = word && state.favorites.has(word);
  favoriteToggle.disabled = !word;
  favoriteToggle.setAttribute("aria-pressed", String(Boolean(isSaved)));
  favoriteToggle.querySelector(".favorite-toggle-icon").textContent = isSaved ? "\u2605" : "\u2606";
  favoriteToggle.querySelector(".favorite-toggle-text").textContent = isSaved ? "\u5df2\u6536\u85cf" : "\u6536\u85cf";
}

function renderAudioButton() {
  const audioUrl = state.currentDefinition?.audioUrl || audioUrlForWord(state.currentDefinition?.word);
  audioButton.disabled = !audioUrl;
  audioButton.dataset.audioUrl = audioUrl || "";
}

function renderFavorites() {
  const items = [...state.favorites.values()].sort((a, b) => b.savedAt - a.savedAt);
  favoritesCount.textContent = String(items.length);
  favoritesButton.setAttribute("aria-label", favoriteLabel(items.length));
  favoritesButton.setAttribute("aria-expanded", String(state.favoritesOpen));

  if (!items.length) {
    favoritesList.innerHTML = `<div class="favorites-empty">\u70b9\u51fb\u5355\u8bcd\u91ca\u4e49\u5361\u7247\u53f3\u4e0a\u89d2\u7684\u6536\u85cf\u6309\u94ae\uff0c\u8fd9\u91cc\u4f1a\u6536\u96c6\u4f60\u7684\u5355\u8bcd\u3002</div>`;
    return;
  }

  favoritesList.innerHTML = items.map((item) => `
    <article class="favorite-item importance-${Number(item.importance || 0) % 5}">
      <div class="favorite-item-head">
        <div>
          <strong>${escapeHtml(item.word)}</strong>
          <span class="importance-label">\u91cd\u8981\u5ea6 ${Number(item.importance || 0)}</span>
        </div>
        <div class="favorite-item-actions">
          <button class="favorite-audio" type="button" data-play-audio="${escapeHtml(item.audioUrl || audioUrlForWord(item.word))}">\u53d1\u97f3</button>
          <button class="favorite-up" type="button" data-up-favorite="${escapeHtml(item.word)}">up</button>
          <button type="button" data-remove-favorite="${escapeHtml(item.word)}">checked</button>
        </div>
      </div>
      <ul>
        ${(item.meanings || []).map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join("")}
      </ul>
      <span>${item.source === "youdao" ? "\u6709\u9053\u5728\u7ebf\u8bcd\u5178" : item.source === "local" ? "\u672c\u5730\u5e38\u7528\u8bcd\u5e93" : "\u5f85\u6269\u5c55\u8bcd\u5e93"}</span>
    </article>
  `).join("");
}

function setFavoritesOpen(open) {
  state.favoritesOpen = open;
  favoritesPanel.hidden = !open;
  favoritesPanel.classList.toggle("open", open);
  renderFavorites();
}

function toggleCurrentFavorite() {
  const definition = state.currentDefinition;
  const word = normalizeWord(definition?.word);
  if (!word) return;
  if (state.favorites.has(word)) {
    state.favorites.delete(word);
  } else {
    state.favorites.set(word, {
      word,
      meanings: definition.meanings || [],
      source: definition.source || "fallback",
      audioUrl: definition.audioUrl || audioUrlForWord(word),
      importance: 0,
      savedAt: Date.now()
    });
  }
  saveFavorites();
  renderFavoriteToggle();
  renderFavorites();
}

function tokenize(text) {
  const tokens = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g) || [];
  return tokens.map((token) => {
    if (/^[A-Za-z]/.test(token)) {
      return `<button class="word" type="button" data-word="${escapeHtml(token)}">${escapeHtml(token)}</button>`;
    }
    return escapeHtml(token);
  }).join("");
}

function articleKey(article) {
  return article?.id || `${article?.title || ""}-${article?.publishedAt || ""}`;
}

function activeArticle() {
  return state.articles[state.activeIndex];
}

function activeTranslation() {
  return state.translations.get(articleKey(activeArticle()));
}

function renderList() {
  articleList.innerHTML = state.articles.map((article, index) => `
    <button class="article-button ${index === state.activeIndex ? "active" : ""}" type="button" data-index="${index}">
      <span class="article-thumb">${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="">` : ""}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <span>${escapeHtml(article.source)} · ${formatDate(article.publishedAt)}</span>
    </button>
  `).join("");
}

function renderTranslateButton() {
  translateButton.disabled = !activeArticle() || state.translationLoading;
  translateButton.setAttribute("aria-pressed", String(state.translationMode));
  const main = translateButton.querySelector(".translate-button-main");
  const label = translateButton.querySelector(".translate-button-label");
  if (state.translationLoading) {
    main.textContent = "...";
    label.textContent = "\u7ffb\u8bd1\u4e2d";
  } else if (state.translationMode) {
    main.textContent = "EN";
    label.textContent = "\u5207\u56de\u539f\u6587";
  } else {
    main.textContent = "\u8bd1";
    label.textContent = "\u5168\u6587\u7ffb\u8bd1";
  }
}

function renderArticle() {
  const article = activeArticle();
  if (!article) return;
  const translation = state.translationMode ? activeTranslation() : null;
  const title = translation?.title || article.title;
  const body = article.body.map((paragraph, index) => {
    const translated = translation?.body?.[index];
    return translation && translated?.trim()
      ? translated
      : paragraph;
  });

  sourceText.textContent = article.source;
  articleNode.classList.toggle("translated", Boolean(translation));
  articleNode.innerHTML = `
    <header class="article-hero">
      <div class="article-title-block">
        <div class="article-source-row">
          <div class="section-kicker">${escapeHtml(article.source)}</div>
          ${article.url ? `<a class="source-link" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">\u6765\u6e90\u94fe\u63a5</a>` : ""}
        </div>
        <h2>${translation ? escapeHtml(title) : tokenize(title)}</h2>
      </div>
      <figure class="article-figure">
        ${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}">` : `<div class="article-image-fallback">Daily News</div>`}
      </figure>
    </header>
    ${body.map((paragraph, index) => `
      <p>
        <span class="paragraph-number">${index + 1}</span>
        ${translation ? escapeHtml(paragraph) : tokenize(paragraph)}
      </p>
    `).join("")}
  `;
  renderList();
  renderTranslateButton();
}

function setPopoverPosition(target) {
  const rect = target.getBoundingClientRect();
  const gap = 10;
  const width = Math.min(300, window.innerWidth - 28);
  const left = Math.min(Math.max(14, rect.left), window.innerWidth - width - 14);
  const top = rect.bottom + 145 > window.innerHeight
    ? Math.max(14, rect.top - 152)
    : rect.bottom + gap;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function showLoadingDefinition(word, target) {
  popover.hidden = false;
  state.currentDefinition = null;
  popoverWord.textContent = word.toLowerCase();
  popoverMeanings.innerHTML = "<li>\u67e5\u8be2\u4e2d...</li>";
  popoverSource.textContent = "";
  renderAudioButton();
  renderFavoriteToggle();
  setPopoverPosition(target);
}

function showDefinition(definition, target) {
  popover.hidden = false;
  state.currentDefinition = definition;
  popoverWord.textContent = definition.word;
  popoverMeanings.innerHTML = definition.meanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join("");
  popoverSource.textContent = definition.source === "youdao"
    ? "\u91ca\u4e49\u6765\u6e90\uff1a\u6709\u9053\u5728\u7ebf\u8bcd\u5178"
    : definition.source === "local"
      ? "\u91ca\u4e49\u6765\u6e90\uff1a\u672c\u5730\u5e38\u7528\u8bcd\u5e93"
      : "\u91ca\u4e49\u6765\u6e90\uff1a\u5f85\u6269\u5c55\u8bcd\u5e93";
  renderAudioButton();
  renderFavoriteToggle();
  setPopoverPosition(target);
}

async function defineWord(word, target) {
  const key = word.toLowerCase();
  if (state.definitions.has(key)) {
    showDefinition(state.definitions.get(key), target);
    return;
  }
  showLoadingDefinition(word, target);
  const response = await fetch(`/api/define?word=${encodeURIComponent(word)}`);
  const definition = await response.json();
  state.definitions.set(key, definition);
  showDefinition(definition, target);
}

async function translateActiveArticle() {
  const article = activeArticle();
  if (!article) return;
  const key = articleKey(article);
  if (state.translations.has(key)) {
    state.translationMode = true;
    renderArticle();
    return;
  }

  state.translationLoading = true;
  popover.hidden = true;
  statusText.textContent = "\u6b63\u5728\u7ffb\u8bd1\u5168\u6587...";
  renderTranslateButton();
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: article.title, body: article.body })
    });
    if (!response.ok) throw new Error("Translation failed");
    const translation = await response.json();
    state.translations.set(key, translation);
    state.translationMode = true;
    statusText.textContent = "\u5df2\u5207\u6362\u4e3a\u4e2d\u6587\u8bd1\u6587";
    renderArticle();
  } catch {
    state.translationMode = false;
    statusText.textContent = "\u7ffb\u8bd1\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5";
  } finally {
    state.translationLoading = false;
    renderTranslateButton();
  }
}

async function toggleTranslation() {
  if (state.translationLoading) return;
  if (state.translationMode) {
    state.translationMode = false;
    statusText.textContent = "\u5df2\u5207\u56de\u82f1\u6587\u539f\u6587";
    renderArticle();
    return;
  }
  await translateActiveArticle();
}

async function loadArticles(refresh = false) {
  statusText.textContent = refresh ? "\u6b63\u5728\u5237\u65b0\u4eca\u65e5\u6587\u7ae0..." : "\u6b63\u5728\u6536\u96c6\u4eca\u65e5\u6587\u7ae0...";
  const response = await fetch(`/api/articles${refresh ? "?refresh=1" : ""}`);
  const payload = await response.json();
  state.articles = payload.articles || [];
  state.activeIndex = 0;
  state.translationMode = false;
  windowText.textContent = `${payload.window.startBeijing} \u81f3 ${payload.window.endBeijing}`;
  statusText.textContent = payload.status === "ready" ? "\u5df2\u8f7d\u5165\u4eca\u65e5\u65b0\u95fb" : payload.note;
  renderList();
  renderArticle();
  scheduleNextRefresh(payload.window.end);
}

function scheduleNextRefresh(windowEnd) {
  if (state.refreshTimer) window.clearTimeout(state.refreshTimer);
  const nextBeijingDrop = new Date(new Date(windowEnd).getTime() + 24 * 60 * 60 * 1000);
  const delay = Math.max(60 * 1000, nextBeijingDrop.getTime() - Date.now() + 15 * 1000);
  state.refreshTimer = window.setTimeout(() => loadArticles(true), delay);
}

articleList.addEventListener("click", async (event) => {
  const button = event.target.closest(".article-button");
  if (!button) return;
  state.activeIndex = Number(button.dataset.index);
  popover.hidden = true;
  renderArticle();
  if (state.translationMode && !activeTranslation()) {
    await translateActiveArticle();
  }
});

articleNode.addEventListener("click", (event) => {
  const word = event.target.closest(".word");
  if (!word || state.translationMode) return;
  defineWord(word.dataset.word, word);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".word") && !event.target.closest(".popover")) {
    popover.hidden = true;
  }
});

refreshButton.addEventListener("click", () => loadArticles(true));
translateButton.addEventListener("click", toggleTranslation);
audioButton.addEventListener("click", () => playAudio(audioButton.dataset.audioUrl));
favoriteToggle.addEventListener("click", toggleCurrentFavorite);
favoritesButton.addEventListener("click", () => setFavoritesOpen(!state.favoritesOpen));
closeFavoritesButton.addEventListener("click", () => setFavoritesOpen(false));
favoritesList.addEventListener("click", (event) => {
  const playButton = event.target.closest("[data-play-audio]");
  if (playButton) {
    playAudio(playButton.dataset.playAudio);
    return;
  }
  const upButton = event.target.closest("[data-up-favorite]");
  if (upButton) {
    const word = normalizeWord(upButton.dataset.upFavorite);
    const item = state.favorites.get(word);
    if (!item) return;
    item.importance = (Number(item.importance || 0) + 1) % 5;
    state.favorites.set(word, item);
    saveFavorites();
    renderFavorites();
    return;
  }
  const button = event.target.closest("[data-remove-favorite]");
  if (!button) return;
  state.favorites.delete(normalizeWord(button.dataset.removeFavorite));
  saveFavorites();
  renderFavoriteToggle();
  renderFavorites();
});

loadFavorites();
renderFavorites();
renderTranslateButton();
loadArticles();
