# Telegram Userbot Translator 🚀

Tool tự động theo dõi tin nhắn từ **bất kỳ Telegram Channel công khai nào** (dùng user account) và dịch sang tiếng Việt bằng OpenAI GPT.

## ⭐ Tính năng

✅ Dùng **User Account** - theo dõi được MỌI channel công khai  
✅ **KHÔNG cần** là admin hay owner của channel  
✅ Tự động dịch text sang tiếng Việt bằng GPT-4o mini/GPT-4  
✅ **Hỗ trợ ảnh** - Dịch caption và gửi kèm ảnh  
✅ Gửi bản dịch tới Telegram Group/Chat  
✅ Giữ nguyên cấu trúc, emoji, xuống dòng  
✅ Xử lý lỗi toàn diện, không crash  
✅ Lưu session - chỉ cần login 1 lần duy nhất

---

## 🗂️ Cấu trúc thư mục

```
telegram-userbot-translator/
├── index.js           # File chính - Logic userbot
├── package.json       # Dependencies
├── .env              # Biến môi trường (tự tạo)
├── .env.example      # Mẫu biến môi trường
├── .gitignore        # Git ignore
└── README.md         # File này
```

---

## 🚀 Hướng dẫn cài đặt

### 1️⃣ Yêu cầu hệ thống

