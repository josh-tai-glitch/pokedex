// 寶可夢圖鑑 — 共用邏輯（規則見 CLAUDE.md）

// ===== 常數 =====

// 屬性中文名 → CSS class（與 CLAUDE.md 第 5 節同步）
const TYPE_CLASS = {
  一般: "normal", 火: "fire", 水: "water", 草: "grass", 電: "electric", 冰: "ice",
  格鬥: "fighting", 毒: "poison", 地面: "ground", 飛行: "flying", 超能力: "psychic",
  蟲: "bug", 岩石: "rock", 幽靈: "ghost", 龍: "dragon", 惡: "dark", 鋼: "steel", 妖精: "fairy",
};
const TYPES = Object.keys(TYPE_CLASS);

// 屬性相剋表（第 6 世代之後）：攻擊方 → { 防守方: 倍率 }，沒寫的就是 1 倍
const TYPE_CHART = {
  一般: { 岩石: 0.5, 鋼: 0.5, 幽靈: 0 },
  火: { 火: 0.5, 水: 0.5, 草: 2, 冰: 2, 蟲: 2, 岩石: 0.5, 龍: 0.5, 鋼: 2 },
  水: { 火: 2, 水: 0.5, 草: 0.5, 地面: 2, 岩石: 2, 龍: 0.5 },
  電: { 水: 2, 電: 0.5, 草: 0.5, 地面: 0, 飛行: 2, 龍: 0.5 },
  草: { 火: 0.5, 水: 2, 草: 0.5, 毒: 0.5, 地面: 2, 飛行: 0.5, 蟲: 0.5, 岩石: 2, 龍: 0.5, 鋼: 0.5 },
  冰: { 火: 0.5, 水: 0.5, 草: 2, 冰: 0.5, 地面: 2, 飛行: 2, 龍: 2, 鋼: 0.5 },
  格鬥: { 一般: 2, 冰: 2, 毒: 0.5, 飛行: 0.5, 超能力: 0.5, 蟲: 0.5, 岩石: 2, 幽靈: 0, 惡: 2, 鋼: 2, 妖精: 0.5 },
  毒: { 草: 2, 毒: 0.5, 地面: 0.5, 岩石: 0.5, 幽靈: 0.5, 鋼: 0, 妖精: 2 },
  地面: { 火: 2, 電: 2, 草: 0.5, 毒: 2, 飛行: 0, 蟲: 0.5, 岩石: 2, 鋼: 2 },
  飛行: { 電: 0.5, 草: 2, 格鬥: 2, 蟲: 2, 岩石: 0.5, 鋼: 0.5 },
  超能力: { 格鬥: 2, 毒: 2, 超能力: 0.5, 惡: 0, 鋼: 0.5 },
  蟲: { 火: 0.5, 草: 2, 格鬥: 0.5, 毒: 0.5, 飛行: 0.5, 超能力: 2, 幽靈: 0.5, 惡: 2, 鋼: 0.5, 妖精: 0.5 },
  岩石: { 火: 2, 冰: 2, 格鬥: 0.5, 地面: 0.5, 飛行: 2, 蟲: 2, 鋼: 0.5 },
  幽靈: { 一般: 0, 超能力: 2, 幽靈: 2, 惡: 0.5 },
  龍: { 龍: 2, 鋼: 0.5, 妖精: 0 },
  惡: { 格鬥: 0.5, 超能力: 2, 幽靈: 2, 惡: 0.5, 妖精: 0.5 },
  鋼: { 火: 0.5, 水: 0.5, 電: 0.5, 冰: 2, 岩石: 2, 鋼: 0.5, 妖精: 2 },
  妖精: { 火: 0.5, 格鬥: 2, 毒: 0.5, 龍: 2, 惡: 2, 鋼: 0.5 },
};

// 種族值順序（與 front matter 的 stats 陣列對應）
const STAT_NAMES = ["HP", "攻擊", "防禦", "特攻", "特防", "速度"];
const STAT_MAX = 255;

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

// ===== 小工具 =====

