# 巴士到站時間系統參考資料 (Bus ETA System Reference)

此文件記錄了目前系統中成功運作的到站時間資料結構與邏輯，供日後開發與維護參考。

## 1. 支援的營辦商與 API 來源 (Supported Operators & APIs)
- **KMB (九巴)**: 
    - **URL**: `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/{stop_id}`
    - **Format**: JSON
- **CTB (城巴)**: 
    - **URL**: `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/{stop_id}/{route}`
    - **Format**: JSON
- **MTRB (港鐵巴士)**: 
    - **URL**: `https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule` (POST)
    - **Format**: JSON
- **GMB (專線小巴)**: 
    - **URL**: `https://data.etagmb.gov.hk/eta/route-stop/{route_id}/{stop_id}`
    - **Format**: JSON

## 2. 核心邏輯優化 (Core Logic Optimizations)

### 步行時間計算 (Walking Time Calculation)
- **計算方式**: 使用 Haversine 公式計算直線距離。
- **步速設定**: **60 公尺/分鐘** (已從 80 公尺/分鐘下調，以補償直線距離與實際步行路線的落差)。
- **緩衝時間**: 計算結果額外 +1 分鐘。

### 顯示邏輯 (UI Logic)
- **回家區塊**: 
    - 自動將「最近」的地區置頂顯示。
    - 步程資訊統一顯示於地區標題旁，不再重複顯示於每條路線下方。
- **出九龍區塊**:
    - 每條路線顯示**接下來的兩班車**時間。
    - 第一班車大字顯示，第二班車小字顯示並以細線分隔。

## 3. 已知路線與車站配置 (Route & Stop Configuration)

### 出九龍 (To Kowloon) - 香港黃金海岸站
- **52X**: 往旺角(柏景灣)
- **61M**: 往荔景(北)
- **952**: 往銅鑼灣(摩頓台)
- **140M (GMB)**: 往青衣站

### 回家 (To Home) - 往置樂方向
- **新墟**: 52X, 67A, 67M, 67X
- **屯門站**: K51, K51A
- **市中心**: 52X, 61M, 261X, 952
- **華都**: 52X, 67A, 67M, 67X

### 深圳灣口岸 (Shenzhen Bay Port)
- **B3X**: 往屯門市中心 (Stop ID: 003208)
- **B3**: 往屯門碼頭 (Stop ID: 003208)

## 4. API 處理注意事項
- **超時處理**: 已移除所有底層的 `AbortController` 5秒強制中斷機制，確保在 API 回應較慢時仍能成功載入資料。
- **港鐵巴士修正**: 針對 K51 路線在特定車站（如 U070,6）的到站時間進行了 -2 分鐘的校準，以符合實際到站情況。
