const express = require("express");
const { createSubscription, getSubscribers } = require("../services/subscribeService");
const router = express.Router();
router
    .route("/")
    .post(createSubscription) // POST /api/v1/subscribe
    .get(getSubscribers); // GET /api/v1/subscribe (للعرض - اختيارية)

module.exports = router;