- Node.js >= 16.x ([Tải Node.js](https://nodejs.org/))
- Telegram User Account (số điện thoại)
- OpenAI API Key

### 2️⃣ Cài đặt dependencies

```bash
npm install
```

Dependencies sẽ được cài:

- `telegram` (GramJS) - Telegram MTProto Client
- `input` - Nhập liệu từ terminal
- `openai` - OpenAI SDK chính thức
- `dotenv` - Quản lý biến môi trường

### 3️⃣ Tạo file .env

```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS/Linux:
cp .env.example .env
```

---

## 🔑 Cấu hình - Bước quan trọng nhất!

### **Bước 1: Lấy API ID và API Hash**

1. Truy cập: **https://my.telegram.org/auth**
2. Đăng nhập bằng số điện thoại Telegram
3. Vào **"API development tools"**
4. Click **"Create new application"**
   - App title: `Translator Bot` (tùy ý)
   - Short name: `translator` (tùy ý)
   - Platform: **Desktop** hoặc **Other**
5. Submit → Nhận được:

   - **api_id**: Dạng `12345678`
   - **api_hash**: Dạng `abcdef1234567890...`

6. Copy vào file `.env`:

```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
```

### **Bước 2: Số điện thoại**

Số điện thoại Telegram của bạn (có dấu `+`):

```env
TELEGRAM_PHONE_NUMBER=+84987654321
```

### **Bước 3: Channel nguồn**

Username của channel công khai muốn theo dõi (phải có `@`):

```env
SOURCE_CHANNEL_USERNAME=@durov
```

**Lưu ý:**

- Channel **PHẢI là public** (có username)
- Ví dụ: `@telegram`, `@durov`, `@your_channel`
- Bạn **KHÔNG cần** là admin hay member của channel!

### **Bước 4: Chat đích (nhận bản dịch)**

Nơi nhận bản dịch:

**Option 1: Gửi về chính mình**

```env
TARGET_CHAT_ID=me
```

**Option 2: Gửi về group (cần Group ID)**

Cách lấy Group ID:

1. Thêm bot **@userinfobot** vào group
2. Gửi bất kỳ tin nhắn nào
3. Bot reply với Chat ID dạng: `-1009876543210`
4. Copy vào .env:

```env
TARGET_CHAT_ID=-1009876543210
```

**Option 3: Gửi về user (cần username)**

```env
TARGET_CHAT_ID=@username
```

### **Bước 5: OpenAI API Key**

1. Truy cập: **https://platform.openai.com/api-keys**
2. Đăng nhập/Đăng ký
3. Click **"Create new secret key"**
4. Copy key (dạng: `sk-proj-xxxxx`)
5. Paste vào .env:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**💰 Lưu ý về chi phí:**

- Nạp tối thiểu **$5** để bắt đầu
- GPT-4o mini: ~**$0.15** / 1M tokens (cực rẻ)
- 1000 tin dịch ≈ **$0.01 - $0.05**

### **Bước 6: Session (tùy chọn)**

**Lần đầu:** Để trống

```env
TELEGRAM_SESSION=
```

**Từ lần thứ 2:** Bot sẽ in ra session string, copy vào để không cần login lại.

---

## ▶️ Chạy userbot

### **Lần đầu tiên:**

```bash
npm start
```

Bot sẽ yêu cầu:

1. **Mã xác thực** (Telegram gửi về app/SMS)
2. **Password 2FA** (nếu bạn bật 2FA)

Sau khi login thành công, bot sẽ in ra **SESSION STRING**:

```
📝 SESSION STRING (lưu vào .env để không cần login lại):
─────────────────────────────────────────────────
1BQANN...very_long_string...xyz==
─────────────────────────────────────────────────
```

**Copy string đó** vào file `.env`:

```env
TELEGRAM_SESSION=1BQANN...very_long_string...xyz==
```

### **Từ lần thứ 2:**

Chỉ cần chạy:

```bash
npm start
```

Không cần login lại! ✅

---

## 📱 Test hoạt động

1. Chạy userbot: `npm start`
2. Mở channel nguồn (ví dụ: @durov)
3. Gửi tin nhắn hoặc đợi có tin mới
4. Kiểm tra console log:

```
📨 Nhận tin nhắn mới:
   Message ID: 12345
   Has Text: true
🔄 Đang dịch văn bản...
✅ Dịch thành công!
📝 Bản dịch: ...
📤 Đang gửi tin nhắn đã dịch...
✅ Đã gửi thành công!
🎉 Hoàn thành xử lý tin nhắn!
```

5. Kiểm tra chat đích → Sẽ thấy bản dịch!

---

## 🖼️ Tính năng ảnh

Bot **tự động xử lý ảnh**:

- ✅ Nếu ảnh có **caption** → Dịch caption và gửi kèm ảnh
- ✅ Nếu ảnh **không có caption** → Gửi nguyên ảnh

**Không cần config gì thêm!**

---

## 🐛 Xử lý lỗi thường gặp

### ❌ "Error: API_ID_INVALID"

**Nguyên nhân:** API ID hoặc API Hash sai  
**Giải pháp:** Kiểm tra lại tại https://my.telegram.org/apps

### ❌ "Error: PHONE_NUMBER_INVALID"

**Nguyên nhân:** Số điện thoại sai format  
**Giải pháp:** Phải có dấu `+`, ví dụ: `+84987654321`

### ❌ "Error: SESSION_PASSWORD_NEEDED"

**Nguyên nhân:** Tài khoản bật 2FA  
**Giải pháp:** Nhập password 2FA khi được yêu cầu

### ❌ "Error: CHAT_INVALID"

**Nguyên nhân:** `TARGET_CHAT_ID` sai  
**Giải pháp:**

- Kiểm tra lại ID/username
- Nếu là group, phải thêm user account của bạn vào group đó

### ❌ "Error: insufficient_quota" (OpenAI)

**Nguyên nhân:** Hết quota OpenAI  
**Giải pháp:** Nạp thêm tiền vào tài khoản OpenAI

---

## 🚢 Deploy lên Cloud

### **Option 1: Railway**

1. Push code lên GitHub
2. Tạo project tại [Railway.app](https://railway.app/)
3. Deploy from GitHub
4. Thêm biến môi trường trong Settings
5. **Lưu ý:** Phải có `TELEGRAM_SESSION` để không cần login

### **Option 2: Render**

1. Tạo Background Worker tại [Render.com](https://render.com/)
2. Connect GitHub repo
3. Add environment variables
4. Start command: `npm start`

### **Option 3: VPS (Ubuntu)**

```bash
# Clone code
git clone <your-repo>
cd telegram-userbot-translator

# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài dependencies
npm install --production

# Tạo .env (thủ công hoặc dùng nano)
nano .env
# Paste config và save

# Chạy lần đầu (để lấy session)
npm start
# Nhập mã xác thực, password 2FA...
# Copy SESSION STRING vào .env

# Chạy với PM2 (auto-restart)
sudo npm install -g pm2
pm2 start index.js --name userbot
pm2 save
pm2 startup

# Xem logs
pm2 logs userbot
```

---

## 🔒 Bảo mật

### ⚠️ QUAN TRỌNG:

- **KHÔNG** commit file `.env` lên Git
- **KHÔNG** share SESSION STRING với ai
- **Session string = full access** vào tài khoản Telegram của bạn!

### 💡 Tips:

1. Dùng **tài khoản phụ** nếu lo ngại bảo mật
2. Bật **2FA** cho tài khoản chính
3. **Revoke session** nếu bị lộ:
   - Telegram → Settings → Privacy and Security → Active Sessions
   - Terminate session đang chạy bot

---

## 📊 So sánh Bot API vs User Account

| Tính năng                  | Bot API (v1.0)   | User Account (v2.0) ⭐ |
| -------------------------- | ---------------- | ---------------------- |
| Theo dõi channel công khai | ❌ Phải là admin | ✅ Không cần quyền     |
| Theo dõi channel private   | ❌ Phải là admin | ✅ Nếu là member       |
| Theo dõi group             | ✅               | ✅                     |
| Gửi tin nhắn               | ✅               | ✅                     |
| Hỗ trợ ảnh/video           | ✅               | ✅                     |
| Rate limit                 | Nhiều            | Ít hơn                 |
| Setup                      | Dễ               | Hơi phức tạp           |

**→ User Account phù hợp cho theo dõi channel công khai của người khác!**

---

## ❓ FAQ

### **Q: Có hợp pháp không?**

**A:** Sử dụng Telegram Client API là hợp pháp. Tuy nhiên:

- ⚠️ Không spam, không vi phạm ToS của Telegram
- ⚠️ Chỉ dùng cho mục đích cá nhân/research

### **Q: Telegram có phát hiện userbot không?**

**A:** Nếu dùng đúng mục đích (không spam), không vấn đề.

### **Q: Có theo dõi được nhiều channel không?**

**A:** Có! Sửa code để thêm nhiều channel vào `chats: []`

### **Q: Có thể dịch sang ngôn ngữ khác không?**

**A:** Có! Sửa prompt dịch trong code.

---

## 📞 Hỗ trợ

Có vấn đề? Tạo issue hoặc liên hệ developer.

---

## 📄 License

ISC License - Free to use

---

**Made with ❤️ by Senior Backend Developer**

**Version 2.0 - Userbot Edition** 🚀
