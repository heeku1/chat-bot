# Jimmy Chat Bot 🤖

แพลตฟอร์มสร้างและจัดการบอท Telegram พร้อมสมอง AI (Gemini / OpenAI) — สร้างเมนู ปุ่มตอบกลับ และกำหนดค่าบอทได้จากหน้า Admin Dashboard

## เทคโนโลยี

- **Frontend:** React 19 + Vite + Tailwind CSS 4 + AdminLTE 4 shell
- **Backend:** Express (Node.js) — serve SPA + Telegram webhook/long-polling
- **AI Layer:** JimmyBrain (เข้าใจ → วิเคราะห์ → เสนอ → ยืนยัน), reviewer modes, approval system
- **Multi-bot:** `server/botRegistry.ts` รองรับหลายบอท token hashing (ไม่เก็บ token ใน state)

## รันในเครื่อง (Local)

```bash
npm install
cp .env.example .env.local   # แล้วกรอก BOT_TOKEN, GEMINI_API_KEY ฯลฯ
npm run dev                  # http://localhost:3000
```

## คำสั่งหลัก

| คำสั่ง | ความหมาย |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build production → `dist/` |
| `npm start` | รัน production server (`node dist/server.cjs`) |
| `npm test` | รัน unit tests |

> ⚠️ Production server ต้องรันจาก root ของโปรเจกต์ (อ้างอิง `process.cwd()/dist`)

## Deploy ขึ้น Render.com (ฟรี)

1. Push โค้ดขึ้น GitHub (repo นี้)
2. ไปที่ [Render Blueprint](https://dashboard.render.com/blueprints) → **New +** → **Blueprint** → เลือก repo `heeku1/chat-bot` → **Apply**
   - Render จะอ่าน `render.yaml` และตั้งค่าให้อัตโนมัติ
3. หลัง deploy เสร็จ ไปที่ **Environment** แล้วกรอก:
   - `BOT_TOKEN` — จาก [@BotFather](https://t.me/BotFather)
   - `TELEGRAM_ADMIN_USER_IDS` — user ID ผู้ดูแล (คั่นด้วย comma)
   - `GEMINI_API_KEY` หรือ `OPENAI_API_KEY`
   - `WEBHOOK_BASE_URL` — ใส่ URL ของ service เช่น `https://jimmy-chat-bot.onrender.com`
   - `RENDER_DEPLOY_HOOK_URL` — ไม่บังคับ ถ้าต้องการให้คำสั่ง deploy ที่ผ่านการยืนยันสั่ง Render ได้
   - `ADMIN_PANEL_URL` — ไม่บังคับ URL หน้าเว็บสำหรับปุ่ม "เปิดหลังบ้าน" ใน Telegram
4. Save → Render จะ redeploy ให้เอง แล้วบอทจะรับ webhook อัตโนมัติ

**ตรวจสอบสถานะ:** เปิด `/health` — ต้องได้ `"ok":true`

### ข้อจำกัด Free plan
- Disk เป็นแบบ ephemeral — config/state รีเซ็ตเมื่อ redeploy (ใช้ paid plan + persistent disk หากต้องการเก็บถาวร)
- Service จะ sleep เมื่อไม่มี traffic 15 นาที (webhook จะปลุกให้ทำงานใหม่เอง)

## Env Variables ทั้งหมด

ดูได้ที่ [.env.example](.env.example)

### Data Sources สมาชิก/กิจกรรม

ตั้งค่าได้จากหน้า Admin → การตั้งค่าขั้นสูง โดยใช้ API แบบอ่านอย่างเดียวที่ตอบ JSON ผ่าน HTTPS:

- `Members API URL` สำหรับคำสั่งเช็กสมาชิก
- `Activity API URL` สำหรับคำสั่งเช็กกิจกรรม
- `Data Source API Token` เป็น Bearer token หาก API ต้องยืนยันตัวตน

Token จะถูกล้างออกจาก config ที่เผยแพร่/แสดงใน registry snapshot และระบบจะไม่เรียก API หาก URL ไม่ใช่ HTTPS

## โครงสร้างโปรเจกต์

```
server.ts              # Express server หลัก (SPA + API + webhook)
server/
  ai/                  # JimmyBrain, provider, reviewer, safety, approvals, suggestions
  telegram/            # client, handlers, long-polling runtime
  botRegistry.ts       # multi-bot registry (atomic publish, token hashing)
src/                   # React admin dashboard
tests/                 # unit tests (node:test)
docs/vision-jimmy-brain.md  # สเปคความสามารถของสมอง AI
```
