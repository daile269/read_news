/**
 * TELEGRAM USERBOT TRANSLATOR
 *
 * Chức năng:
 * - Sử dụng Telegram User Account (MTProto) để theo dõi channel công khai
 * - Dịch nội dung sang tiếng Việt bằng OpenAI GPT
 * - Gửi bản dịch sang Telegram Group
 *
 * Author: Senior Backend Developer
 * Tech Stack: Node.js, Telegram MTProto (GramJS), OpenAI API
 */

require("dotenv").config();
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const OpenAI = require("openai");
const express = require("express");

// ============================================
// CẤU HÌNH VÀ KHỞI TẠO
// ============================================

// Kiểm tra biến môi trường
const requiredEnvVars = [
  "TELEGRAM_API_ID",
  "TELEGRAM_API_HASH",
  "TELEGRAM_PHONE_NUMBER",
  "TARGET_CHAT_ID",
  "OPENAI_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Thiếu biến môi trường: ${envVar}`);
    console.error("⚠️  Vui lòng kiểm tra file .env");
    process.exit(1);
  }
}

if (!process.env.SOURCE_CHANNEL_USERNAME && !process.env.SOURCE_CHANNEL_ID) {
  console.error(
    "❌ Thiếu cấu hình nguồn: cần SOURCE_CHANNEL_USERNAME hoặc SOURCE_CHANNEL_ID",
  );
  console.error("⚠️  Vui lòng kiểm tra file .env");
  process.exit(1);
}

// Telegram Client Config
const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER;
const SESSION_STRING = process.env.TELEGRAM_SESSION || "";

// Channel & Group Config
const SOURCE_CHANNEL_USERNAME = (process.env.SOURCE_CHANNEL_USERNAME || "").trim();
const SOURCE_CHANNEL_ID = (process.env.SOURCE_CHANNEL_ID || "")
  .trim()
  .split(/\s+/)[0];
const SOURCE_CHANNEL = SOURCE_CHANNEL_USERNAME || SOURCE_CHANNEL_ID;
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID; // ID hoặc username

// OpenAI Config
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Khởi tạo OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set để lưu message_id đã xử lý
const processedMessages = new Set();

// Prompt dịch thuật chuyên nghiệp
const TRANSLATION_PROMPT = `Bạn là một biên dịch viên chuyên nghiệp. Hãy dịch nội dung sau sang tiếng Việt một cách tự nhiên, dễ hiểu, KHÔNG thêm nội dung mới, KHÔNG tóm tắt.

Yêu cầu:
- Dịch chính xác và tự nhiên
- Giữ nguyên cấu trúc, emoji, xuống dòng
- Không thêm ý kiến cá nhân
- Không tóm tắt hoặc bỏ bớt nội dung
- Chỉ trả về bản dịch, không giải thích gì thêm`;

// ============================================
// HÀM DỊCH VĂN BẢN BẰNG OPENAI GPT
// ============================================

/**
 * Dịch văn bản sang tiếng Việt sử dụng OpenAI GPT
 * @param {string} text - Văn bản cần dịch
 * @returns {Promise<string>} - Văn bản đã dịch
 */
async function translateText(text) {
  try {
    console.log("🔄 Đang dịch văn bản...");

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: TRANSLATION_PROMPT,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = response.choices[0].message.content.trim();
    console.log("✅ Dịch thành công!");

    return translatedText;
  } catch (error) {
    console.error("❌ Lỗi khi dịch văn bản:", error.message);

    if (error.code === "insufficient_quota") {
      throw new Error("Hết quota OpenAI API. Vui lòng kiểm tra tài khoản.");
    } else if (error.code === "invalid_api_key") {
      throw new Error("API Key OpenAI không hợp lệ.");
    }

    throw error;
  }
}

// ============================================
// HÀM GỬI TIN NHẮN TỚI TELEGRAM
// ============================================

/**
 * Gửi tin nhắn đã dịch tới Telegram Group/Chat
 * @param {TelegramClient} client - Telegram client instance
 * @param {string} translatedText - Văn bản đã dịch
 * @param {number} originalMessageId - ID tin nhắn gốc
 */
async function sendToTargetChat(client, translatedText, originalMessageId) {
  try {
    console.log("📤 Đang gửi tin nhắn đã dịch...");

    await client.sendMessage(TARGET_CHAT_ID, {
      message: translatedText,
    });

    console.log(
      `✅ Đã gửi thành công! (Original msg ID: ${originalMessageId})`,
    );
  } catch (error) {
    console.error("❌ Lỗi khi gửi tin nhắn:", error.message);
    throw error;
  }
}

