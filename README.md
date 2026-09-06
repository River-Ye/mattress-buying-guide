# 選一張好床

繁體中文雙人床墊選購指南。以台中實體門市、配送太平的公開通路為查核範圍，提供搜尋、篩選、排序及 2–4 項精確通路比較。

- 網站：[開啟床墊選購指南](https://river-ye.github.io/mattress-buying-guide/)
- 原始碼：[River-Ye/mattress-buying-guide](https://github.com/River-Ye/mattress-buying-guide)
- 查核快照：2026-09-06；各項來源日期與研究進度在網站「品牌盤點」及 catalog.json。

## 網站怎麼使用

1. 開啟 [床墊選購網站](https://river-ye.github.io/mattress-buying-guide/)，按「開始選床」。手機可點「篩選床墊」展開條件。
2. 輸入品牌、型號或店名，再選尺寸、價格、軟硬、試躺或舊床載走條件；右側可切換排序。資料未確認的款式在「候選」區。
3. 按「加入比較」選擇 2–4 個項目，再按底部「開始比較」。每欄保留指定尺寸與通路，切換篩選不會清空比較。
4. 展開「查看通路、負評與查核來源」，查看店址與地圖、運送樓層費、搬下樓／載走、退換貨及負評原文。沒有公開價格會顯示「需詢價」。

可在「品牌盤點」查看研究範圍與限制，或下載完整 JSON。本次最後連續兩輪補漏均未新增符合品牌；受限入口與未公開資料仍逐項保留待確認。

## 本地使用

無執行階段套件、無建置流程。使用 Node.js 內建測試，並透過任意靜態 HTTP 伺服器開啟：

```sh
git clone https://github.com/River-Ye/mattress-buying-guide.git
cd mattress-buying-guide
npm run check
python3 -m http.server 8873
```

開啟 http://localhost:8873/ 。請使用 HTTP；直接點開 HTML 的 file 協定無法可靠載入 JSON。

## 資料契約

catalog.json 將 brands、products、offers（置於對應商品）、reviews、sources、audit 及 research 分開。識別單位為品牌主體、型號、尺寸；同款不同販售通路各有獨立價格和服務。新增資料需保留原文網址、查核日期與來源引用，並執行 npm run check。

- price: null 表示需詢價，不能用其他尺寸起價、套組價或自行估價填補。
- delivery / trial / haul / downstairs 使用 yes、no、unknown；haul 與 downstairs 分別代表載走和搬下樓。
- scopeStatus: candidate 或未確認長寬的床款不出現在預設符合清單。無法確認配送的通路也保留候選。
- firmness.rank 使用 2（軟）、3（適中）、4（硬），僅依明確文字分類；品牌數字量尺與雙面不同者保留 null。
- review scope 分為 model、brand、store；有誘因心得標記 evidence: sponsored，歷史版本不直接綁目前型號。
- 不產生綜合星等或完整到府總價；服務費條件不明時維持待確認。

更新時只改有證據的欄位。價格、優惠、展示與服務會變動，此專案沒有自動更新排程。研究範圍及未核實缺口均公開；未讀到的評論不等於沒有負評。

## 篩選與比較

先篩出符合條件的販售通路，再以其中最低公開本體價展示和排序。未知價格在所有排序末尾，啟用數值價位條件時排除未知價格。比較保留指定型號、尺寸與通路；切換篩選不清空已選項目，重新整理頁面則重置。

## 安全與發布

外部資料以 textContent 呈現，外連只允許 http/https 且不允許含帳密網址。新分頁使用 noopener noreferrer。站內 CSP 限制腳本及資料載入至本站；不含追蹤碼、帳號登入、後端或付款功能。

GitHub Pages 使用 main 分支根目錄，.nojekyll 停用 Jekyll。發布前執行 npm run check，再確認 Pages 部署、公網資產雜湊，以及 Chrome 1440px／390px 的篩選、排序、比較、負評與回收來源流程。驗證紀錄見 QA.md。

躺感僅依明確文字分為偏軟／軟、適中、偏硬／硬三組，原文完整保留；不同品牌數字量尺不換算，只有支撐或表層觸感的描述不推定整床軟硬。
