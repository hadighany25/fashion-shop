const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/create-order", orderController.createOrder);
router.post("/pay-confirm", orderController.payConfirm);
router.get("/check-status/:orderId", orderController.checkStatus);
router.get("/orders/:username", orderController.getUserOrders);

module.exports = router;
