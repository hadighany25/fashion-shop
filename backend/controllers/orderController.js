const Order = require("../models/Order");
const Product = require("../models/Product");

// ផ្ញើសារទៅ Telegram
async function sendTelegramNotification(textMessage, orderId) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: textMessage,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚚 ប្តូរទៅជា: កំពុងដឹកជញ្ជូន",
                callback_data: `ship_${orderId}`,
              },
            ],
          ],
        },
      }),
    });
  } catch (error) {
    console.error("❌ Telegram Notification Error:", error);
  }
}

exports.createOrder = async (req, res) => {
  try {
    const { orderId, cart, user, itemsString, amount } = req.body;
    const newOrder = new Order({
      orderId,
      cart,
      user,
      itemsString,
      amount,
      status: "PENDING",
    });
    await newOrder.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.payConfirm = async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log(`✅ [Webhook] Order ID: ${orderId}`);

    const order = await Order.findOne({ orderId });
    if (order) {
      order.status = "SUCCESS";
      order.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Phnom_Penh",
      });
      await order.save();

      // កាត់ស្តុក
      if (order.cart && Array.isArray(order.cart)) {
        for (let cartItem of order.cart) {
          const product = await Product.findOne({ id: cartItem.id });
          if (product) {
            product.stock = Math.max(0, (product.stock || 0) - cartItem.qty);
            await product.save();
          }
        }
      }

      // ផ្ញើ Telegram
      const message = `🛍️ <b>មានការបញ្ជាទិញថ្មី!</b>\n━━━━━━━━━━━━━━━━━\n👤 <b>អតិថិជន:</b> ${order.user}\n💳 <b>វិក្កយបត្រ:</b> #${orderId}\n💰 <b>សរុប:</b> $${order.amount}\n✅ <b>ស្ថានភាព:</b> 📦 កំពុងរៀបចំអីវ៉ាន់`;
      await sendTelegramNotification(message, orderId);

      // កែស្ថានភាពចុងក្រោយទៅ Preparing សម្រាប់ History
      order.status = "Preparing";
      await order.save();

      return res.json({ success: true });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    // បើ order ក្លាយជា Preparing/Shipping/Delivered/SUCCESS គឺមានន័យថាបង់លុយរួច
    const isPaid = order && order.status !== "PENDING";
    res.json({ status: isPaid ? "SUCCESS" : "PENDING" });
  } catch (error) {
    res.status(500).json({ status: "PENDING" });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { username } = req.params;
    const userOrders = await Order.find({
      user: username,
      status: { $ne: "PENDING" },
    }).sort({ _id: -1 });
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Telegram Webhook Poller
let lastUpdateId = 0;
exports.pollTelegramUpdates = async () => {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`,
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

          let newStatus = "";
          let targetOrderId = "";
          let alertMsg = "";
          let newKeyboard = [];
          let newStatusText = "";

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
          }

          if (targetOrderId && newStatus) {
            await Order.findOneAndUpdate(
              { orderId: targetOrderId },
              { status: newStatus },
            );

            await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/answerCallbackQuery`,
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
              `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/editMessageText`,
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
          }
        }
      }
    }
  } catch (err) {}
};
