const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Order = require("./models/Order"); // សម្រាប់ Telegram Bot ចុងក្រោយ

// នាំចូល Routes ដែលយើងបានបំបែក
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// ភ្ជាប់ Database
connectDB();

// ==============================
// ចុះបញ្ជី API Routes
// ==============================
app.use("/api", authRoutes); // សម្រាប់ Login/Register
app.use("/api/products", productRoutes); // សម្រាប់ Products
app.use("/api", orderRoutes); // សម្រាប់ Orders & Payment

// ==============================
// 🤖 កូដ TELEGRAM BOT POLLING (ប្រើពេលរត់លើម៉ាស៊ីនផ្ទាល់)
// ចំណាំ៖ ពេលដាក់លើ Vercel កូដនេះអាចនឹងដើរៗឈប់ៗ ព្រោះ Vercel ប្រើ Serverless
// ==============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
let lastUpdateId = 0;

async function pollTelegramUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`,
    );
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        if (update.callback_query) {
          const callbackData = update.callback_query.data;
          const queryId = update.callback_query.id;
          const messageId = update.callback_query.message.message_id;
          const chatId = update.callback_query.message.chat.id;

          let newStatus = "",
            targetOrderId = "",
            alertMsg = "",
            newKeyboard = [],
            newStatusText = "";

          if (callbackData.startsWith("ship_")) {
            newStatus = "Shipping";
            targetOrderId = callbackData.replace("ship_", "");
            alertMsg = "បានប្តូរទៅជា៖ 🚚 កំពុងដឹកជញ្ជូន";
            newStatusText = "🚚 កំពុងធ្វើការដឹកជញ្ជូន";
            newKeyboard = [
              [
                {
                  text: "✅ ប្តូរទៅជា: ទទួលបានហើយ",
                  callback_data: `done_${targetOrderId}`,
                },
              ],
            ];
          } else if (callbackData.startsWith("done_")) {
            newStatus = "Delivered";
            targetOrderId = callbackData.replace("done_", "");
            alertMsg = "បានប្តូរទៅជា៖ ✅ ទទួលបានហើយ";
            newStatusText = "✅ អតិថិជនទទួលបានហើយ";
            newKeyboard = [];
          }

          if (targetOrderId && newStatus) {
            const order = await Order.findOne({ orderId: targetOrderId });
            if (order) {
              order.status = newStatus;
              await order.save();

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: queryId,
                    text: alertMsg,
                  }),
                },
              );

              let textWithoutStatus = update.callback_query.message.text
                .split("✅ ស្ថានភាព:")[0]
                .trim();
              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: textWithoutStatus + `\n✅ ស្ថានភាព: ${newStatusText}`,
                    reply_markup:
                      newKeyboard.length > 0
                        ? { inline_keyboard: newKeyboard }
                        : undefined,
                  }),
                },
              );
              console.log(
                `🤖 Telegram Bot: Updated Order ${targetOrderId} to ${newStatus}`,
              );
            }
          }
        }
      }
    }
  } catch (err) {}
}
setInterval(pollTelegramUpdates, 2000);

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Fashion Shop Server running on port ${PORT}`);
});

// ត្រូវតែមានបន្ទាត់នេះ ទើប Vercel ដើរ
module.exports = app;