const imageUrl = (id) => `${SPRITE_BASE}/other/official-artwork/${id}.png`;
const fallbackImageUrl = (id) => `${SPRITE_BASE}/${id}.png`;
const padId = (id) => String(id).padStart(3, "0");
const typeClass = (t) => "type-" + (TYPE_CLASS[t] || "normal");
const statTotal = (p) => (p.stats || []).reduce((a, b) => a + b, 0);
const detailUrl = (id) => `pokemon.html?id=${padId(id)}`;
const wikiUrl = (slug) => `wiki.html?page=${encodeURIComponent(slug)}`;
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function typeBadges(types) {
  return (types || []).map((t) => `<span class="type-badge ${typeClass(t)}">${escapeHtml(t)}</span>`).join("");
}
function imgTag(p, cls) {
  return `<img class="${cls}" src="${imageUrl(p.id)}" alt="${escapeHtml(p.name)}" loading="lazy"
    onerror="this.onerror=null;this.src='${fallbackImageUrl(p.id)}'">`;
}
function errorBox(el, msg) {
  el.innerHTML = `<p class="error">${escapeHtml(msg)}（請用本機伺服器開啟，見 README）</p>`;
}

// localStorage 可能被瀏覽器封鎖，一律包 try/catch
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 忽略 */ }
  },
};

// ===== 深色模式（越早執行越好，避免閃爍） =====

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById("theme-btn");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
applyTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

// ===== 收藏 =====

const favs = new Set(store.get("favorites", []));
const isFav = (id) => favs.has(id);
function toggleFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  store.set("favorites", [...favs]);
  return favs.has(id);
}
function favButton(p, cls = "") {
  return `<button class="fav-btn ${cls} ${isFav(p.id) ? "on" : ""}" data-fav="${p.id}" type="button"
    title="加入／移除收藏" aria-label="收藏 ${escapeHtml(p.name)}">${isFav(p.id) ? "★" : "☆"}</button>`;
}
// 全站委派：任何 [data-fav] 按鈕都能切換收藏
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fav]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const on = toggleFav(Number(btn.dataset.fav));
  document.querySelectorAll(`[data-fav="${btn.dataset.fav}"]`).forEach((b) => {
    b.classList.toggle("on", on);
    b.textContent = on ? "★" : "☆";
  });
  document.dispatchEvent(new CustomEvent("favchange"));
});

// ===== 資料讀取 =====

// 解析 front matter（只支援 CLAUDE.md 規定的簡單格式）
function parseMarkdown(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const toValue = (v) => (v !== "" && !isNaN(Number(v)) ? Number(v) : v);
  const data = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    data[key] = raw.startsWith("[") && raw.endsWith("]")
      ? raw.slice(1, -1).split(",").map((s) => toValue(s.trim())).filter((s) => s !== "")
      : toValue(raw);
  }
  return { data, body: m[2] };
}

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("讀取 " + path + " 失敗");
  return res.text();
}

let _allCache = null;
function loadAll() {
  _allCache ??= fetchText("pokemon/index.json").then(async (json) => {
    const files = JSON.parse(json);
    const list = await Promise.all(files.map(async (file) => {
      try {
        const { data, body } = parseMarkdown(await fetchText("pokemon/" + file));
        return { ...data, file, body };
      } catch (e) { console.error(e); return null; }
    }));
    return list.filter(Boolean).sort((a, b) => a.id - b.id);
  });
  return _allCache;
}

// ===== LLM Wiki =====

// [[標題]]、[[標題|文字]]；表格內可寫成 [[標題\|文字]]
const WIKILINK_RE = /\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/g;

let _wikiCache = null;
function loadWiki() {
  _wikiCache ??= fetchText("wiki/index.json").then(async (json) => {
    const files = JSON.parse(json);
    const pages = await Promise.all(files.map(async (file) => {
      try {
        const { data, body } = parseMarkdown(await fetchText("wiki/" + file));
        const slug = file.replace(/\.md$/, "");
        const links = [...body.matchAll(WIKILINK_RE)].map((m) => m[1].trim());
        return { ...data, slug, file, body, links: [...new Set(links)] };
      } catch (e) { console.error(e); return null; }
    }));
    return pages.filter(Boolean);
  });
  return _wikiCache;
}

