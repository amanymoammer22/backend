// controllers/subscriptionController.js
const Subscription = require("../models/subscriptionModel");
const sendEmail = require("../utils/sendEmail"); // كود إرسال الإيميل

exports.notifySubscribers = async (req, res, next) => {
    try {
        const { subject, message } = req.body;
        const subscribers = await Subscription.find();

        if (!subscribers.length) {
            return res.status(400).json({ message: "No subscribers found." });
        }

        // إرسال لكل مشترك
        await Promise.all(
            subscribers.map((sub) =>
                sendEmail({
                    to: sub.email,
                    subject,
                    message: `Hello ${sub.name || "Subscriber"},\n\n${message}`,
                }),
            ),
        );

        res.status(200).json({ message: "✅ Notifications sent to all subscribers!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to send notifications." });
    }
};