/**
 * Gửi ảnh với caption đã dịch
 * @param {TelegramClient} client - Telegram client instance
 * @param {object} photo - Photo object
 * @param {string} translatedCaption - Caption đã dịch
 * @param {number} originalMessageId - ID tin nhắn gốc
 */
async function sendPhotoToTargetChat(
  client,
  photo,
  translatedCaption,
  originalMessageId,
) {
  try {
    console.log("📤 Đang gửi ảnh với caption đã dịch...");

    await client.sendMessage(TARGET_CHAT_ID, {
      message: translatedCaption || "",
      file: photo,
    });

    console.log(
      `✅ Đã gửi ảnh thành công! (Original msg ID: ${originalMessageId})`,
    );
  } catch (error) {
    console.error("❌ Lỗi khi gửi ảnh:", error.message);
    throw error;
  }
}

// ============================================
// XỬ LÝ TIN NHẮN TỪ CHANNEL
// ============================================

/**
 * Xử lý tin nhắn mới từ channel
 * @param {TelegramClient} client - Telegram client
 * @param {object} event - New message event
 */
async function handleNewMessage(client, event) {
  const message = event.message;
  const messageId = message.id;

  // Log thông tin tin nhắn
  console.log("\n📨 Nhận tin nhắn mới:");
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Chat: ${message.chatId}`);
  console.log(`   Has Text: ${!!message.text}`);
  console.log(`   Has Photo: ${!!message.photo}`);

  // Kiểm tra đã xử lý chưa
  if (processedMessages.has(messageId)) {
    console.log("⏭️  Bỏ qua - Tin nhắn đã được xử lý");
    return;
  }

  try {
    // Đánh dấu đang xử lý
    processedMessages.add(messageId);

    // XỬ LÝ TIN NHẮN CÓ ẢNH
    if (message.photo) {
      const caption = message.text || "";

      if (caption) {
        console.log(
          `   Caption: ${caption.substring(0, 100)}${caption.length > 100 ? "..." : ""}`,
        );

        // Dịch caption
        const translatedCaption = await translateText(caption);
        console.log("📝 Caption đã dịch:");
        console.log(
          `   ${translatedCaption.substring(0, 100)}${translatedCaption.length > 100 ? "..." : ""}`,
        );

        // Kiểm tra độ dài caption (Giới hạn của Telegram cho caption ảnh là 1024 ký tự)
        if (translatedCaption.length > 1024) {
          console.log("⚠️  Caption sau khi dịch quá dài (>1024 ký tự).");
          console.log(
            "📤 Chuyển sang gửi dưới dạng tin nhắn văn bản (không gửi kèm ảnh) để tránh mất nội dung.",
          );
          await sendToTargetChat(client, translatedCaption, messageId);
        } else {
          // Gửi ảnh + caption đã dịch
          await sendPhotoToTargetChat(
            client,
            message.photo,
            translatedCaption,
            messageId,
          );
        }
      } else {
        // Ảnh không có caption - chỉ forward ảnh
        console.log("   Ảnh không có caption, gửi nguyên ảnh...");
        await sendPhotoToTargetChat(client, message.photo, "", messageId);
      }

      console.log("🎉 Hoàn thành xử lý ảnh!\n");
      return;
    }

    // XỬ LÝ TIN NHẮN CHỈ CÓ TEXT
    if (message.text) {
      const originalText = message.text;
      console.log(
        `   Text: ${originalText.substring(0, 100)}${originalText.length > 100 ? "..." : ""}`,
      );

      // Dịch văn bản
      const translatedText = await translateText(originalText);

      console.log("📝 Bản dịch:");
      console.log(
        `   ${translatedText.substring(0, 100)}${translatedText.length > 100 ? "..." : ""}`,
      );

      // Gửi tới chat đích
      await sendToTargetChat(client, translatedText, messageId);

      console.log("🎉 Hoàn thành xử lý tin nhắn!\n");
      return;
    }

    // Bỏ qua các loại message khác
    console.log("⏭️  Bỏ qua - Không có text hoặc photo\n");
  } catch (error) {
    console.error("❌ Lỗi khi xử lý tin nhắn:", error.message);

    // Xóa khỏi danh sách đã xử lý nếu có lỗi
    processedMessages.delete(messageId);

    console.log("⚠️  Tiếp tục hoạt động...\n");
  }
}

// ============================================
// HTTP SERVER (CHO RENDER WEB SERVICE)
// ============================================

// Tạo Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint (để Render & UptimeRobot ping)
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  res.json({
    status: "online",
    message: "Telegram Translator Bot đang hoạt động! 🤖",
    uptime: `${hours}h ${minutes}m`,
    timestamp: new Date().toISOString(),
    processedMessages: processedMessages.size,
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Khởi động HTTP server
app.listen(PORT, () => {
  console.log(`🌐 HTTP Server đang chạy trên port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/`);
  console.log("");
});

// ============================================
// KHỞI ĐỘNG CLIENT
// ============================================

let client; // Đưa client ra scope ngoài để các handler có thể truy cập

async function main() {
  console.log("🚀 ================================");
  console.log("🤖 TELEGRAM USERBOT TRANSLATOR");
  console.log("🚀 ================================");
  console.log("");

  // Khởi tạo Telegram Client với session
  const stringSession = new StringSession(SESSION_STRING);
  client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      await client.start({
        phoneNumber: async () => PHONE_NUMBER,
        password: async () => await input.text("Nhập Password 2FA (nếu có): "),
        phoneCode: async () =>
          await input.text("Nhập mã xác thực từ Telegram: "),
        onError: (err) => {
          if (err.message.includes("AUTH_KEY_DUPLICATED")) {
            console.warn("⚠️  Cảnh báo: Session đang được sử dụng ở nơi khác.");
          } else {
            console.error("❌ Lỗi:", err.message);
          }
        },
      });
      break; // Thành công thì thoát vòng lặp
    } catch (error) {
      if (
        error.message.includes("AUTH_KEY_DUPLICATED") &&
        retryCount < maxRetries - 1
      ) {
        retryCount++;
        console.log(
          `⏳ Đang đợi instance cũ tắt... (Thử lại ${retryCount}/${maxRetries} sau 15 giây)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } else {
        throw error;
      }
    }
  }

  console.log("✅ Đã kết nối thành công!");
  console.log("");

  // Lưu session để lần sau không cần login lại
  const session = client.session.save();
  if (session !== SESSION_STRING) {
    console.log("📝 SESSION STRING (lưu vào .env để không cần login lại):");
    console.log("─────────────────────────────────────────────────");
    console.log(session);
    console.log("─────────────────────────────────────────────────");
    console.log("⚠️  Copy string trên vào file .env (TELEGRAM_SESSION=...)");
    console.log("");
  }

  // Lấy thông tin user
  const me = await client.getMe();
  console.log("👤 Đăng nhập với tài khoản:");
  console.log(`   Username: @${me.username || "N/A"}`);
  console.log(`   Name: ${me.firstName} ${me.lastName || ""}`);
  console.log(`   Phone: ${me.phone}`);
  console.log("");

  console.log("📋 Cấu hình:");
  console.log(`   Theo dõi channel: ${SOURCE_CHANNEL}`);
  console.log(`   Gửi tới chat: ${TARGET_CHAT_ID}`);
  console.log(`   OpenAI Model: ${OPENAI_MODEL}`);
  console.log("");

  // Kiểm tra channel và join nếu cần
  let targetEntity;
  try {
    console.log("🔍 Đang kiểm tra channel...");
    targetEntity = await client.getEntity(SOURCE_CHANNEL);
    console.log("✅ Tìm thấy channel/group:");
    console.log(
      `   Tên: ${targetEntity.title || targetEntity.firstName || "N/A"}`,
    );
    console.log(`   ID: ${targetEntity.id}`);
    console.log(`   Type: ${targetEntity.className}`);

    // Thử join channel nếu là Channel/Supergroup
    if (targetEntity.className === "Channel") {
      try {
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: targetEntity,
          }),
        );
        console.log("✅ Đã đảm bảo join channel (subcribe thành công).");
      } catch (joinErr) {
        // Có thể đã join rồi hoặc là channel private không join được kiểu này
        console.log("ℹ️  Thông tin join:", joinErr.message);
      }
    }
    console.log("");
  } catch (error) {
    console.error("❌ KHÔNG tìm thấy channel!");
    console.error(`   Lỗi: ${error.message}`);
    console.error("");
    console.error("💡 Gợi ý:");
    console.error("   1. Kiểm tra lại username trong .env");
    console.error("   2. Đảm bảo bạn đã join/subscribe channel này");
    console.error("   3. Thử mở channel trong Telegram trước");
    console.error("");
  }

  const sourceChatIds = new Set();
  if (SOURCE_CHANNEL_ID) {
    sourceChatIds.add(SOURCE_CHANNEL_ID);
  }
  if (targetEntity && targetEntity.id) {
    const coreId = targetEntity.id.toString().replace(/^-100/, "").replace(/^-/, "");
    sourceChatIds.add(coreId);
    sourceChatIds.add(`-${coreId}`);
    sourceChatIds.add(`-100${coreId}`);
  }

  console.log("🎯 Source Chat IDs đang theo dõi:");
  console.log(`   ${Array.from(sourceChatIds).join(", ") || "(chưa resolve được ID)"}`);
  console.log("");

  // DEBUG: Lắng nghe TẤT CẢ message (không filter)
  console.log("🔍 [DEBUG MODE] Lắng nghe TẤT CẢ tin nhắn...");
  client.addEventHandler(async (event) => {
    const msg = event.message;
    if (!msg || !msg.chatId) return;
    const chatId = msg.chatId.toString();
    console.log(
      `\n🔔 [DEBUG] Nhận message từ Chat ID: ${chatId}`,
    );
    console.log(`   ID: ${msg.id}`);
    if (sourceChatIds.has(chatId)) {
      console.log("   ✅ Match SOURCE channel theo Chat ID");
    }
    if (msg.text) {
      console.log(
        `   Text: ${msg.text.substring(0, 50)}${msg.text.length > 50 ? "..." : ""}`,
      );
    }
    if (msg.photo) console.log("   Media: Photo");
  }, new NewMessage({}));

  // Quan trọng: Gọi getDialogs để GramJS cập nhật entity cache và bắt đầu nhận updates
  console.log("🔄 Đang tải danh sách chat (getDialogs)...");
  await client.getDialogs({});
  console.log("✅ Đã tải xong danh sách chat.");

  // Đăng ký event listener cho tin nhắn từ channel cụ thể
  console.log("✅ Đăng ký listener cho channel...");
  console.log("👂 Đang lắng nghe tin nhắn...");
  console.log("");

  client.addEventHandler(
    async (event) => {
      const msg = event.message;
      if (!msg || !msg.chatId) return;
      const chatId = msg.chatId.toString();
      if (!sourceChatIds.has(chatId)) {
        return;
      }
      console.log(
        "\n📺 [CHANNEL EVENT] Nhận được message từ channel chỉ định!",
      );
      console.log(`   Source Chat ID matched: ${chatId}`);
      await handleNewMessage(client, event);
    },
    new NewMessage({}),
  );

  console.log("🎯 Userbot đang hoạt động!");
  console.log("");
  console.log("⚠️  LƯU Ý:");
  console.log("   - Bạn PHẢI là member/subscriber của channel");
  console.log("   - Thử gửi tin nhắn vào channel hoặc đợi tin mới");
  console.log("   - Nếu không thấy log [DEBUG], có thể channel chưa join");
  console.log("");

  // ============================================
  // KEEP-ALIVE MECHANISM (Tránh sleep trên cloud)
  // ============================================

  console.log("💓 Kích hoạt Keep-Alive (ping mỗi 10 phút)...");
  console.log("   → Giúp bot không bị sleep trên Render/Railway");
  console.log("");

  // Ping Telegram mỗi 10 phút để giữ kết nối
  setInterval(
    async () => {
      try {
        if (!client.connected) {
          console.log("🔄 Đang kết nối lại...");
          await client.connect();
        }

        await client.getMe();
        const now = new Date().toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        });
        console.log(`💓 [Keep-Alive] Ping thành công - ${now}`);
      } catch (error) {
        if (error.message.includes("AUTH_KEY_DUPLICATED")) {
          console.warn(
            "⚠️  Phát hiện instance mới đã khởi động. Đang nhường chỗ cho instance mới...",
          );
          console.log("🛑 Đang tắt instance cũ để tránh xung đột session...");
          process.exit(0);
        }
        console.error("❌ [Keep-Alive] Ping thất bại:", error.message);
      }
    },
    10 * 60 * 1000,
  ); // 10 phút

}

// Chạy main function
main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
});

// Xử lý tín hiệu tắt
const gracefulShutdown = async (signal) => {
  console.log(`\n\n🛑 Nhận tín hiệu ${signal}. Đang tắt userbot...`);
  if (client) {
    try {
      await client.disconnect();
      console.log("🔌 Đã ngắt kết nối Telegram.");
    } catch (err) {
      console.error("❌ Lỗi khi ngắt kết nối:", err.message);
    }
  }
  console.log("✅ Đã tắt thành công!");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
