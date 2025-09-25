const express = require("express");
console.log("✅ authRoute loaded");

const { signupValidator, loginValidator } = require("../utils/validators/authValidator");

const { signup, login, forgotPassword, verifyResetCode, resetPassword } = require("../services/authService");

const router = express.Router();

router.post("/signup", signupValidator, signup);
router.post("/login", loginValidator, login);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyResetCode", verifyResetCode);
router.post("/resetPassword", resetPassword); 

console.log("✅ authRoute routes registered: forgotPassword, verifyResetCode, resetPassword");
module.exports = router;


