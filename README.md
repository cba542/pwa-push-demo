# PWA Web Push 示範（預約通知測試）

獨立的網頁推播（Web Push / PWA）示範專案，用來驗證「店家沒開網頁也能收到新預約通知」。

- **公開 repo：** https://github.com/cba542/pwa-push-demo
- **示範站（Render 免費服務）：** https://pwa-push-demo.onrender.com
- **與正式預約站完全分開**，不會覆蓋或影響正式站。

2026-10-16 已在使用者的小米／紅米 Android（Chrome）實測通過：鎖屏狀態可亮螢幕並有提示音。關鍵是開啟「網站專屬」通知管道設定。詳見 [`docs/手機通知設定指南.md`](docs/手機通知設定指南.md)。

---

## 架構

| 路徑／檔案 | 用途 |
|---|---|
| `public/index.html` | 測試頁：註冊 Service Worker、請求通知權限、訂閱推播並 POST 到 `/subscribe` |
| `public/sw.js` | Service Worker：接收 `push` 事件、`showNotification`、點擊後開頁 |
| `public/manifest.json` | PWA manifest（可「加到主畫面」） |
| `server.js` | HTTP 伺服器：靜態檔 + `/vapid`、`/subscribe`、`/send` |
| `lib.js` | VAPID 金鑰、訂閱清單、`web-push` 發送（`TTL: 3600`、`urgency: 'high'`） |
| `send-remote.sh` | 遠端發推播的輔助腳本（需環境變數，不含密碼） |

### API

1. **`GET /vapid`**  
   回傳 `{ publicKey }`，前端用來 `pushManager.subscribe`。

2. **`POST /subscribe`**  
   Body：瀏覽器的 PushSubscription JSON（需有 `endpoint`）。以 endpoint 去重後寫入 `subscriptions.json`（本機／磁碟；正式整合應改存 DB）。

3. **`POST /send`**  
   Header：`x-token: <SEND_TOKEN>`  
   Body（可選）：`{ "title": "...", "body": "..." }`  
   對所有訂閱呼叫 `web-push`，選項：`{ TTL: 3600, urgency: 'high' }`。  
   回傳 `{ ok, fail, total }`。  
   訂閱回 **404／410** 時自動從清單移除（過期清理）。

未設定 `SEND_TOKEN` 時，`POST /send` 一律 403。

---

## 環境變數

| 變數 | 必要 | 說明 |
|---|---|---|
| `SEND_TOKEN` | 是（要發推播時） | 保護 `/send` 的密鑰；只放在 Render 環境變數或本機 shell，**不要寫進 repo** |
| `VAPID_PUBLIC_KEY` | 建議 | 固定公鑰 |
| `VAPID_PRIVATE_KEY` | 建議 | 固定私鑰 |
| `PORT` | 否 | 預設 `8787`（Render 會注入自己的 PORT） |

### 為何要固定 VAPID 金鑰

若未設定 `VAPID_*`，`lib.js` 每次程序啟動會 `generateVAPIDKeys()`。  
Render **免費方案**休眠後重啟會換新金鑰 → 舊訂閱全部失效，店家必須重新按「開啟通知」。

**正式使用請在 Render 環境變數設定一組固定的 VAPID 公／私鑰**（可用 `npx web-push generate-vapid-keys` 產生一次後貼上）。  
**絕對不要把私鑰、SEND_TOKEN 提交進 Git。**

---

## 本機執行

```bash
npm install
export SEND_TOKEN='你自己設的密鑰'   # 勿提交
# 可選：固定 VAPID
# export VAPID_PUBLIC_KEY='...'
# export VAPID_PRIVATE_KEY='...'
npm start
# 開 http://localhost:8787
```

本機發推播：

```bash
curl -sS -X POST http://localhost:8787/send \
  -H "x-token: $SEND_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title":"測試","body":"本機推播"}'
```

> Web Push 需要 HTTPS（或 localhost）。真機測試請用下方 Render 部署。

---

## 部署到 Render

1. 在 Render 開 **新的 Web Service**（與正式預約站分開）。
2. 連到本 repo：`cba542/pwa-push-demo`。
3. 設定：
   - **Runtime：** Node
   - **Build：** `npm install`
   - **Start：** `npm start`
   - **Plan：** Free
4. **Environment：**
   - `SEND_TOKEN` = 一組長隨機字串（自行產生，勿寫進 repo）
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` = 固定金鑰（強烈建議）
5. Deploy 後網址形如：`https://pwa-push-demo.onrender.com`

免費方案會休眠：第一次開啟可能要等約一分鐘。休眠重啟若沒固定 VAPID，訂閱會失效。

### 遠端發送

```bash
export RENDER_URL=https://pwa-push-demo.onrender.com
export SEND_TOKEN='（與 Render 環境變數相同，勿寫進檔案／repo）'
./send-remote.sh '新預約通知' '有人剛預約了，請查看後台'
```

或直接：

```bash
curl -sS -X POST "$RENDER_URL/send" \
  -H "x-token: $SEND_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title":"新預約通知","body":"有人剛預約了"}'
```

---

## 過期訂閱清理

`lib.js` 的 `sendAll`：若 `web-push` 拋錯且 `statusCode` 為 **404** 或 **410**，該訂閱不再寫回清單。其他錯誤（暫時網路問題等）會保留，下次再試。

---

## 接到預約系統（整合指引）

示範站用記憶體／檔案存訂閱；正式產品建議：

1. **訂閱存 DB，依店家（merchant）分組**  
   後台「開啟通知」成功後，把 PushSubscription JSON 存到該店家底下（一支手機可有多筆 endpoint）。
2. **預約寫入成功後再推播**  
   在 booking 儲存成功的路徑呼叫類似 `sendAll`／對該店家所有訂閱發送。  
   **推播失敗不可阻擋預約**：用 try／catch、背景佇列或 fire-and-forget，預約回應先回成功。
3. **固定 VAPID**  
   正式環境一定要用環境變數固定公／私鑰。
4. **雙管齊下**  
   推播當主要即時通知；Email（或簡訊）當備援，因部分手機（尤其小米／紅米）對背景推播較嚴。
5. **可參考本 repo 的檔案**  
   - 前端訂閱流程：`public/index.html`  
   - SW：`public/sw.js`  
   - 發送與清理：`lib.js`  
   - 手機設定說明：`docs/手機通知設定指南.md`

---

## 安全注意

- 勿提交：`SEND_TOKEN`、`VAPID_PRIVATE_KEY`、`token.txt`、`vapid.json`、`.render-send-token`、`subscriptions.json`（已在 `.gitignore`）。
- `/send` 必須有 token；勿對外公開無保護的發送端點。
- 示範用 `mailto:demo@example.com` 當 VAPID contact，正式可改成你的聯絡信箱。

---

## 授權與用途

私人學習／產品驗證用示範。測完可刪除 Render 服務；程式碼保留在本 repo 供日後接 PWA 通知重用。
