import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4173);
const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const FEEDS = [
  { source: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" },
  { source: "The Guardian World", url: "https://www.theguardian.com/world/rss" }
];

const FALLBACK_ARTICLES = [
  {
    id: "fallback-1",
    source: "Local demo",
    publishedAt: new Date().toISOString(),
    url: "",
    title: "Daily reader is ready for the latest English news",
    imageUrl: "/images/newsroom.svg",
    body: [
      "This local article appears when the server cannot reach public news feeds. Once the network is available, the page will replace this text with three original English news articles published inside the Beijing morning window.",
      "Click any word in this paragraph to open its Chinese annotation. The reader keeps punctuation and spacing intact while turning each English word into a small interactive target for fast vocabulary review."
    ]
  },
  {
    id: "fallback-2",
    source: "Local demo",
    publishedAt: new Date().toISOString(),
    url: "",
    title: "The article window resets every morning at eight in Beijing",
    imageUrl: "/images/window.svg",
    body: [
      "The server calculates a daily collection window from eight o'clock in the morning Beijing time to eight o'clock on the previous morning. It then sorts eligible English news stories and selects three readable articles.",
      "The layout is designed for quiet reading on phones and larger screens, with a restrained palette, clear typography and short controls that stay out of the article text."
    ]
  },
  {
    id: "fallback-3",
    source: "Local demo",
    publishedAt: new Date().toISOString(),
    url: "",
    title: "Word notes can be extended with a dictionary service",
    imageUrl: "/images/dictionary.svg",
    body: [
      "Common English words already include local Chinese meanings. The server also includes a remote dictionary hook so the vocabulary panel can return more meanings when an external dictionary endpoint is reachable.",
      "This makes the reading experience useful immediately while leaving a clean path for a larger bilingual dictionary or a paid translation service."
    ]
  }
];

const EDITORIAL_IMAGES = {
  world: "/images/world-affairs.svg",
  culture: "/images/culture.svg",
  power: "/images/power.svg",
  dispatch: "/images/dispatch.svg",
  newsroom: "/images/newsroom.svg"
};

function editorialImageFor(title = "", index = 0) {
  const text = title.toLowerCase();
  if (/(war|military|strike|oil|energy|drug|boat|conflict|operation|trump|netanyahu|putin|government|policy|election)/.test(text)) {
    return EDITORIAL_IMAGES.power;
  }
  if (/(travel|porto|culture|textile|art|music|book|language|greeting|postcard)/.test(text)) {
    return EDITORIAL_IMAGES.culture;
  }
  if (/(world|eu|europe|migration|israel|ukraine|china|russia|foreign|global|abroad)/.test(text)) {
    return EDITORIAL_IMAGES.world;
  }
  return [EDITORIAL_IMAGES.dispatch, EDITORIAL_IMAGES.world, EDITORIAL_IMAGES.culture][index % 3];
}

const DICTIONARY = {
  a: ["一；一个", "某一个", "用于泛指"],
  about: ["关于", "大约", "在周围"],
  across: ["穿过；横过", "遍及", "在对面"],
  action: ["行动；措施", "作用", "诉讼"],
  administration: ["政府；行政部门", "管理；行政"],
  after: ["在...之后", "后来", "追赶"],
  agency: ["机构；代理处", "作用；能动性"],
  agreement: ["协议；一致", "同意"],
  ahead: ["在前面", "提前", "领先"],
  air: ["空气", "播出", "神态；气氛"],
  all: ["全部；所有", "完全地"],
  already: ["已经", "早已"],
  also: ["也；同样"],
  among: ["在...之中", "在...之间"],
  an: ["一；一个"],
  and: ["和；与", "并且"],
  another: ["另一个", "又一个"],
  any: ["任何", "一些", "任一"],
  appears: ["出现", "显得", "发表"],
  around: ["周围", "大约", "到处"],
  article: ["文章", "条款", "物品"],
  articles: ["文章", "条款"],
  as: ["作为", "如同", "因为", "当...时"],
  available: ["可获得的", "有空的", "可用的"],
  be: ["是", "存在", "成为"],
  beijing: ["北京"],
  between: ["在...之间", "介于"],
  body: ["正文", "身体", "机构"],
  abroad: ["在国外", "到国外", "海外"],
  business: ["商业；业务", "事情"],
  by: ["由；被", "通过", "在旁边"],
  can: ["能够", "可以", "罐头"],
  cannot: ["不能"],
  change: ["改变", "变化", "零钱"],
  chinese: ["中文；中国的"],
  click: ["点击", "发出咔哒声"],
  collection: ["收集", "收藏", "一批"],
  common: ["常见的", "共同的", "公共的"],
  content: ["内容", "满意的"],
  controls: ["控制；控件", "管理"],
  daily: ["每日的", "日报"],
  data: ["数据；资料"],
  deal: ["协议；交易", "处理；应对", "分配"],
  designed: ["设计的", "有计划的"],
  detention: ["拘留；扣押", "羁押"],
  dictionary: ["词典；字典"],
  each: ["每个；各自"],
  economy: ["经济", "节约"],
  eligible: ["符合条件的", "有资格的"],
  english: ["英语；英文的"],
  eu: ["欧盟（European Union）"],
  every: ["每一个", "每隔"],
  external: ["外部的", "国外的"],
  fast: ["快速的", "牢固的", "禁食"],
  feeds: ["新闻源；订阅源", "喂养"],
  for: ["为了", "对于", "因为"],
  from: ["从；来自", "由于"],
  government: ["政府", "治理"],
  hook: ["钩子", "挂接点", "吸引"],
  in: ["在...里面", "以...方式", "进入"],
  include: ["包括", "包含"],
  includes: ["包括", "包含"],
  inside: ["内部", "在...里面"],
  international: ["国际的", "国际组织"],
  into: ["进入", "变成", "深入"],
  it: ["它", "这件事"],
  keeps: ["保持", "保留", "看守"],
  larger: ["更大的", "更广泛的"],
  latest: ["最新的", "最近的"],
  layout: ["布局", "版面"],
  local: ["本地的", "当地的"],
  market: ["市场", "推销"],
  meaning: ["意思；含义"],
  meanings: ["意思；含义"],
  migration: ["迁移；移民", "迁徙"],
  mobile: ["移动的", "手机"],
  morning: ["早晨", "上午"],
  news: ["新闻", "消息"],
  notes: ["注释；笔记", "注意到"],
  o: ["字母 O"],
  on: ["在...上", "开启", "关于"],
  once: ["一旦", "曾经", "一次"],
  open: ["打开", "开放的"],
  original: ["原版的", "最初的", "原创作品"],
  paragraph: ["段落"],
  palette: ["调色板", "色彩组合"],
  panel: ["面板", "小组"],
  phone: ["电话；手机", "打电话"],
  policy: ["政策", "保险单"],
  public: ["公共的", "公众"],
  published: ["发布", "出版"],
  punctuation: ["标点符号"],
  quiet: ["安静的", "平静的"],
  reach: ["到达", "影响范围", "伸手"],
  reachable: ["可到达的", "可联系的"],
  reader: ["读者", "阅读器"],
  readable: ["可读的", "易读的"],
  reading: ["阅读", "读数"],
  ready: ["准备好的"],
  remote: ["远程的", "偏远的"],
  replace: ["替换", "取代"],
  reset: ["重置", "重新设定"],
  restrained: ["克制的", "受限制的"],
  review: ["复习", "评论", "审查"],
  strikes: ["罢工", "打击；袭击", "击中", "达成"],
  screen: ["屏幕", "筛选"],
  screens: ["屏幕", "筛选"],
  selects: ["选择"],
  server: ["服务器"],
  service: ["服务", "维修"],
  short: ["短的", "短缺", "做空"],
  source: ["来源", "消息人士"],
  spacing: ["间距", "间隔"],
  story: ["新闻报道", "故事", "楼层"],
  stories: ["新闻报道", "故事"],
  text: ["文本", "正文"],
  the: ["这；那", "该"],
  then: ["然后", "当时"],
  this: ["这；这个"],
  three: ["三"],
  time: ["时间", "次数", "安排时间"],
  to: ["到；向", "为了"],
  today: ["今天", "当今"],
  top: ["顶部", "最高的", "领先的"],
  turns: ["转动", "轮流", "变成"],
  useful: ["有用的"],
  vocabulary: ["词汇", "词汇量"],
  when: ["什么时候", "当...时"],
  while: ["当...时", "同时", "一会儿"],
  window: ["窗口", "时间段"],
  with: ["和...一起", "具有", "用"],
  word: ["单词", "消息", "措辞"],
  words: ["单词", "言语"],
  world: ["世界", "领域"]
};

let articleCache = null;
const translationCache = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function decodeHtml(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function tagHtml(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function parseFeed(xml, feed) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return items.map((item) => {
    const title = tagValue(item, "title");
    const link = tagValue(item, "link");
    const pubDate = tagValue(item, "pubDate") || tagValue(item, "dc:date");
    const feedHtml = tagHtml(item, "content:encoded") || tagHtml(item, "description");
    return {
      title,
      url: link,
      source: feed.source,
      publishedAt: Number.isNaN(Date.parse(pubDate)) ? new Date().toISOString() : new Date(pubDate).toISOString(),
      imageUrl: "",
      feedBody: extractParagraphs(feedHtml)
    };
  }).filter((item) => item.title && item.url);
}

function beijingWindow(now = new Date()) {
  const bjNow = new Date(now.getTime() + 8 * HOUR);
  const endBj = Date.UTC(bjNow.getUTCFullYear(), bjNow.getUTCMonth(), bjNow.getUTCDate(), 8);
  const adjustedEndBj = bjNow.getTime() < endBj ? endBj - DAY : endBj;
  return {
    start: new Date(adjustedEndBj - DAY - 8 * HOUR),
    end: new Date(adjustedEndBj - 8 * HOUR)
  };
}

function formatBeijing(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function removeNoise(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
}

function extractParagraphs(html) {
  const clean = removeNoise(html);
  const articleMatch = clean.match(/<article\b[\s\S]*?<\/article>/i);
  const scope = articleMatch ? articleMatch[0] : clean;
  const paragraphs = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => {
      const words = text.split(/\s+/).filter(Boolean).length;
      return words >= 10 &&
        !/^advertisement$/i.test(text) &&
        !/^(sign up|listen to|watch:|read more|follow bbc|share this)/i.test(text);
    });
  return [...new Set(paragraphs)].slice(0, 14);
}

function extractTitle(html, fallback) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(og?.[1] || title?.[1] || fallback).replace(/\s+\|\s+.*$/, "");
}

async function fetchText(url, timeout = 9000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DailyEnglishReader/0.1 (+local learning project)",
        "Accept": "text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(id);
  }
}

