# Hướng Dẫn Thiết Kế — Kho Thóc Gia Đình

**Phiên bản:** 1.0  
**Ngày cập nhật:** 10/06/2026  
**Phạm vi:** Toàn bộ giao diện trong repository `keep-house-clean`

---

## Mục lục

1. [Tổng quan phong cách](#1-tổng-quan-phong-cách)
2. [Bảng màu & Design Tokens](#2-bảng-màu--design-tokens)
3. [Typography](#3-typography)
4. [Layout & Spacing](#4-layout--spacing)
5. [Hiệu ứng & Kết cấu](#5-hiệu-ứng--kết-cấu)
6. [Component Library](#6-component-library)
7. [Màu ngữ nghĩa (Semantic Colors)](#7-màu-ngữ-nghĩa-semantic-colors)
8. [Animation & Motion](#8-animation--motion)
9. [Responsive & Breakpoints](#9-responsive--breakpoints)
10. [Icon & Emoji](#10-icon--emoji)
11. [Quy tắc thiết kế](#11-quy-tắc-thiết-kế)
12. [Biến thể theo trang](#12-biến-thể-theo-trang)
13. [Ghi chú kỹ thuật](#13-ghi-chú-kỹ-thuật)

---

## 1. Tổng quan phong cách

### 1.1 Định vị thương hiệu

**Kho Thóc Gia Đình** là hệ thống gamification gia đình — biến việc nhà thành trò chơi vui, có phần thưởng và cấp bậc. Giao diện cần truyền tải:

| Yếu tố | Mô tả |
|---|---|
| **Ấm áp, gần gũi** | Tông kem, xanh lá đồng ruộng, vàng hạt gạo — gợi cảm giác nhà cửa, mùa gặt |
| **Vui tươi nhưng không trẻ con** | Font tròn, emoji phong phú, animation nhẹ — phù hợp teen 10–15 tuổi |
| **Giáo dục tài chính** | Màu vàng/đất cho Gạo, xanh cho EXP — phân biệt rõ hai loại tiền tệ |
| **Tin cậy cho phụ huynh** | Layout rõ ràng, typography dễ đọc, không quá "game hóa" |

### 1.2 Từ khóa phong cách

> **Warm Agrarian Gamification** — Gamification nông trại ấm áp

- Organic (hữu cơ, tự nhiên)
- Playful but structured (vui nhưng có cấu trúc)
- Family-first (ưu tiên gia đình)
- Educational warmth (ấm áp giáo dục)

### 1.3 Nguyên tắc thiết kế cốt lõi

1. **Màu xanh = hành động & tiến bộ** — nút chính, EXP, cấp bậc
2. **Màu vàng/đất = giá trị & phần thưởng** — Gạo, chi phí quà, CTA nổi bật
3. **Nền kem = không gian thoáng** — tránh trắng tinh, tạo cảm giác ấm
4. **Bo góc lớn** — thân thiện, không góc cạnh
5. **Emoji làm icon chính** — không dùng icon set phức tạp, ưu tiên emoji Unicode
6. **Gradient xanh đậm cho hero/CTA** — tạo chiều sâu, gợi cánh đồng

---

## 2. Bảng màu & Design Tokens

### 2.1 CSS Variables (chuẩn toàn dự án)

Định nghĩa trong `:root` của mỗi trang HTML:

```css
:root {
  /* Màu thương hiệu chính */
  --green-deep:   #1a5c38;   /* Xanh lá đậm — tiêu đề, nav CTA, footer accent */
  --green-mid:    #2d8a55;   /* Xanh lá trung — hover, link active, progress */
  --green-light:  #4abe7a;   /* Xanh lá nhạt — border hover, accent phụ */

  /* Màu phần thưởng / Gạo */
  --amber:        #f5a623;   /* Vàng hạt gạo — CTA chính, số liệu nổi bật */
  --amber-light:  #fde68a;   /* Vàng nhạt — nền badge Gạo, highlight */
  --earth:        #7c4b1e;   /* Nâu đất — chữ trên nền vàng */
  --earth-light:  #c47d3a;   /* Nâu cam nhạt — phụ cho reward tag */

  /* Nền & chữ */
  --cream:        #fdf8ee;   /* Kem ấm — nền body chính */
  --text-main:    #1e1e1e;   /* Chữ chính — gần đen */
  --text-muted:   #6b7280;   /* Chữ phụ — xám trung tính */
  --white:        #ffffff;

  /* Cảnh báo / phạt */
  --red-penalty:  #c0392b;   /* Đỏ — vi phạm, xóa, penalty (index, print) */
  --red:          #c0392b;   /* Alias trên nhat-ky.html */

  /* Hình học & đổ bóng */
  --radius-card:  1.5rem;    /* Bo góc card lớn */
  --shadow-soft:  0 4px 24px rgba(0,0,0,0.07);
  --shadow-card:  0 8px 32px rgba(0,0,0,0.10);  /* hoặc 0.12 trên kho-qua */
}
```

### 2.2 Màu phụ (hardcoded, dùng lặp lại)

| Màu | Hex | Vai trò |
|---|---|---|
| Xanh hero đậm | `#1b4332` | Gradient hero/CTA (điểm cuối) |
| Xanh hero giữa | `#2d6a4f` | Gradient hero (điểm giữa) |
| Xanh hero sáng | `#3d9e6a` | Gradient page-hero quy-doi |
| Footer nền | `#0d2b1a` | Footer tối |
| Nền xanh nhạt | `#f0faf4` / `#edf7f1` / `#f4fbf7` | Card EXP, stat box, nền app |
| Nền vàng nhạt | `#fffbeb` / `#fef3c7` | Card Gạo, epic task, reward selected |
| Border xám | `#e5e7eb` / `#e2e8f0` | Viền card, input, divider |
| Border xanh nhạt | `#d1fae5` / `#c6f0d8` | Input calculator, currency card |
| Border đỏ nhạt | `#fecaca` / `#fee2e2` | Penalty box |

### 2.3 Gradient chuẩn

| Tên | Giá trị | Dùng cho |
|---|---|---|
| Hero chính | `linear-gradient(150deg, #1a5c38 0%, #2d6a4f 50%, #1b4332 100%)` | `code/index.html` hero |
| Hero trang phụ (xanh) | `linear-gradient(135deg, #1a5c38 0%, #2d8a55 50%, #3d9e6a 100%)` | `code/quy-doi.html` page-hero |
| Hero Kho Quà (cam) | `linear-gradient(135deg, #92400e 0%, #b45309 40%, #f5a623 100%)` | `code/kho-qua.html` page-hero |
| CTA / Callout | `linear-gradient(135deg, #1a5c38 0%, #1b4332 100%)` | CTA section, calc result, power callout |
| Parent section | `linear-gradient(135deg, #0d2b1a 0%, #1a5c38 100%)` | Góc phụ huynh quy-doi |
| Logo icon | `linear-gradient(135deg, #2d8a55, #f5a623)` | Icon logo nav |
| Progress bar | `linear-gradient(90deg, #4abe7a, #f5a623)` | Thanh tiến độ |
| Benefit hover | `linear-gradient(135deg, #4abe7a 0%, #f5a623 100%)` | Overlay card (opacity 5%) |

### 2.4 Bảng màu Thẻ Đặc Quyền (Power Cards)

Mỗi thẻ có bộ 3 lớp: **nền / viền / chữ**

| Class | Nền | Viền | Tên chữ | Cost nền |
|---|---|---|---|---|
| `.pc-yellow` | `#fffbeb` | `#f59e0b` | `#92400e` | `#fde68a` |
| `.pc-green` | `#f0fdf4` | `#22c55e` | `#14532d` | `#bbf7d0` |
| `.pc-blue` | `#eff6ff` | `#3b82f6` | `#1e3a8a` | `#bfdbfe` |
| `.pc-red` | `#fff1f2` | `#f43f5e` | `#881337` | `#fecdd3` |
| `.pc-purple` | `#faf5ff` | `#a855f7` | `#581c87` | `#e9d5ff` |
| `.pc-orange` | `#fff7ed` | `#f97316` | `#7c2d12` | `#fed7aa` |

### 2.5 Bảng màu Tag phân loại quà

| Class | Nền | Chữ | Ý nghĩa |
|---|---|---|---|
| `.reward-tag` (default) | `#e0f2fe` | `#0369a1` | Mặc định |
| `.reward-tag.family` | `#f0fdf4` | `#166534` | Gia đình |
| `.reward-tag.freedom` | `#fef3c7` | `#92400e` | Tự do |
| `.reward-tag.food` | `#fdf4ff` | `#7e22ce` | Ăn uống |
| `.reward-tag.social` | `#fff1f2` | `#be123c` | Xã hội |
| `.reward-tag.learning` | `#eff6ff` | `#1d4ed8` | Học tập |

---

## 3. Typography

### 3.1 Font families

| Vai trò | Font | Weights | Nguồn |
|---|---|---|---|
| **Display / Heading** | [Baloo 2](https://fonts.google.com/specimen/Baloo+2) | 400, 600, 700, 800, 900 | Google Fonts |
| **Body / UI** | [Mulish](https://fonts.google.com/specimen/Mulish) | 400, 500, 600, 700 | Google Fonts |
| **Icon** | Font Awesome 6.4.0 | — | CDN (chủ yếu penalty, nav phụ) |

```css
body { font-family: 'Mulish', sans-serif; }
h1, h2, h3, h4, h5 { font-family: 'Baloo 2', sans-serif; }
```

### 3.2 Type scale

| Element | Font | Size | Weight | Màu |
|---|---|---|---|---|
| Hero title | Baloo 2 | `clamp(2.5rem, 7vw, 5rem)` | 900 | `#fff` |
| Page hero h1 | Baloo 2 | `clamp(2rem, 6vw, 3.8rem)` | 900 | `#fff` |
| Section title | Baloo 2 | `clamp(1.8rem, 4vw, 2.8rem)` | 900 | `--green-deep` |
| Section label | Baloo 2 | `.78rem` | 800 | `--green-mid` |
| Body | Mulish | `1rem` / `.93rem` | 400–500 | `--text-main` |
| Body muted | Mulish | `.85rem`–`1.05rem` | 500 | `--text-muted` |
| Nav link | Mulish | `.9rem` | 700 | `--text-muted` |
| Nav logo | Baloo 2 | `1.3rem` | 900 | `--green-deep` |
| Button | Baloo 2 | `.88rem`–`1rem` | 800 | tùy variant |
| Stat number | Baloo 2 | `2rem`–`2.5rem` | 900 | `--amber` |
| Task name | Mulish/Baloo | `.88rem`–`1rem` | 700–800 | `--green-deep` |

### 3.3 Quy tắc chữ

- **Section label:** `letter-spacing: .15em`, `text-transform: uppercase`, luôn đi kèm emoji đầu dòng
- **Line-height body:** `1.6`–`1.75` cho đoạn văn dài
- **Line-height heading:** `1.1`–`1.2`
- **Không dùng font khác** ngoài Baloo 2 + Mulish
- **Số liệu quan trọng** (Gạo, VNĐ, EXP): dùng Baloo 2 weight 800–900

---

## 4. Layout & Spacing

### 4.1 Container

```css
.container {
  max-width: 1100px;  /* 1150px trên print.html, 1200px trên nhat-ky.html */
  margin: 0 auto;
}
```

### 4.2 Section padding

| Breakpoint | Padding |
|---|---|
| Desktop | `5rem 2rem` (section), `6rem 2rem` (CTA) |
| Mobile `≤768px` | `3.5rem 1.2rem` |

### 4.3 Grid patterns

| Pattern | CSS | Dùng cho |
|---|---|---|
| Auto-fit cards | `repeat(auto-fit, minmax(280px, 1fr))` | Benefits, steps |
| Auto-fill rewards | `repeat(auto-fill, minmax(300px, 1fr))` | Reward cards |
| Auto-fill tasks | `repeat(auto-fill, minmax(240px–300px, 1fr))` | Task preview |
| 2 cột | `1fr 1fr` → `1fr` @ 640px | Currency cards, why grid |
| Flex ranks | `display:flex` horizontal scroll | Rank track |

### 4.4 Border radius scale

| Token | Giá trị | Dùng cho |
|---|---|---|
| Pill / button | `2rem`–`3rem` | CTA, nav-cta, badge |
| Card lớn | `1.5rem` (`--radius-card`) | Card, modal, section box |
| Card nhỏ | `1rem`–`1.2rem` | Task row, input, plan card |
| Icon box | `.7rem`–`1rem` | Logo icon, benefit icon |
| Tag / pill nhỏ | `.4rem`–`1rem` | Reward cost, rank badge |
| Toggle | `20px` (full round) | Switch nhat-ky |

### 4.5 Shadow scale

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-soft` | `0 4px 24px rgba(0,0,0,0.07)` | Card mặc định, task row |
| `--shadow-card` | `0 8px 32px rgba(0,0,0,0.10–0.12)` | Hover state, modal |
| Nav scrolled | `0 2px 20px rgba(0,0,0,0.08)` | Nav khi scroll |
| Button amber | `0 4px 20px rgba(245,166,35,0.5)` | btn-primary |
| Green callout | `0 8px 32px rgba(26,92,56,0.3)` | Rate callout, power callout |

---

## 5. Hiệu ứng & Kết cấu

### 5.1 Noise texture overlay (toàn site marketing)

Lớp phủ SVG fractal noise cố định trên toàn viewport:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,...feTurbulence...");
  opacity: 0.4;
}
```

**Mục đích:** Thêm chiều sâu vật liệu, tránh nền phẳng "digital".  
**Lưu ý:** `code/nhat-ky.html` **không** dùng noise overlay (trang app vận hành).

### 5.2 Glassmorphism (Nav)

```css
.nav {
  background: rgba(253, 248, 238, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 2px solid rgba(245, 166, 35, 0.2);
}
```

### 5.3 Wave divider

SVG wave chuyển tiếp giữa hero và nội dung. Màu fill wave theo hero:
- Xanh: hero trang chủ / quy đổi
- Cam `#b45309`: hero Kho Quà

### 5.4 Watermark emoji

Emoji khổng lồ mờ (`font-size: 18rem–20rem`, `opacity: .04–.06`) làm watermark nền:
- 🌾 — CTA, quy đổi
- 🎁 — Kho Quà

### 5.5 Scroll reveal

```css
.reveal { opacity: 0; transform: translateY(28px); transition: opacity .6s ease, transform .6s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
```

Kích hoạt bằng Intersection Observer khi scroll.

---

## 6. Component Library

### 6.1 Navigation

**Marketing pages** (`index`, `kho-qua`, `quy-doi`, `print`):

| Thuộc tính | Giá trị |
|---|---|
| Position | `fixed`, `z-index: 100` |
| Logo | 🌾 + "Kho Thóc Gia Đình", Baloo 2 900 |
| Links | Trang Chủ, Kho Quà, Quy Đổi, Nhật ký, 🖨️ In |
| CTA | `.nav-cta` — "🌾 Tính Gạo", nền `--green-deep` |
| Active state | `color: --green-deep` |
| Hover | `color: --green-mid` |
| Mobile `≤768px` | Ẩn `.nav-links` |

**App page** (`code/nhat-ky.html`):

| Khác biệt | Giá trị |
|---|---|
| Class | `.navbar` (không glass) |
| Nền | `white`, `box-shadow` nhẹ |
| Position | `sticky` (không fixed) |
| Không có nav-cta | — |

### 6.2 Buttons

| Class | Nền | Chữ | Bo góc | Hover |
|---|---|---|---|---|
| `.btn-primary` | `--amber` | `--earth` | `3rem` | `translateY(-3px)` + shadow amber |
| `.btn-outline` | `rgba(255,255,255,.1)` | `#fff` | `3rem` | nền sáng hơn + lift |
| `.btn-white` | `#fff` | `--green-deep` | `3rem` | lift + shadow |
| `.btn-green` | `--green-deep` | `#fff` | `3rem` | lift + shadow xanh |
| `.btn-amber` | `--amber` | `--earth` | `3rem` | lift + shadow amber |
| `.nav-cta` | `--green-deep` | `#fff` | `2rem` | `--green-mid` + `translateY(-1px)` |
| `.btn-main` (app) | `--green-mid` | `white` | `.6rem` | `--green-deep` |
| `.btn-secondary` (app) | `#edf7f1` | `--green-deep` | `.6rem` | dashed border |

**Quy tắc button:**
- Luôn `font-family: 'Baloo 2'`, `font-weight: 800`
- Icon/emoji đặt bên trái (`gap: .5rem`, `inline-flex`)
- Transition: `transform .2s`, `box-shadow .2s`, `background .2s`

### 6.3 Cards

#### Benefit / Step card
- Nền: `--cream` hoặc `#fff`
- Border: `2px solid transparent` → hover `--green-light`
- Padding: `2rem`
- Hover: `translateY(-4px đến -6px)` + `--shadow-card`

#### Reward card
- Nền trắng, border `#e5e7eb`
- Hover: border `--amber`, lift
- Cấu trúc: emoji → tên → cost badge → mô tả → "Tại sao" box

#### Task row
- Nền trắng/kem, `border-radius: 1rem`
- Layout: icon emoji | info | reward pills
- Hover: `border-color: --green-light`, `translateX(4px)` hoặc `translateY(-2px)`

#### Profile card (nhat-ky)
- Border `2px solid #e2e8f0`
- Active: `border-color: --green-mid`, nền `#f0faf4`, dấu ✓ góc phải

### 6.4 Form controls (nhat-ky)

```css
.form-control {
  width: 100%;
  padding: .6rem;
  border: 1px solid #e2e8f0;
  border-radius: .6rem;
  font-family: inherit;
  font-size: .95rem;
}
```

### 6.5 Modal

- Overlay: `rgba(0,0,0,.4)`, fade transition
- Box: trắng, `border-radius: var(--radius)`, `max-width: 400px`
- Title: Baloo 2 1.5rem, `--green-deep`

### 6.6 Toast

- Position: fixed bottom center
- Nền: `#1a5c38`, chữ trắng
- `border-radius: 2rem`, slide up animation

### 6.7 Footer

```css
footer {
  background: #0d2b1a;
  color: rgba(255,255,255,.55);
  border-top: 3px solid var(--green-mid);
  padding: 3rem 2rem;
}
```

- Link hover: `--amber`
- Brand: Baloo 2 900, màu trắng

### 6.8 Filter tabs

```css
.tab-btn {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 2rem;
  font-family: 'Baloo 2';
  font-weight: 700;
}
.tab-btn.active, .tab-btn:hover {
  background: var(--green-deep);
  border-color: var(--green-deep);
  color: #fff;
}
```

### 6.9 Toggle switch (nhat-ky)

- Off: `#cbd5e1`
- On: `--green-mid`
- Knob: trắng, `18px`, transition `0.3s`

---

## 7. Màu ngữ nghĩa (Semantic Colors)

Gắn màu với khái niệm nghiệp vụ — **bắt buộc nhất quán** trên mọi trang:

### 7.1 Hạt Gạo 🌾

| Thuộc tính | Giá trị |
|---|---|
| Màu chữ | `#b45309` / `--earth` |
| Nền badge | `--amber-light` (`#fde68a`) |
| Class | `.val-grain`, `.p-stat-box.grain` |
| Ý nghĩa | Tiền tệ — đổi quà, quy ra VNĐ |

### 7.2 EXP ⭐

| Thuộc tính | Giá trị |
|---|---|
| Màu chữ | `#059669` / `#065f46` / `--green-deep` |
| Nền badge | `#d1fae5` / `#edf7f1` |
| Class | `.val-exp`, `.p-stat-box.money` |
| Ý nghĩa | Điểm kinh nghiệm — thăng hạng, không trừ khi đổi quà |

### 7.3 Nhiệm vụ Epic ♛

| Thuộc tính | Giá trị |
|---|---|
| Nền | `linear-gradient(135deg, #fefce8, #fff)` hoặc `#fffbeb` |
| Border | `#fde047` / `#fde68a` / `#47ea08` (có biến thể) |
| Chữ tên | `#854d0e`, weight 900 |
| Icon | ♛ góc phải, `#eab308` |
| Class | `.task-row.epic`, `.task-compact-card.epic-task` |

### 7.4 Highlight task

- Nền: `#fffbeb`
- Border: `--amber`
- Class: `.task-row.highlight`

### 7.5 Penalty / Vi phạm

- Màu chính: `--red-penalty` (`#c0392b`)
- Nền section: `linear-gradient(135deg, #fff5f5, #fff)`
- Border: `#fecaca`
- Icon wrap: `#fee2e2`

### 7.6 Trạng thái mục tiêu (quy-doi)

| Class | Nền | Chữ | Ý nghĩa |
|---|---|---|---|
| `.goal-status.locked` | `#fee2e2` | `#991b1b` | Chưa đủ Gạo |
| `.goal-status.unlocked` | `#d1fae5` | `#065f46` | Đủ Gạo đổi |

---

## 8. Animation & Motion

### 8.1 Nguyên tắc chuyển động

- **Nhẹ nhàng, không gây chóng mặt** — phù hợp trẻ em nhưng không "trẻ con"
- Duration chuẩn: `.2s` (hover), `.25s` (card), `.3s`–`.6s` (reveal)
- Easing: `ease`, `ease-out`, `cubic-bezier(.4,0,.2,1)` cho toast/progress

### 8.2 Animations có sẵn

| Tên | Mô tả | Dùng cho |
|---|---|---|
| `slideDown` | Fade + translateY từ trên | Hero elements stagger |
| `grow` | Chiều cao 0 → var(--h) | Cây lúa hero |
| `fadeIn` | Emoji 🌾 xuất hiện | Stalk animation |
| `shimmer` | Gradient trượt ngang | Power card bottom edge |

### 8.3 Hover micro-interactions

| Element | Effect |
|---|---|
| Button | `translateY(-3px)` + shadow tăng |
| Card | `translateY(-4px đến -6px)` + shadow |
| Task row | `translateX(4px)` hoặc `translateY(-2px)` |
| Power card | `rotate(1deg) translateY(-6px)` |
| Nav CTA | `translateY(-1px)` |

---

## 9. Responsive & Breakpoints

| Breakpoint | Thay đổi chính |
|---|---|
| `≤992px` | Infographic flow → column (`code/print.html`) |
| `≤768px` | Ẩn nav links, giảm section padding, penalty/rate column |
| `≤640px` | Currency cards 1 cột, rate CTA full width |
| `≤600px` | Penalty rules 1 cột |
| `≤480px` | Tasks preview 1 cột, task name wrap |

**Chiến lược:** Mobile-first với `clamp()` cho typography, `auto-fit`/`auto-fill` cho grid, `flex-wrap` cho hàng ngang.

---

## 10. Icon & Emoji

### 10.1 Emoji chính (brand icons)

| Emoji | Ý nghĩa |
|---|---|
| 🌾 | Logo, Gạo, thương hiệu |
| ⭐ | EXP, điểm sành sỏi |
| 🎁 | Kho quà, phần thưởng |
| ♛ | Nhiệm vụ Epic |
| 🖨️ | Trang in |

### 10.2 Quy tắc emoji

- Dùng emoji Unicode trực tiếp trong HTML — **không** dùng image sprite
- Mỗi nhiệm vụ/quà có emoji riêng làm icon (`font-size: 1.4rem`–`2.8rem`)
- Section label luôn có emoji prefix: `💡 Triết lý phần thưởng`
- Font Awesome chỉ bổ trợ (icon penalty, một số UI phụ)

### 10.3 Logo

```html
<span class="logo-icon">🌾</span>
Kho Thóc Gia Đình
```

- Icon box: gradient xanh→vàng, `2.4rem`, bo `.7rem`
- Text: Baloo 2 900, `--green-deep`

---

## 11. Quy tắc thiết kế

### 11.1 Nên làm (Do)

1. **Dùng CSS variables** từ `:root` — không hardcode màu thương hiệu khi có thể
2. **Phân tách rõ Gạo (vàng) và EXP (xanh)** trên mọi UI hiển thị phần thưởng
3. **Bo góc lớn** cho mọi container tương tác
4. **Thêm hover state** cho card và button — lift + shadow/border
5. **Dùng Baloo 2 cho số liệu** và heading; Mulish cho body
6. **Giữ nền kem** cho trang marketing; xanh nhạt `#f4fbf7` cho app
7. **Section xen kẽ** nền `#fff` ↔ `--cream` tạo nhịp đọc
8. **Emoji có ý nghĩa** — mỗi task/reward có icon riêng
9. **Accessibility cơ bản:** contrast chữ `--text-main` trên nền sáng đạt WCAG AA
10. **In ấn (`code/print.html`):** thẻ cắt dùng `border: 3px dashed #9ca3af`, ticket notch pattern

### 11.2 Không nên làm (Don't)

1. **Không dùng màu neon** hoặc gradient rainbow — phá vỡ tone nông trại ấm
2. **Không dùng font serif hoặc monospace** cho UI
3. **Không dùng shadow đen đậm** — giữ opacity thấp (`.07`–`.12`)
4. **Không bỏ hover state** trên element clickable
5. **Không trộn Gạo/EXP cùng màu** — gây nhầm lẫn nghiệp vụ
6. **Không dùng border vuông** (`border-radius: 0`) trừ rank track nối liền
7. **Không animation quá 1s** cho interaction thường ngày
8. **Không dùng popup/modal cho marketing** — chỉ app (nhat-ky) dùng modal
9. **Không thay emoji logo** 🌾 bằng icon khác

### 11.3 Hierarchy nội dung

```
Section Label (nhỏ, uppercase, xanh mid, emoji)
    ↓
Section Title (lớn, Baloo 900, xanh deep)
    ↓
Section Sub (muted, max-width 560px)
    ↓
Content (cards, grids, tables)
```

---

## 12. Biến thể theo trang

| Trang | Loại | Nền body | Nav | Hero | Đặc thù |
|---|---|---|---|---|---|
| `code/index.html` | Marketing | `--cream` | Glass fixed | Xanh đậm full viewport + cây lúa animated | Scroll reveal, hero stats |
| `code/kho-qua.html` | Marketing | `--cream` | Glass fixed | Gradient cam (quà) | Power cards 6 màu, filter tabs |
| `code/quy-doi.html` | Marketing + tool | `--cream` | Glass fixed | Gradient xanh | Calculator, chart, goal list |
| `code/print.html` | In ấn | `--cream` | Glass fixed | Infographic flow | Cut-card dashed, bảng quy đổi |
| `code/nhat-ky.html` | App vận hành | `#f4fbf7` | White sticky | Không hero | Profile cards, task checklist, modal, toast |

### 12.1 Page Hero variants

| Trang | Gradient | Watermark | Badge text |
|---|---|---|---|
| index | Xanh 3 điểm + field animation | Cây lúa 🌾 | Tuỳ nội dung |
| kho-qua | Cam `#92400e → #f5a623` | 🎁 | 🎁 Kho Phần Thưởng |
| quy-doi | Xanh `#1a5c38 → #3d9e6a` | 🌾 | 🌾 Trung Tâm Quy Đổi |

---

## 13. Ghi chú kỹ thuật

### 13.1 Kiến trúc CSS hiện tại

- **Không có file CSS riêng** — mỗi trang HTML embed `<style>` inline
- **Design tokens lặp lại** trong `:root` mỗi file → cần đồng bộ thủ công khi thay đổi
- **Không dùng framework** (Bootstrap, Tailwind...) — vanilla CSS thuần

### 13.2 Khác biệt cần lưu ý (technical debt)

| Vấn đề | Chi tiết |
|---|---|
| Nav không thống nhất | `nhat-ky` dùng `.navbar` trắng sticky; các trang khác dùng `.nav` glass fixed |
| Token naming | `--red-penalty` vs `--red`; `--radius-card` vs `--radius`; `--shadow-card` vs `--shadow` |
| Container width | 1100 / 1150 / 1200px tùy trang |
| Epic task border | `#47ea08`, `#fde047`, `#fde68a` — 3 biến thể khác nhau |
| Body background app | `#f4fbf7` (nhat-ky) vs `--cream` (marketing) — có chủ ý phân biệt app vs marketing |

### 13.3 Khi thêm trang/component mới

1. Copy block `:root` từ `code/index.html` làm baseline
2. Chọn nav pattern: marketing (glass) hoặc app (white sticky)
3. Dùng section label → title → sub hierarchy
4. Gán semantic color đúng cho Gạo/EXP
5. Thêm class `.reveal` + Intersection Observer nếu là trang marketing
6. Test responsive tại 768px và 480px

### 13.4 Tài liệu liên quan

- [TAI-LIEU-NGHIEP-VU.md](./TAI-LIEU-NGHIEP-VU.md) — Quy tắc nghiệp vụ, luồng Gạo/EXP
- [README.md](./README.md) — Tổng quan dự án

---

*Tài liệu này được tổng hợp từ mã nguồn thực tế trong `code/index.html`, `code/kho-qua.html`, `code/quy-doi.html`, `code/nhat-ky.html`, `code/print.html`.*
