const express = require("express");
const router = express.Router();
const {
  createOrder,
  payConfirm,
  checkStatus,
  getUserOrders,
} = require("../controllers/orderController");

router.post("/create-order", createOrder);
router.post("/pay-confirm", payConfirm);
router.get("/check-status/:orderId", checkStatus);
router.get("/orders/:username", getUserOrders);

module.exports = router;