// [[標題]] / [[標題|顯示文字]] → 連到 Wiki 條目或寶可夢介紹頁；找不到的顯示為紅色連結
function renderWikiBody(body, wikiByTitle, pokeByName) {
  const html = body.replace(WIKILINK_RE, (_, target, label) => {
    target = target.trim();
    const text = escapeHtml((label || target).trim());
    if (wikiByTitle[target]) return `<a class="wikilink" href="${wikiUrl(wikiByTitle[target].slug)}">${text}</a>`;
    if (pokeByName[target]) return `<a class="wikilink poke" href="${detailUrl(pokeByName[target].id)}">${text}</a>`;
    return `<span class="wikilink missing" title="尚未建立的條目">${text}</span>`;
  });
  return marked.parse(html);
}

// ===== 共用元件 =====

// 防守方（1～2 個屬性）受到各屬性攻擊的倍率
function defenseMultipliers(types) {
  const result = {};
  for (const atk of TYPES) result[atk] = types.reduce((m, def) => m * (TYPE_CHART[atk][def] ?? 1), 1);
  return result;
}

function weaknessHtml(types) {
  const mult = defenseMultipliers(types);
  const groups = [[4, "4 倍弱點"], [2, "2 倍弱點"], [0.5, "½ 抵抗"], [0.25, "¼ 抵抗"], [0, "無效"]];
  return groups.map(([v, label]) => {
    const ts = TYPES.filter((t) => mult[t] === v);
    if (!ts.length) return "";
    return `<div class="weak-row"><span class="weak-label m${String(v).replace(".", "")}">${label}</span>
      <div class="badges left">${typeBadges(ts)}</div></div>`;
  }).join("");
}

function statBarsHtml(stats) {
  if (!stats || stats.length !== 6) return `<p class="muted">尚無種族值資料</p>`;
  const rows = stats.map((v, i) => `
    <div class="stat-row">
      <span class="stat-name">${STAT_NAMES[i]}</span>
      <span class="stat-val">${v}</span>
      <div class="stat-track"><div class="stat-bar ${v >= 100 ? "high" : v < 60 ? "low" : ""}" style="width:${(v / STAT_MAX) * 100}%"></div></div>
    </div>`).join("");
  return rows + `<div class="stat-row total"><span class="stat-name">總和</span><span class="stat-val">${stats.reduce((a, b) => a + b, 0)}</span><div></div></div>`;
}

// evolution: ["妙蛙種子", "妙蛙草", "妙蛙花"]；同一階段的分支用 "/" 分隔
function evolutionHtml(p, byName) {
  return (p.evolution || []).map((stage) => {
    const items = String(stage).split("/").map((n) => {
      n = n.trim();
      const e = byName[n];
      const cls = `evo-item ${n === p.name ? "current" : ""}`;
      return e
        ? `<a class="${cls}" href="${detailUrl(e.id)}">${imgTag(e, "evo-img")}<span>${escapeHtml(n)}</span></a>`
        : `<span class="${cls} missing"><span class="evo-img placeholder">?</span><span>${escapeHtml(n)}</span></span>`;
    });
    return `<div class="evo-stage">${items.join("")}</div>`;
  }).join('<span class="evo-arrow">→</span>');
}

function miniCard(p) {
  return `<a class="mini-card ${typeClass(p.types[0])}" href="${detailUrl(p.id)}">${imgTag(p, "mini-img")}<span>${escapeHtml(p.name)}</span></a>`;
}

// 頁首導覽：標記目前頁面、隨機按鈕、深色模式按鈕
function initNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a[data-page]").forEach((a) => {
    if (a.dataset.page === here || (here === "pokemon.html" && a.dataset.page === "index.html")) a.classList.add("active");
  });
  document.getElementById("random-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const list = await loadAll();
    location.href = detailUrl(list[Math.floor(Math.random() * list.length)].id);
  });
  const themeBtn = document.getElementById("theme-btn");
  themeBtn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    store.set("theme", next);
    applyTheme(next);
  });
  applyTheme(document.documentElement.dataset.theme);
}
document.addEventListener("DOMContentLoaded", initNav);

