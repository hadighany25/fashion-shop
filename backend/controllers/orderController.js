const Order = require("../models/Order");
const Product = require("../models/Product");
const dotenv = require("dotenv");
dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = "5612301669";

// មុខងារផ្ញើសារទៅ Telegram
async function sendTelegramNotification(textMessage, orderId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
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
    console.error("Telegram Error:", error);
  }
}

// ១. បង្កើតវិក្កយបត្រ (រង់ចាំការបង់ប្រាក់)
exports.createOrder = async (req, res) => {
  try {
    const { orderId, cart, user, itemsString, amount } = req.body;
    await Order.create({
      orderId,
      user,
      itemsString,
      amount: parseFloat(amount),
      cartItems: JSON.stringify(cart),
      status: "PENDING",
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating order" });
  }
};

// ២. បញ្ជាក់ការបង់ប្រាក់ជោគជ័យ (Webhook)
exports.payConfirm = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });

    if (order && order.status === "PENDING") {
      order.status = "Preparing";
      order.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Phnom_Penh",
      });

      // កាត់ស្តុកទំនិញ
      const cart = JSON.parse(order.cartItems || "[]");
      for (let item of cart) {
        const product = await Product.findById(item.id || item._id);
        if (product) {
          product.stock = Math.max(0, product.stock - item.qty);
          await product.save();
        }
      }
      await order.save();

      // ផ្ញើសារទៅ Telegram ម្ចាស់ហាង
      const message = `🛍️ <b>មានការបញ្ជាទិញថ្មី (Fashion Shop)!</b>\n━━━━━━━━━━━━━━━━━\n👤 <b>អតិថិជន:</b> ${order.user}\n💳 <b>វិក្កយបត្រ:</b> #${orderId}\n💰 <b>សរុប:</b> $${order.amount.toFixed(2)}\n✅ <b>ស្ថានភាព:</b> 📦 កំពុងរៀបចំអីវ៉ាន់`;
      sendTelegramNotification(message, orderId);

      return res.json({ success: true });
    }
    res
      .status(400)
      .json({ success: false, message: "Order not found or already paid" });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// ៣. ឆែកមើលស្ថានភាពបង់លុយ
exports.checkStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (order && order.status !== "PENDING") {
      res.json({ status: "SUCCESS" }); // ប្រាប់ Frontend ថាបង់រួចហើយ
    } else {
      res.json({ status: "PENDING" });
    }
  } catch (error) {
    res.status(500).json({ status: "PENDING" });
  }
};

// ៤. ទាញយកប្រវត្តិទិញរបស់អ្នកប្រើប្រាស់
exports.getUserOrders = async (req, res) => {
  try {
    // ទាញយកតែវិក្កយបត្រណាដែលបង់លុយរួច
    const userOrders = await Order.find({
      user: req.params.username,
      status: { $ne: "PENDING" },
    }).sort({ createdAt: -1 });
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
};
