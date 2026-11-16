# 寶可夢圖鑑

用 **Markdown 撰寫內容、網頁自動呈現** 的寶可夢圖鑑靜態網站，搭配 `CLAUDE.md` 讓 AI 能依照同一套規則持續擴充內容。

- 🌐 網頁：https://<josh-tai-glitch>.github.io/pokedex/
- 📘 AI 規則：[CLAUDE.md](CLAUDE.md)

## 功能

- **首頁卡片牆**：依屬性自動配色；可搜尋（中／英／日名、編號）、依屬性與世代篩選、依種族值／速度／身高／體重排序
- **介紹頁** `pokemon.html?id=025`：同一個樣板呈現所有寶可夢
  - 種族值長條圖與總和
  - 屬性弱點自動計算（4 倍、2 倍、½、¼、無效）
  - 進化鏈附圖、可點擊，支援分支進化（例如伊布 8 種進化）
  - 簡介／特色／冷知識，上一隻／下一隻導覽
- **屬性相剋表** `types.html`：18×18 完整表格，滑過可高亮整列與整欄
- **比較頁** `compare.html?a=006&b=009`：兩隻寶可夢並排比較種族值
- **📚 LLM Wiki** `wiki.html`：AI 從 `raw/` 原始筆記整理出的 12 篇知識條目（屬性、種族值、進化方式、伊布家族、三聖鳥…），用 `[[雙中括號]]` 互相連結，並自動連到圖鑑；有目錄、反向連結、待建立條目與更新紀錄
- **❓ 小測驗** `quiz.html`：看剪影猜寶可夢，記錄連勝
- **★ 收藏**、**🌙 深色模式**、**🎲 隨機**、介紹頁鍵盤 ←→ 切換
- 目前收錄 36 隻寶可夢，支援手機瀏覽

## LLM Wiki 怎麼運作

```
raw/（人放原始筆記，AI 只讀）  ──ingest──▶  wiki/（AI 撰寫條目）  ──▶  wiki.html 呈現
```

跟 AI 說「把 raw/xxx.md 整理進 Wiki」（ingest）、「檢查 Wiki」（lint），AI 會依 `CLAUDE.md` 第 9 節的流程更新條目並寫入 `wiki/log.md`。
- 圖片連結 [PokeAPI/sprites](https://github.com/PokeAPI/sprites)，不存放在 repo

## 如何新增一隻寶可夢

1. 複製 `templates/pokemon-template.md` → `pokemon/{3位編號}-{英文小寫}.md`
2. 填寫欄位與「簡介／特色／冷知識」三個段落
3. 把檔名加進 `pokemon/index.json`

或直接跟 AI 說：「依照 CLAUDE.md 新增 No.006 噴火龍」。

## 本機預覽

```bash
python -m http.server 8000
```

開啟 http://localhost:8000 （不能直接雙擊 HTML，因為網頁要用 fetch 讀取 Markdown）。

---

本站為課堂作業，寶可夢相關名稱與圖片版權屬於 Nintendo / Creatures / GAME FREAK。