// ===== 首頁 =====

async function initIndexPage() {
  const grid = document.getElementById("grid");
  const search = document.getElementById("search");
  const filters = document.getElementById("type-filters");
  const genSel = document.getElementById("gen-filter");
  const sortSel = document.getElementById("sort");
  const favOnly = document.getElementById("fav-only");
  const count = document.getElementById("count");
  let list = [];
  let activeType = "";

  try { list = await loadAll(); } catch (e) { return errorBox(grid, e.message); }

  const used = TYPES.filter((t) => list.some((p) => p.types.includes(t)));
  filters.innerHTML =
    `<button class="filter active" data-type="">全部</button>` +
    used.map((t) => `<button class="filter ${typeClass(t)}" data-type="${t}">${t}</button>`).join("");
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    activeType = btn.dataset.type;
    filters.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  const gens = [...new Set(list.map((p) => p.generation))].sort((a, b) => a - b);
  genSel.innerHTML = `<option value="">全部世代</option>` + gens.map((g) => `<option value="${g}">第 ${g} 世代</option>`).join("");

  const SORTS = {
    "id": (a, b) => a.id - b.id,
    "id-desc": (a, b) => b.id - a.id,
    "total-desc": (a, b) => statTotal(b) - statTotal(a),
    "height-desc": (a, b) => b.height - a.height,
    "weight-desc": (a, b) => b.weight - a.weight,
    "speed-desc": (a, b) => (b.stats?.[5] ?? 0) - (a.stats?.[5] ?? 0),
  };
  [search, genSel, sortSel, favOnly].forEach((el) => el.addEventListener("input", render));
  document.addEventListener("favchange", () => favOnly.checked && render());

  function extraInfo(p) {
    switch (sortSel.value) {
      case "total-desc": return `種族值 ${statTotal(p)}`;
      case "height-desc": return `${p.height} m`;
      case "weight-desc": return `${p.weight} kg`;
      case "speed-desc": return `速度 ${p.stats?.[5] ?? "-"}`;
      default: return "";
    }
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const gen = genSel.value;
    const shown = list.filter((p) => {
      const hay = [p.name, p.name_en, p.name_ja, padId(p.id), p.category].join(" ").toLowerCase();
      return (!activeType || p.types.includes(activeType))
        && (!gen || String(p.generation) === gen)
        && (!favOnly.checked || isFav(p.id))
        && (!q || hay.includes(q));
    }).sort(SORTS[sortSel.value]);
    count.textContent = `共 ${shown.length} / ${list.length} 隻・已收藏 ${favs.size} 隻`;
    grid.innerHTML = shown.length
      ? shown.map((p) => {
          const extra = extraInfo(p);
          return `
      <a class="card ${typeClass(p.types[0])}" href="${detailUrl(p.id)}">
        <span class="card-no">No.${padId(p.id)}</span>
        ${favButton(p, "card-fav")}
        ${imgTag(p, "card-img")}
        <h2 class="card-name">${escapeHtml(p.name)}</h2>
        <p class="card-en">${escapeHtml(p.name_en)}</p>
        <div class="badges">${typeBadges(p.types)}</div>
        ${extra ? `<span class="card-extra">${extra}</span>` : ""}
      </a>`;
        }).join("")
      : `<p class="empty">${favOnly.checked && !favs.size ? "還沒有收藏任何寶可夢，點卡片右上角的 ☆ 加入收藏吧！" : "找不到符合的寶可夢 😢"}</p>`;
  }
  render();
}

// ===== 介紹頁 =====

