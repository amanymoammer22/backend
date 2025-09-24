const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const createToken = require("../utils/createToken");

const User = require("../models/userModel");

// @desc    Signup
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
    const user = await User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: String(req.body.email || "")
            .toLowerCase()
            .trim(),
        password: req.body.password,
    });

    const token = createToken(user._id);
    user.password = undefined; // لا تُرجع الباسورد
    res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
    const password = req.body.password;

    // ابحث عن المستخدم
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new ApiError("Incorrect email or password", 401));
    }

    const token = createToken(user._id);
    user.password = undefined;
    res.status(200).json({ data: user, token });
});

// @desc   make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(new ApiError("You are not login, Please login to get access this route", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
        return next(new ApiError("The user that belong to this token does no longer exist", 401));
    }

    if (currentUser.passwordChangedAt) {
        const passChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
        if (passChangedTimestamp > decoded.iat) {
            return next(new ApiError("User recently changed his password. please login again..", 401));
        }
    }

    req.user = currentUser;
    next();
});

// @desc    Authorization (User Permissions)
exports.allowedTo = (...roles) =>
    asyncHandler(async (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ApiError("You are not allowed to access this route", 403));
        }
        next();
    });

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
    console.log(email +"email"); ;

    // 1) Get user by email
    const user = await User.findOne({ email });
     console.log(user +"user");
    if (!user) {
        return next(new ApiError(`There is no user with that email ${email}`, 404));
    }

    // 2) Generate 6-digit code and store hashed in DB
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash("sha256").update(resetCode).digest("hex");
    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
    user.passwordResetVerified = false;
    console.log(user.passwordResetExpires);
    await user.save({ validateBeforeSave: false });

    const displayName = user.firstName || user.secondName || user.email;
    const textMsg =
        `Hi ${displayName},\n` +
        `We received a request to reset the password on your E-shop Account.\n` +
        `${resetCode}\n` +
        `Enter this code to complete the reset.\n` +
        `This code will expire in 10 minutes.\n` +
        `The E-shop Team`;

    try {
        await sendEmail({
            to: user.email, // 
            email: user.email, //
            subject: "Your password reset code (valid for 10 min)",
            message: textMsg, //   
            text: textMsg, //  
            html: `<p>Hello ${displayName},</p>
             <p>Your password reset code is: <b style="font-size:18px">${resetCode}</b></p>
             <p>This code will expire in 10 minutes.</p>
             <p>— The E-shop Team</p>`,
        });
    } catch (err) {
        user.passwordResetCode = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetVerified = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ApiError("There is an error in sending email", 500));
    }

    res.status(200).json({ status: "success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyResetCode = asyncHandler(async (req, res, next) => {
    const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
    const code = String(req.body.resetCode || "").trim();

    if (!email || !code) {
        return next(new ApiError("Email and resetCode are required", 400));
    }

    const hashedResetCode = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
        email,
        passwordResetCode: hashedResetCode,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        return next(new ApiError("Reset code invalid or expired", 400));
    }

    user.passwordResetVerified = true;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ status: "success", message: "Code verified" });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
    const newPassword = req.body.newPassword;
    const passwordConfirm = req.body.passwordConfirm; // لو سكيمتك تتحقق من التطابق

    const user = await User.findOne({ email });
    if (!user) {
        return next(new ApiError(`There is no user with email ${email}`, 404));
    }

    if (!user.passwordResetVerified || user.passwordResetExpires < Date.now()) {
        return next(new ApiError("Reset code not verified or expired", 400));
    }

    user.password = newPassword;
    if (typeof passwordConfirm !== "undefined") {
        user.passwordConfirm = passwordConfirm; // في حال السكيمة تتحقق من التطابق
    }
    user.passwordChangedAt = Date.now();
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();

    const token = createToken(user._id);
    res.status(200).json({ status: "success", token });
});
