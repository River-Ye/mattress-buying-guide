# 選一張好床

繁體中文 Double／標準雙人與 Queen／雙人加大床墊選購指南。以台中實體門市、配送太平的公開通路為查核範圍，提供搜尋、篩選、排序及 2–4 項精確通路比較。

- 網站：[開啟床墊選購指南](https://river-ye.github.io/mattress-buying-guide/)
- 原始碼：[River-Ye/mattress-buying-guide](https://github.com/River-Ye/mattress-buying-guide)
- 原 Double 快照：2026-09-06；Queen 擴充：2026-09-08；各項來源日期與研究進度在網站「品牌盤點」及 catalog.json。

2026-09-08 已對原有3,775款Double逐款留下Queen查核紀錄，新增1,146個Queen尺寸組合。610款有精確寬長，287款有符合尺寸與配送資格的通路；其餘按尺寸、用途、配送或供貨缺口保留候選。沒有核實Queen的型號，在原商品詳情列明查核狀態；不保證每款都有Queen可買。

## 推薦榜單

編選及15款指定尺寸價格覆核：2026-09-08；其他資料依各項來源日期。

[開啟15款推薦榜單](https://river-ye.github.io/mattress-buying-guide/#recommendations)。依預算與規格取捨、台中試躺及舊床處理便利性安排編選順序，每款都有適合對象、推薦原因與負評／限制。排名是選購建議，沒有自行換算星等、銷量或實測品質分數。

榜單仍以15個不同型號計數。每款的「選擇尺寸」可切換已核實的 Double 或 Queen，價格、推薦原因、限制與來源隨尺寸更新；沒有已核實 Queen 的型號會顯示缺口，不填入替代價格。榜單的「加入比較」會帶入目前選定的型號、尺寸與通路，可和一般清單共用2–4項比較。展開每款可看官方推薦依據、完整通路條件與分範圍心得。

`recommendations.mjs` 每個型號以 `variants` 保存各尺寸的完整選款、理由和覆核資訊，`queenStatus` 記錄 Queen 的確認、未提供或待確認狀態；商品與通路資料仍取自 `catalog.json`。更新榜單需核對同尺寸價格、每款理由與來源，並執行 `npm run check`，防止重複尺寸灌入榜單或錯用價格；已核實但缺貨的 Queen 會明列缺貨並保留候選。

## 網站怎麼使用

1. 開啟 [床墊選購網站](https://river-ye.github.io/mattress-buying-guide/)，按「開始選床」。搜尋與篩選集中在商品列表上方；手機可點「搜尋與篩選床墊」展開條件。
2. 輸入品牌、型號或店名。品牌、尺寸、行政區等下拉欄位都可直接輸入部分中文或英文，從建議清單點選，或用方向鍵與 Enter 選取；清空欄位可重設該條件。「床型分類」可選 Double／標準雙人或 Queen／雙人加大，再配合實際公分尺寸、價格、軟硬、試躺或舊床載走條件，並在列表上方切換排序。資料未確認的款式在「候選」區。
3. 按「加入比較」選擇 2–4 個項目，再按底部「開始比較」。每欄保留指定尺寸與通路，切換篩選不會清空比較。
4. 展開「查看通路、負評與查核來源」，查看店址與地圖、運送樓層費、搬下樓／載走、退換貨及負評原文。沒有公開價格會顯示「需詢價」。

可在「品牌盤點」查看研究範圍與限制，或下載完整 JSON。原 Double 盤點最後連續兩輪補漏均未新增符合品牌；新增 Queen 的查核範圍與缺口另外註記，受限入口與未公開資料仍逐項保留待確認。

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

- size.category 使用 double 或 queen；原 Double 資料缺少此欄位時視為 double。Queen／雙人加大依品牌原文確認（含台規6尺），不以寬度自動推斷；system 保留台規、歐規、日規、美規或其他，實際寬長厚各自記錄。品牌明列 King、單人、Small Double 與加鋪薄墊不納入。
- Queen 以獨立 product 與 offer 記錄指定尺寸價格；同型號不同尺寸不共用報價。queenAudit 以 baseProductId 記錄原 Double 型號的 Queen 規格查核與缺口。
- price: null 表示需詢價，不能用其他尺寸起價、套組價或自行估價填補。
- delivery / trial / haul / downstairs 使用 yes、no、unknown；haul 與 downstairs 分別代表載走和搬下樓。
- scopeStatus: candidate 或未確認長寬的床款不出現在預設符合清單。無法確認配送的通路也保留候選。
- firmness.rank 使用 2（軟）、3（適中）、4（硬），僅依明確文字分類；品牌數字量尺與雙面不同者保留 null。
- review scope 分為 model、brand、store；Queen 可參考同型號其他尺寸心得，但會獨立標示，不能當成 Queen 使用報告。baseOfferId 保留相同通路的服務評論對應；有誘因心得標記 evidence: sponsored，歷史版本不直接綁目前型號。
- 不產生綜合星等或完整到府總價；服務費條件不明時維持待確認。

更新時只改有證據的欄位。價格、優惠、展示與服務會變動，此專案沒有自動更新排程。研究範圍及未核實缺口均公開；未讀到的評論不等於沒有負評。

## 篩選與比較

先篩出符合條件的販售通路，再以其中最低公開本體價展示和排序。未知價格在所有排序末尾，啟用數值價位條件時排除未知價格。比較保留指定型號、尺寸與通路；切換篩選不清空已選項目，重新整理頁面則重置。

## 安全與發布

外部資料以 textContent 呈現，外連只允許 http/https 且不允許含帳密網址。新分頁使用 noopener noreferrer。站內 CSP 限制腳本及資料載入至本站；不含追蹤碼、帳號登入、後端或付款功能。

GitHub Pages 使用 main 分支根目錄，.nojekyll 停用 Jekyll。發布前執行 npm run check，再確認 Pages 部署、公網資產雜湊，以及 Chrome 1440px／390px 的篩選、排序、比較、負評與回收來源流程。驗證紀錄見 QA.md。

躺感僅依明確文字分為偏軟／軟、適中、偏硬／硬三組，原文完整保留；不同品牌數字量尺不換算，只有支撐或表層觸感的描述不推定整床軟硬。