async function initDetailPage() {
  const root = document.getElementById("detail");
  const id = Number(new URLSearchParams(location.search).get("id"));
  let list;
  try { list = await loadAll(); } catch (e) { return errorBox(root, e.message); }

  const pos = list.findIndex((x) => x.id === id);
  if (pos < 0) {
    root.innerHTML = `<p class="error">找不到編號 ${escapeHtml(id)} 的寶可夢。<a href="index.html">回圖鑑</a></p>`;
    return;
  }
  const p = list[pos];
  const byName = Object.fromEntries(list.map((x) => [x.name, x]));
  const prev = list[pos - 1], next = list[pos + 1];
  document.title = `No.${padId(p.id)} ${p.name}｜寶可夢圖鑑`;

  // 鍵盤 ← → 切換
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "ArrowLeft" && prev) location.href = detailUrl(prev.id);
    if (e.key === "ArrowRight" && next) location.href = detailUrl(next.id);
  });

  root.innerHTML = `
    <nav class="pager">
      ${prev ? `<a href="${detailUrl(prev.id)}">← No.${padId(prev.id)} ${escapeHtml(prev.name)}</a>` : "<span></span>"}
      <span class="muted small">鍵盤 ← → 也能切換</span>
      ${next ? `<a href="${detailUrl(next.id)}">No.${padId(next.id)} ${escapeHtml(next.name)} →</a>` : "<span></span>"}
    </nav>
    <section class="hero ${typeClass(p.types[0])}">
      ${imgTag(p, "hero-img")}
      <div class="hero-info">
        <p class="hero-no">No.${padId(p.id)}</p>
        <h1>${escapeHtml(p.name)} ${favButton(p, "hero-fav")}</h1>
        <p class="hero-sub">${escapeHtml(p.name_en)}・${escapeHtml(p.name_ja)}</p>
        <div class="badges left">${typeBadges(p.types)}</div>
        <dl class="stats">
          <div><dt>分類</dt><dd>${escapeHtml(p.category)}</dd></div>
          <div><dt>世代</dt><dd>第 ${p.generation} 世代</dd></div>
          <div><dt>身高</dt><dd>${p.height} m</dd></div>
          <div><dt>體重</dt><dd>${p.weight} kg</dd></div>
          <div class="wide"><dt>特性</dt><dd>${(p.abilities || []).map(escapeHtml).join("、")}</dd></div>
        </dl>
        <a class="btn" href="compare.html?a=${padId(p.id)}">⚖️ 和其他寶可夢比較</a>
      </div>
    </section>
    <div class="two-col">
      <section class="panel"><h2>種族值</h2>${statBarsHtml(p.stats)}</section>
      <section class="panel"><h2>屬性相剋（受到攻擊時）</h2>${weaknessHtml(p.types)}</section>
    </div>
    <section class="panel"><h2>進化鏈</h2><div class="evo-chain">${evolutionHtml(p, byName)}</div></section>
    <article class="panel content">${marked.parse(p.body)}</article>
    <section class="panel" id="related-wiki" hidden></section>
  `;

  // 相關 Wiki 條目：哪些 Wiki 頁面有 [[這隻寶可夢]]
  try {
    const pages = (await loadWiki()).filter((w) => w.links.includes(p.name));
    if (pages.length) {
      const box = document.getElementById("related-wiki");
      box.hidden = false;
      box.innerHTML = `<h2>📚 相關 Wiki 條目</h2><div class="wiki-list">${pages.map(wikiCard).join("")}</div>`;
    }
  } catch (e) { console.error(e); }
}

// ===== 屬性相剋表 =====

function initTypesPage() {
  const table = document.getElementById("type-table");
  const label = (v) => (v === 1 ? "" : v === 0.5 ? "½" : String(v));
  const cls = (v) => (v === 2 ? "eff-2" : v === 0.5 ? "eff-05" : v === 0 ? "eff-0" : "");
  let html = `<thead><tr><th class="corner">攻↓ 防→</th>${TYPES.map((t) => `<th><span class="type-badge ${typeClass(t)}">${t}</span></th>`).join("")}</tr></thead><tbody>`;
  for (const atk of TYPES) {
    html += `<tr><th><span class="type-badge ${typeClass(atk)}">${atk}</span></th>`;
    for (const def of TYPES) {
      const v = TYPE_CHART[atk][def] ?? 1;
      html += `<td class="${cls(v)}" title="${atk} → ${def}：${v} 倍">${label(v)}</td>`;
    }
    html += "</tr>";
  }
  table.innerHTML = html + "</tbody>";

  table.addEventListener("mouseover", (e) => {
    const td = e.target.closest("td");
    table.querySelectorAll(".hl").forEach((x) => x.classList.remove("hl"));
    if (!td) return;
    const col = td.cellIndex;
    td.parentElement.classList.add("hl");
    table.querySelectorAll("tr").forEach((tr) => tr.children[col]?.classList.add("hl"));
  });
}

