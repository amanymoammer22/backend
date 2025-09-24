// const express = require("express");
// const sendEmail = require("../utils/sendEmail");
// const router = express.Router();

// router.post("/", async (req, res) => {
//     try {
//         const { name, email, message } = req.body;

//         await sendEmail({
//             email: "amanysuliman2002@gmail.com",
//             subject: `New contact from ${name}`,
//             message: `Email: ${email}\n\nMessage:\n${message}`,
//         });

//         res.status(200).json({ message: "Message sent successfully!" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Failed to send message." });
//     }
// });

// module.exports = router;
