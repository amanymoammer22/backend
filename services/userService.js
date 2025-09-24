const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");

const factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const User = require("../models/userModel");

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
    const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;
    if (req.file) {
        await sharp(req.file.buffer).resize(600, 600).toFormat("jpeg").jpeg({ quality: 95 }).toFile(`uploads/users/${filename}`);
        req.body.profileImg = filename;
    }
    next();
});

// ===== Admin CRUD =====
exports.getUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = factory.createOne(User);

exports.updateUser = asyncHandler(async (req, res, next) => {
    const update = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email,
        // profileImg: req.body.profileImg,
        role: req.body.role,
    };

    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const document = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });

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
        { new: true },
    );

    if (!document) return next(new ApiError(`No document for this id ${req.params.id}`, 404));
    res.status(200).json({ data: document });
});

exports.deleteUser = factory.deleteOne(User);

// ===== Current user (me) =====

// (الميدلوير المفقودة) يضبط id المستخدم الحالي ثم يمرره لـ getUser
exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
    req.params.id = req.user._id;
    next();
});

// تحديث بياناتي (بدون كلمة مرور/role)
exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
    const update = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email ? String(req.body.email).toLowerCase().trim() : undefined,
        phone: req.body.phone,
    };

    // لا تسمح بتعديل حقول حساسة عبر هذه الراوت
    delete req.body.password;
    delete req.body.passwordConfirm;
    delete req.body.role;

    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    // تأكد أن الإيميل الجديد غير مستخدم من حساب آخر
    if (update.email) {
        const exists = await User.findOne({ email: update.email, _id: { $ne: req.user._id } });
        if (exists) return next(new ApiError("E-mail already in use", 400));
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });

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

    const user = await User.findById(req.user._id);
    if (!user) return next(new ApiError("User not found", 404));

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

// إلغاء تنشيط حسابي
exports.deleteLoggedUserData = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { active: false });
    res.status(204).json({ status: "Success" });
});

// const asyncHandler = require("express-async-handler");
// const { v4: uuidv4 } = require("uuid");
// const sharp = require("sharp");
// const bcrypt = require("bcryptjs");

// const factory = require("./handlersFactory");
// const ApiError = require("../utils/apiError");
// // const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
// const createToken = require("../utils/createToken");
// const User = require("../models/userModel");

// // Upload single image
// // exports.uploadUserImage = uploadSingleImage("profileImg");

// // Image processing
// exports.resizeImage = asyncHandler(async (req, res, next) => {
//     const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;

//     if (req.file) {
//         await sharp(req.file.buffer).resize(600, 600).toFormat("jpeg").jpeg({ quality: 95 }).toFile(`uploads/users/${filename}`);

//         // Save image into our db
//         req.body.profileImg = filename;
//     }

//     next();
// });

// // @desc    Get list of users
// // @route   GET /api/v1/users
// // @access  Private/Admin
// exports.getUsers = factory.getAll(User);

// // @desc    Get specific user by id
// // @route   GET /api/v1/users/:id
// // @access  Private/Admin
// exports.getUser = factory.getOne(User);

// // @desc    Create user
// // @route   POST  /api/v1/users
// // @access  Private/Admin
// exports.createUser = factory.createOne(User);

// // @desc    Update specific user
// // @route   PUT /api/v1/users/:id
// // @access  Private/Admin

// exports.updateUser = asyncHandler(async (req, res, next) => {
//     const update = {
//         firstName: req.body.firstName,
//         secondName: req.body.secondName,
//         phone: req.body.phone,
//         email: req.body.email,
//         profileImg: req.body.profileImg,
//         role: req.body.role,
//     };

//     // نظّف الحقول undefined حتى لا تكتبها في DB
//     Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

//     const document = await User.findByIdAndUpdate(
//         req.params.id,
//         { $set: update },
//         { new: true, runValidators: true },
//     );

//     if (!document) return next(new ApiError(`No document for this id ${req.params.id}`, 404));
//     res.status(200).json({ data: document });
// });

// exports.changeUserPassword = asyncHandler(async (req, res, next) => {
//     const document = await User.findByIdAndUpdate(
//         req.params.id,
//         {
//             password: await bcrypt.hash(req.body.password, 12),
//             passwordChangedAt: Date.now(),
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

// // @desc    Delete specific user
// // @route   DELETE /api/v1/users/:id
// // @access  Private/Admin
// exports.deleteUser = factory.deleteOne(User);

// /////////////// user operations

// // @desc    Get Logged user data
// // @route   GET /api/v1/users/getMe
// // @access  Private/Protect

// exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
//   const update = {
//     firstName: req.body.firstName,
//     secondName: req.body.secondName,
//     email: req.body.email ? String(req.body.email).toLowerCase().trim() : undefined,
//     phone: req.body.phone,
//   };

//   // امنع تعديل حقول حساسة
//   delete req.body.password;
//   delete req.body.passwordConfirm;
//   delete req.body.role;

//   // نظّف undefined
//   Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

//   // لو هيحدّث الإيميل، تأكد إنه مش مستخدم من حد تاني
//   if (update.email) {
//     const exists = await User.findOne({ email: update.email, _id: { $ne: req.user._id } });
//     if (exists) return next(new ApiError("E-mail already in use", 400));
//   }

//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { $set: update },
//     { new: true, runValidators: true }
//   );

//   if (!updatedUser) return next(new ApiError("User not found", 404));
//   res.status(200).json({ data: updatedUser });
// });

// // @desc    Update logged user password
// // @route   PUT /api/v1/users/updateMyPassword
// // @access  Private/Protect

// exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
//   const { currentPassword, password, passwordConfirm } = req.body;

//   if (!password) return next(new ApiError("New password required", 400));
//   if (passwordConfirm !== undefined && password !== passwordConfirm) {
//     return next(new ApiError("Password confirmation incorrect", 400));
//   }

//   // هات المستخدم ومعه الباسورد
//   const user = await User.findById(req.user._id);
//   if (!user) return next(new ApiError("User not found", 404));

//   // (اختياري) تحقق من الباسورد الحالية إن كانت مرسلة
//   if (currentPassword) {
//     const ok = await bcrypt.compare(currentPassword, user.password);
//     if (!ok) return next(new ApiError("Incorrect current password", 400));
//   }

//   user.password = await bcrypt.hash(password, 12);
//   user.passwordChangedAt = Date.now();
//   await user.save();

//   const token = createToken(user._id);
//   user.password = undefined;

//   res.status(200).json({ data: user, token });
// });

// // @desc    Update logged user data (without password, role)
// // @route   PUT /api/v1/users/updateMe
// // @access  Private/Protect
// exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
//     const updatedUser = await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             name: req.body.name,
//             email: req.body.email,
//             phone: req.body.phone,
//         },
//         { new: true },
//     );

//     res.status(200).json({ data: updatedUser });
// });

// // @desc    Deactivate logged user
// // @route   DELETE /api/v1/users/deleteMe
// // @access  Private/Protect
// exports.deleteLoggedUserData = asyncHandler(async (req, res, next) => {
//     await User.findByIdAndUpdate(req.user._id, { active: false });

//     res.status(204).json({ status: "Success" });
// });