// ===== 比較頁 =====

async function initComparePage() {
  const root = document.getElementById("compare");
  const selA = document.getElementById("pick-a");
  const selB = document.getElementById("pick-b");
  let list;
  try { list = await loadAll(); } catch (e) { return errorBox(root, e.message); }

  const opts = list.map((p) => `<option value="${p.id}">No.${padId(p.id)} ${escapeHtml(p.name)}</option>`).join("");
  selA.innerHTML = selB.innerHTML = opts;
  const qs = new URLSearchParams(location.search);
  const has = (v) => list.some((p) => p.id === v);
  const a0 = Number(qs.get("a")), b0 = Number(qs.get("b"));
  selA.value = has(a0) ? a0 : list[0].id;
  selB.value = has(b0) ? b0 : list.find((p) => p.id !== Number(selA.value))?.id ?? list[0].id;

  function side(p, other) {
    const rows = STAT_NAMES.map((n, i) => {
      const v = p.stats?.[i] ?? 0, o = other.stats?.[i] ?? 0;
      return `<div class="stat-row ${v > o ? "win" : ""}"><span class="stat-name">${n}</span><span class="stat-val">${v}</span>
        <div class="stat-track"><div class="stat-bar" style="width:${(v / STAT_MAX) * 100}%"></div></div></div>`;
    }).join("");
    const t = statTotal(p), ot = statTotal(other);
    // 自己的招式打對方：用自身屬性對對方的最佳倍率
    const best = Math.max(...p.types.map((atk) => other.types.reduce((m, d) => m * (TYPE_CHART[atk][d] ?? 1), 1)));
    return `
      <div class="cmp-side ${typeClass(p.types[0])}">
        <a href="${detailUrl(p.id)}">${imgTag(p, "cmp-img")}</a>
        <p class="hero-no">No.${padId(p.id)}</p>
        <h2>${escapeHtml(p.name)}</h2>
        <div class="badges">${typeBadges(p.types)}</div>
        <p class="matchup">本系招式打對方：<strong class="x${String(best).replace(".", "")}">${best} 倍</strong></p>
        <dl class="stats">
          <div><dt>身高</dt><dd>${p.height} m</dd></div>
          <div><dt>體重</dt><dd>${p.weight} kg</dd></div>
        </dl>
        <div class="cmp-stats">${rows}
          <div class="stat-row total ${t > ot ? "win" : ""}"><span class="stat-name">總和</span><span class="stat-val">${t}</span><div></div></div>
        </div>
      </div>`;
  }

  function render() {
    const a = list.find((p) => p.id === Number(selA.value));
    const b = list.find((p) => p.id === Number(selB.value));
    history.replaceState(null, "", `?a=${padId(a.id)}&b=${padId(b.id)}`);
    root.innerHTML = `<div class="cmp-grid">${side(a, b)}<div class="cmp-vs">VS</div>${side(b, a)}</div>`;
  }
  selA.addEventListener("change", render);
  selB.addEventListener("change", render);
  document.getElementById("swap").addEventListener("click", () => {
    [selA.value, selB.value] = [selB.value, selA.value];
    render();
  });
  render();
}

// ===== 小測驗：猜猜我是誰 =====