async function getFeedItems() {
  const results = await Promise.allSettled(FEEDS.map(async (feed) => parseFeed(await fetchText(feed.url), feed)));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

async function hydrateArticle(item, index) {
  if (item.feedBody?.length >= 2) {
    return {
      id: `${item.source}-${index}-${Buffer.from(item.url).toString("base64url").slice(0, 12)}`,
      source: item.source,
      publishedAt: item.publishedAt,
      url: item.url,
      title: item.title,
      imageUrl: editorialImageFor(item.title, index),
      body: item.feedBody
    };
  }
  const html = await fetchText(item.url);
  const body = extractParagraphs(html);
  if (body.length < 2) throw new Error("Article body was too short");
  return {
    id: `${item.source}-${index}-${Buffer.from(item.url).toString("base64url").slice(0, 12)}`,
    source: item.source,
    publishedAt: item.publishedAt,
    url: item.url,
    title: extractTitle(html, item.title),
    imageUrl: editorialImageFor(item.title, index),
    body
  };
}

async function loadArticles(force = false) {
  const { start, end } = beijingWindow();
  const now = Date.now();
  if (!force && articleCache && now - articleCache.cachedAt < 30 * 60 * 1000) return articleCache.payload;

  try {
    const feedItems = await getFeedItems();
    const seen = new Set();
    const candidates = feedItems
      .filter((item) => {
        const published = new Date(item.publishedAt);
        return published >= start && published < end;
      })
      .filter((item) => {
        const key = normalizeUrl(item.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 12);

    const hydrated = [];
    for (const [index, item] of candidates.entries()) {
      try {
        hydrated.push(await hydrateArticle(item, index));
      } catch {
        // Some publishers block article HTML extraction. Keep trying newer candidates.
      }
      if (hydrated.length === 3) break;
    }

    const payload = {
      status: hydrated.length === 3 ? "ready" : "partial",
      window: {
        start: start.toISOString(),
        end: end.toISOString(),
        startBeijing: formatBeijing(start),
        endBeijing: formatBeijing(end)
      },
      fetchedAt: new Date().toISOString(),
      sources: FEEDS.map((feed) => feed.source),
      articles: hydrated.length ? hydrated : FALLBACK_ARTICLES,
      note: hydrated.length === 3
        ? "Loaded from public English news feeds."
        : "Network or extraction limits prevented three live articles; showing local demo articles."
    };
    articleCache = { cachedAt: now, payload };
    return payload;
  } catch (error) {
    return {
      status: "fallback",
      window: {
        start: start.toISOString(),
        end: end.toISOString(),
        startBeijing: formatBeijing(start),
        endBeijing: formatBeijing(end)
      },
      fetchedAt: new Date().toISOString(),
      sources: FEEDS.map((feed) => feed.source),
      articles: FALLBACK_ARTICLES,
      note: `Live news loading failed: ${error.message}`
    };
  }
}

function lookupLocal(word) {
  const normalized = word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
  if (!normalized) return null;
  const direct = DICTIONARY[normalized];
  if (direct) return { word: normalized, source: "local", meanings: direct };
  const singular = normalized.replace(/(ies|es|s)$/i, (suffix) => suffix === "ies" ? "y" : "");
  if (DICTIONARY[singular]) return { word: singular, source: "local", meanings: DICTIONARY[singular] };
  const bare = normalized.replace(/(ing|ed)$/i, "");
  if (DICTIONARY[bare]) return { word: bare, source: "local", meanings: DICTIONARY[bare] };
  return {
    word: normalized,
    source: "fallback",
    meanings: ["暂无本地释义；可接入有道、欧路或自有词库返回完整常见义项。"]
  };
}

function audioUrlForWord(word) {
  const normalized = String(word || "").toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "").slice(0, 48);
  return normalized ? `/api/audio?word=${encodeURIComponent(normalized)}` : "";
}

function withAudio(definition) {
  return definition ? { ...definition, audioUrl: audioUrlForWord(definition.word) } : definition;
}

async function lookupRemote(word) {
  const url = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`;
  const text = await fetchText(url, 5000);
  const json = JSON.parse(text);
  const trs = json?.ec?.word?.[0]?.trs || [];
  const meanings = trs
    .flatMap((entry) => entry?.tr?.flatMap((tr) => tr?.l?.i || []) || [])
    .map((meaning) => String(meaning).trim())
    .filter(Boolean)
    .slice(0, 8);
  return meanings.length ? { word, source: "youdao", meanings } : null;
}

async function defineWord(rawWord) {
  const word = rawWord.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "").slice(0, 48);
  const local = lookupLocal(word);
  if (local?.source === "local") return withAudio(local);
  try {
    const remote = await lookupRemote(word);
    if (remote) return withAudio(remote);
  } catch {
    // Fall back to local placeholder when the external dictionary is unreachable.
  }
  return withAudio(local || { word, source: "fallback", meanings: ["暂无释义"] });
}

async function streamAudio(req, res, url) {
  const word = String(url.searchParams.get("word") || "").toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "").slice(0, 48);
  if (!word) {
    res.writeHead(400);
    res.end("Missing word");
    return;
  }
  try {
    const audio = await fetch(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`, {
      headers: { "User-Agent": "DailyEnglishReader/0.1 (+local learning project)" }
    });
    if (!audio.ok) throw new Error(`${audio.status} ${audio.statusText}`);
    const buffer = Buffer.from(await audio.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": audio.headers.get("content-type") || "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=604800"
    });
    res.end(buffer);
  } catch {
    res.writeHead(502);
    res.end("Audio unavailable");
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 250000) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function splitTranslationText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 900) return [normalized];
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > 900 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function translateWithYoudao(text) {
  const url = `https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4&q=${encodeURIComponent(text)}`;
  const json = JSON.parse(await fetchText(url, 9000));
  return json?.fanyi?.tran ? String(json.fanyi.tran).trim() : "";
}

