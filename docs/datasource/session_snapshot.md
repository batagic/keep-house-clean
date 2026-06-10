{
  "project": "Kho Thóc Gia Đình — Family Gamification Web App",
  "current_stage": "Đang xây dựng tính năng đổi quà (Redemptions) — chưa implement vào code",
  "last_done": "Tối ưu load nhat-ky: cache localStorage tách profiles/logs, API logs phân trang, keep-warm trigger 5 phút, preconnect, bỏ Font Awesome",
  "next_steps": [
    "Thêm sheet Redemptions vào Google Sheets: id | name | date | grain_spent | reward_id | reward_name | note",
    "Cập nhật Code.gs: doGet đọc thêm sheet Redemptions, doPost thêm case 'redeem' → writeRedemption()",
    "Cập nhật nhat-ky.html: getState() trừ grain từ Redemptions, redeemReward() gửi POST type=redeem, reload sau khi đổi",
    "Tái cấu trúc project theo folder app/css + app/js (đang dang dở từ yêu cầu trước)",
    "Đồng bộ nav menu vào print.html (trang này có nav đặc biệt riêng)"
  ],
  "technical_notes": {
    "api_url": "https://script.google.com/macros/s/AKfycbyX9WqQD39vSQNSbuZDhPGYol5dGd-e2JaYBuYAa8VJOYJ0VuH1lDljibvJsi8ote3O0w/exec",
    "sheet_id": "1JhOR_Ry5Z9h__wH288zVS2KtYPUD-8PgCWS1KZoErmU",
    "exchange_rate": "1 Gạo = 100 VNĐ",
    "sheets": {
      "Profiles": "id | name | avatar | total_grain | total_exp — cache đồng bộ khi ghi/xóa log; cột balance cũ tự đổi tên total_grain",
      "Logs": "id | name | date | grain | exp | note | tasks | bonus — giao dịch dương",
      "Redemptions": "chưa tạo — giao dịch âm khi đổi quà"
    },
    "cors_fix": "POST phải dùng Content-Type: text/plain, không dùng application/json",
    "apps_script_note": "Mỗi lần sửa Code.gs phải tạo New Deployment, không edit deployment cũ",
    "balance_formula": "totalGrain = SUM(Logs.grain) | totalExp = SUM(Logs.exp) — cache trên Profiles, logs vẫn là sổ cái gốc",
    "deploy_cache_balance": [
      "1. Copy Code.gs từ docs/datasource/appscripv11.md vào Apps Script",
      "2. Cập nhật WEB_APP_URL trong Code.gs khớp config.js",
      "3. Deploy → New deployment (Web app)",
      "4. Chạy backfillProfileBalances() một lần",
      "5. Chạy setupKeepWarmTrigger() một lần (trigger ping ?type=ping mỗi 5 phút)"
    ],
    "pages": ["code/index.html", "code/kho-qua.html", "code/quy-doi.html", "code/nhat-ky.html", "code/print.html"],
    "nav_links": "Tất cả trang có: Trang Chủ | Kho Quà | Quy Đổi | Nhật Ký | 🖨️ In | 🌾 Tính Gạo — ngoại trừ print.html có nav riêng",
    "task_count": "15 nhiệm vụ, bao gồm t15 Giải cứu thủy cung (20🌾, 10 EXP)",
    "rewards": "9 thẻ bài (200–2000🌾) + 6 quà dài hạn (800–4000🌾)"
  }
}

------------------
Bạn chỉ cần thực hiện 3 bước đơn giản:

Bước 1: Lưu (End of Session): Cuối phiên, nói: "Tóm tắt lại session này theo chuẩn .session_snapshot để tôi lưu lại."

{

  "project": "Tên Project",

  "current_stage": "Đang làm gì?",

  "last_done": "Việc cuối cùng đã hoàn thành",

  "next_steps": ["Việc 1", "Việc 2"],

  "technical_notes": "Các thông số kỹ thuật/cấu hình cần nhớ"

}

Tóm tắt lại session này theo chuẩn .session_snapshot để tôi lưu lại.

Bước 2: Copy & Lưu trữ: Bạn lưu đoạn code đó vào một file text (tôi gợi ý nên lưu vào Google Keep hoặc một file Notion/Obsidian riêng của project đó).

Bước 3: Nạp lại (Start of Session): Khi mở phiên mới, câu lệnh đầu tiên của bạn sẽ là:

"Chào bạn, đây là ngữ cảnh từ phiên trước: [Dán đoạn JSON vào]. Hãy nạp ngữ cảnh này và bắt đầu tiếp từ phần [Next steps]."

------------------

Web App
v11 current (ok)
https://script.google.com/macros/s/AKfycbxELuKLUcEBeqlVMF5V8lDOe9tUQd46ki8NiJc7iUGE-uJoqmuF795sNEFP-r1jL7oxVw/exec


v12 update Redem
https://script.google.com/macros/s/AKfycby52xCtclBBlMYuDFA1oDv6tVOpkTwkWnZ9Xbz0LmQmFnztA1DlbI-9HwKZb7sPqPi2Ig/exec