async function initQuizPage() {
  const root = document.getElementById("quiz");
  let list;
  try { list = await loadAll(); } catch (e) { return errorBox(root, e.message); }
  if (list.length < 4) return errorBox(root, "至少需要 4 隻寶可夢才能出題");

  let score = 0, round = 0, streak = 0;
  let best = store.get("quizBest", 0);

  function next() {
    round++;
    const [answer, ...others] = shuffle(list).slice(0, 4);
    const choices = shuffle([answer, ...others]);
    root.innerHTML = `
      <div class="quiz-head">
        <span>第 ${round} 題</span><span>答對 ${score} 題</span><span>連勝 ${streak}</span><span>最高連勝 ${best}</span>
      </div>
      <div class="quiz-stage">
        ${imgTag(answer, "quiz-img silhouette")}
        <p class="quiz-hint">提示：${typeBadges(answer.types)}　第 ${answer.generation} 世代</p>
      </div>
      <div class="quiz-choices">
        ${choices.map((c) => `<button class="quiz-choice" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join("")}
      </div>
      <div class="quiz-result" aria-live="polite"></div>`;

    root.querySelector(".quiz-choices").addEventListener("click", (e) => {
      const btn = e.target.closest(".quiz-choice");
      if (!btn || root.querySelector(".quiz-choice:disabled")) return;
      const ok = Number(btn.dataset.id) === answer.id;
      if (ok) { score++; streak++; } else { streak = 0; }
      if (streak > best) { best = streak; store.set("quizBest", best); }
      root.querySelectorAll(".quiz-choice").forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.id) === answer.id) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      root.querySelector(".quiz-img").classList.remove("silhouette");
      root.querySelector(".quiz-result").innerHTML = `
        <p class="${ok ? "ok" : "ng"}">${ok ? "🎉 答對了！" : "😢 答錯了！"}牠是 <a href="${detailUrl(answer.id)}">No.${padId(answer.id)} ${escapeHtml(answer.name)}</a></p>
        <button class="btn" id="next-q">下一題 →</button>`;
      document.getElementById("next-q").addEventListener("click", next);
      document.getElementById("next-q").focus();
    });
  }
  next();
}

// ===== Wiki 頁面 =====

function wikiCard(w) {
  return `<a class="wiki-card" href="${wikiUrl(w.slug)}">
    <span class="wiki-cat">${escapeHtml(w.category || "未分類")}</span>
    <strong>${escapeHtml(w.title)}</strong>
    <span class="muted small">${escapeHtml(w.summary || "")}</span>
  </a>`;
}

async function initWikiPage() {
  const root = document.getElementById("wiki");
  let pages, list;
  try { [pages, list] = await Promise.all([loadWiki(), loadAll()]); } catch (e) { return errorBox(root, e.message); }
  const wikiByTitle = Object.fromEntries(pages.map((w) => [w.title, w]));
  const pokeByName = Object.fromEntries(list.map((p) => [p.name, p]));
  const slug = new URLSearchParams(location.search).get("page");

  if (!slug) return renderWikiHome(root, pages, wikiByTitle, pokeByName);

  const w = pages.find((x) => x.slug === slug);
  if (!w) {
    root.innerHTML = `<p class="error">找不到條目「${escapeHtml(slug)}」。<a href="wiki.html">回 Wiki 首頁</a></p>`;
    return;
  }
  document.title = `${w.title}｜寶可夢 Wiki`;

  const backlinks = pages.filter((x) => x !== w && x.links.includes(w.title));
  const relatedPoke = w.links.map((n) => pokeByName[n]).filter(Boolean);
  const relatedWiki = w.links.map((n) => wikiByTitle[n]).filter((x) => x && x !== w);

  root.innerHTML = `
    <nav class="pager"><a href="wiki.html">← Wiki 首頁</a><span></span></nav>
    <div class="wiki-layout">
      <article class="panel content wiki-article">
        <p class="wiki-cat">${escapeHtml(w.category || "未分類")}</p>
        <h1>${escapeHtml(w.title)}</h1>
        <p class="wiki-summary">${escapeHtml(w.summary || "")}</p>
        <div class="wiki-meta muted small">
          最後更新：${escapeHtml(w.updated || "-")}
          ${(w.tags || []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="wiki-body">${renderWikiBody(w.body, wikiByTitle, pokeByName)}</div>
        ${(w.sources || []).length ? `<h2>資料來源</h2><ul class="sources">${w.sources.map((s) => `<li><code>raw/${escapeHtml(s)}</code></li>`).join("")}</ul>` : ""}
      </article>
      <aside class="wiki-side">
        <section class="panel toc"><h2>目錄</h2><ol id="toc"></ol></section>
        ${relatedPoke.length ? `<section class="panel"><h2>出現的寶可夢</h2><div class="mini-grid">${relatedPoke.map(miniCard).join("")}</div></section>` : ""}
        ${relatedWiki.length ? `<section class="panel"><h2>延伸閱讀</h2><ul class="link-list">${relatedWiki.map((x) => `<li><a href="${wikiUrl(x.slug)}">${escapeHtml(x.title)}</a></li>`).join("")}</ul></section>` : ""}
        <section class="panel"><h2>反向連結</h2>${backlinks.length
          ? `<ul class="link-list">${backlinks.map((x) => `<li><a href="${wikiUrl(x.slug)}">${escapeHtml(x.title)}</a></li>`).join("")}</ul>`
          : `<p class="muted small">還沒有其他條目連到這裡</p>`}</section>
      </aside>
    </div>`;

  // 依內文 h2 產生目錄
  const toc = document.getElementById("toc");
  const heads = root.querySelectorAll(".wiki-body h2");
  heads.forEach((h, i) => {
    h.id = "s" + (i + 1);
    toc.insertAdjacentHTML("beforeend", `<li><a href="#${h.id}">${escapeHtml(h.textContent)}</a></li>`);
  });
  if (!heads.length) toc.closest(".toc").remove();
}

async function renderWikiHome(root, pages, wikiByTitle, pokeByName) {
  const cats = [...new Set(pages.map((w) => w.category || "未分類"))];
  const linkCount = pages.reduce((n, w) => n + w.links.length, 0);
  const missing = [...new Set(pages.flatMap((w) => w.links))].filter((t) => !wikiByTitle[t] && !pokeByName[t]);
  let log = "";
  try { log = await fetchText("wiki/log.md"); } catch { /* 沒有 log 也沒關係 */ }

  root.innerHTML = `
    <section class="panel wiki-hero">
      <h1>📚 寶可夢 Wiki</h1>
      <p>由 AI 依照 <code>CLAUDE.md</code> 的 LLM Wiki 流程，從 <code>raw/</code> 的原始資料整理而成的知識庫。條目之間用 <code>[[連結]]</code> 互相串起來，提到的寶可夢也會直接連到圖鑑。</p>
      <div class="wiki-stats">
        <div><strong>${pages.length}</strong><span>條目</span></div>
        <div><strong>${cats.length}</strong><span>分類</span></div>
        <div><strong>${linkCount}</strong><span>內部連結</span></div>
        <div><strong>${missing.length}</strong><span>待建立</span></div>
      </div>
      <input id="wiki-search" type="search" placeholder="搜尋 Wiki 條目…">
    </section>
    <div id="wiki-cats"></div>
    ${missing.length ? `<section class="panel"><h2>🔴 待建立的條目</h2><p class="muted small">這些名稱被連結了，但還沒有對應的 Wiki 條目或寶可夢頁面。</p>
      <div class="tag-row">${missing.map((t) => `<span class="tag missing">${escapeHtml(t)}</span>`).join("")}</div></section>` : ""}
    ${log ? `<section class="panel content"><h2>📝 更新紀錄（wiki/log.md）</h2>${renderWikiBody(parseMarkdown(log).body.replace(/^# .*\n/, ""), wikiByTitle, pokeByName)}</section>` : ""}
  `;

  const catBox = document.getElementById("wiki-cats");
  const search = document.getElementById("wiki-search");
  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = pages.filter((w) => !q || [w.title, w.summary, ...(w.tags || [])].join(" ").toLowerCase().includes(q));
    catBox.innerHTML = cats.map((c) => {
      const items = shown.filter((w) => (w.category || "未分類") === c);
      return items.length ? `<section class="panel"><h2>${escapeHtml(c)}</h2><div class="wiki-list">${items.map(wikiCard).join("")}</div></section>` : "";
    }).join("") || `<p class="empty">找不到符合的條目</p>`;
  }
  search.addEventListener("input", render);
  render();
}