async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en%7Czh-CN`;
  const json = JSON.parse(await fetchText(url, 9000));
  return json?.responseData?.translatedText ? String(json.responseData.translatedText).trim() : "";
}

async function translateText(text) {
  const chunks = splitTranslationText(text);
  const translated = [];
  for (const chunk of chunks) {
    if (!chunk) {
      translated.push("");
      continue;
    }
    let result = "";
    try {
      result = await translateWithYoudao(chunk);
    } catch {
      result = "";
    }
    if (!result) {
      try {
        result = await translateWithMyMemory(chunk);
      } catch {
        result = "";
      }
    }
    translated.push(result || `（该段翻译暂不可用，以下为原文）${chunk}`);
  }
  return translated.join("");
}

async function translateArticle(req) {
  const body = await readJsonBody(req);
  const title = String(body.title || "").slice(0, 500);
  const paragraphs = Array.isArray(body.body) ? body.body.map((item) => String(item || "").slice(0, 3500)) : [];
  const key = Buffer.from(JSON.stringify({ title, paragraphs })).toString("base64url");
  if (translationCache.has(key)) return translationCache.get(key);

  const payload = {
    title: await translateText(title),
    body: []
  };
  for (const paragraph of paragraphs) {
    payload.body.push(await translateText(paragraph));
  }
  translationCache.set(key, payload);
  return payload;
}

async function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/articles") {
    return sendJson(res, 200, await loadArticles(url.searchParams.has("refresh")));
  }
  if (url.pathname === "/api/define") {
    return sendJson(res, 200, await defineWord(url.searchParams.get("word") || ""));
  }
  if (url.pathname === "/api/audio") {
    return streamAudio(req, res, url);
  }
  if (url.pathname === "/api/translate" && req.method === "POST") {
    try {
      return sendJson(res, 200, await translateArticle(req));
    } catch (error) {
      return sendJson(res, 502, { error: error.message || "Translation failed" });
    }
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Daily English Reader running at http://localhost:${PORT}`);
});
