const crypto = require("crypto");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const createToken = require("../utils/createToken");

const User = require("../models/userModel");

// @desc    Signup
// @route   post /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
    // 1- Create user
    const user = await User.create({
        firstName: req.body.firstName,
        secondName: req.body.secondName,
        email: req.body.email,
        password: req.body.password,
    });

    // const user = await User.create({
    //     name: req.body.name,
    //     email: req.body.email,
    //     password: req.body.password,
    // });

    // 2- Generate token
    const token = createToken(user._id);

    res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   GET /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    // 1) check if password and email in the body (validation)
    // 2) check if user exist & check if password is correct
    const user = await User.findOne({ email: req.body.email });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return next(new ApiError("Incorrect email or password", 401));
    }
    // 3) generate token
    const token = createToken(user._id);

    // Delete password from response
    delete user._doc.password;
    // 4) send response to client side
    res.status(200).json({ data: user, token });
});

// @desc   make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
    // 1) Check if token exist, if exist get ...
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(new ApiError("You are not login, Please login to get access this route", 401));
    }

    // 2) Verify token (no change happens, expired token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 3) Check if user exists
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
        return next(new ApiError("The user that belong to this token does no longer exist", 401));
    }

    // 4) Check if user change his password after token created
    if (currentUser.passwordChangedAt) {
        const passChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
        // Password changed after token created (Error)
        if (passChangedTimestamp > decoded.iat) {
            return next(new ApiError("User recently changed his password. please login again..", 401));
        }
    }

    req.user = currentUser;
    next();
});

// @desc    Authorization (User Permissions)
// ["admin", "manager"]
exports.allowedTo = (...roles) =>
    asyncHandler(async (req, res, next) => {
        // 1) access roles
        // 2) access registered user (req.user.role)
        if (!roles.includes(req.user.role)) {
            return next(new ApiError("You are not allowed to access this route", 403));
        }
        next();
    });

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    // 1) Get user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ApiError(`There is no user with that email ${req.body.email}`, 404));
    }
    // 2) If user exist, Generate hash reset random 6 digits and save it in db
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash("sha256").update(resetCode).digest("hex");

    // Save hashed password reset code into db
    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
    user.passwordResetVerified = false;
    // Add expiration time for password reset code (10 min)
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    user.passwordResetVerified = false;

    await user.save({ validateBeforeSave: false });
    const displayName = user.firstName || user.secondName || user.email;

    // 3) Send the reset code via email
    const Tmessage = `Hi ${displayName},\n We received a request to reset the password on your E-shop Account. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.\n The E-shop Team`;
    try {
        console.log(user.name);
        await sendEmail({
            email: user.email,
            subject: "Your password reset code (valid for 10 min)",
            message: Tmessage,
        });
    } catch (err) {
        user.passwordResetCode = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetVerified = undefined;

        await user.save();
        return next(new ApiError("There is an error in sending email", 500));
    }

    res.status(200).json({ status: "Success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
    // 1) Get user based on reset code
    const hashedResetCode = crypto.createHash("sha256").update(req.body.resetCode).digest("hex");

    const user = await User.findOne({
        passwordResetCode: hashedResetCode,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        return next(new ApiError("Reset code invalid or expired"));
    }

    // 2) Reset code valid
    user.passwordResetVerified = true;
    await user.save();

    res.status(200).json({
        status: "Success",
    });
});

// @desc    Reset password
// @route   POST put /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // 1) Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ApiError(`There is no user with email ${req.body.email}`, 404));
    }

    // 2) Check if reset code verified
    if (!user.passwordResetVerified) {
        return next(new ApiError("Reset code not verified", 400));
    }

    user.password = req.body.newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();

    // 3) if everything is ok, generate token
    const token = createToken(user._id);
    res.status(200).json({ token });
});



const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");

const factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");
// const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const createToken = require("../utils/createToken");
const User = require("../models/userModel");

// Upload single image
// exports.uploadUserImage = uploadSingleImage("profileImg");

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
    const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;

    if (req.file) {
        await sharp(req.file.buffer).resize(600, 600).toFormat("jpeg").jpeg({ quality: 95 }).toFile(`uploads/users/${filename}`);

        // Save image into our db
        req.body.profileImg = filename;
    }

    next();
});

// @desc    Get list of users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = factory.getAll(User);

// @desc    Get specific user by id
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = factory.getOne(User);

// @desc    Create user
// @route   POST  /api/v1/users
// @access  Private/Admin
exports.createUser = factory.createOne(User);

// @desc    Update specific user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin

exports.updateUser = asyncHandler(async (req, res, next) => {
    const update = {
        firstName: req.body.firstName,
        secondName: req.body.secondName,
        phone: req.body.phone,
        email: req.body.email,
        profileImg: req.body.profileImg,
        role: req.body.role,
    };

    // نظّف الحقول undefined حتى لا تكتبها في DB
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const document = await User.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }, 
    );

    if (!document) return next(new ApiError(`No document for this id ${req.params.id}`, 404));
    res.status(200).json({ data: document });
});



exports.changeUserPassword = asyncHandler(async (req, res, next) => {
    const document = await User.findByIdAndUpdate(
        req.params.id,
        {
            password: await bcrypt.hash(req.body.password, 12),
            passwordChangedAt: Date.now(),
        },
        {
            new: true,
        },
    );

    if (!document) {
        return next(new ApiError(`No document for this id ${req.params.id}`, 404));
    }
    res.status(200).json({ data: document });
});

// @desc    Delete specific user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = factory.deleteOne(User);


/////////////// user operations

// @desc    Get Logged user data
// @route   GET /api/v1/users/getMe
// @access  Private/Protect

exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
  const update = {
    firstName: req.body.firstName,
    secondName: req.body.secondName,
    email: req.body.email ? String(req.body.email).toLowerCase().trim() : undefined,
    phone: req.body.phone,
  };

  // امنع تعديل حقول حساسة
  delete req.body.password;
  delete req.body.passwordConfirm;
  delete req.body.role;

  // نظّف undefined
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  // لو هيحدّث الإيميل، تأكد إنه مش مستخدم من حد تاني
  if (update.email) {
    const exists = await User.findOne({ email: update.email, _id: { $ne: req.user._id } });
    if (exists) return next(new ApiError("E-mail already in use", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!updatedUser) return next(new ApiError("User not found", 404));
  res.status(200).json({ data: updatedUser });
});



// @desc    Update logged user password
// @route   PUT /api/v1/users/updateMyPassword
// @access  Private/Protect

exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;

  if (!password) return next(new ApiError("New password required", 400));
  if (passwordConfirm !== undefined && password !== passwordConfirm) {
    return next(new ApiError("Password confirmation incorrect", 400));
  }

  // هات المستخدم ومعه الباسورد
  const user = await User.findById(req.user._id);
  if (!user) return next(new ApiError("User not found", 404));

  // (اختياري) تحقق من الباسورد الحالية إن كانت مرسلة
  if (currentPassword) {
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return next(new ApiError("Incorrect current password", 400));
  }

  user.password = await bcrypt.hash(password, 12);
  user.passwordChangedAt = Date.now();
  await user.save();

  const token = createToken(user._id);
  user.password = undefined;

  res.status(200).json({ data: user, token });
});





// @desc    Update logged user data (without password, role)
// @route   PUT /api/v1/users/updateMe
// @access  Private/Protect
exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
        },
        { new: true },
    );

    res.status(200).json({ data: updatedUser });
});

// @desc    Deactivate logged user
// @route   DELETE /api/v1/users/deleteMe
// @access  Private/Protect
exports.deleteLoggedUserData = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { active: false });

    res.status(204).json({ status: "Success" });
});


// exports.updateUser = asyncHandler(async (req, res, next) => {
//     const document = await User.findByIdAndUpdate(
//         req.params.id,
//         {
//             name: req.body.name,
//             slug: req.body.slug,
//             phone: req.body.phone,
//             email: req.body.email,
//             profileImg: req.body.profileImg,
//             role: req.body.role,
//         },
//         {
//             new: true,
//         },
//     );

//     if (!document) {
//         return next(new ApiError(`No document for this id ${req.params.id}`, 404));
//     }
//     res.status(200).json({ data: document });
// });
// exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
//     req.params.id = req.user._id;
//     next();
// });

//exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
//     const update = {
//         firstName: req.body.firstName,
//         secondName: req.body.secondName,
//         email: req.body.email,
//         phone: req.body.phone,
//     };

//     Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

//     const updatedUser = await User.findByIdAndUpdate(
//         req.user._id,
//         { $set: update },
//         { new: true, runValidators: true }, // يطبّق قيود الطول/الإيميل.. إلخ
//     );

//     res.status(200).json({ data: updatedUser });
// });

// exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
//     // 1) Update user password based user payload (req.user._id)
//     const user = await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             password: await bcrypt.hash(req.body.password, 12),
//             passwordChangedAt: Date.now(),
//         },
//         {
//             new: true,
//         },
//     );

//     // 2) Generate token
//     const token = createToken(user._id);

//     res.status(200).json({ data: user, token });
// });