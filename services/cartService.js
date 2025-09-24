const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");

const calcTotalCartPrice = (cart) => {
    let totalPrice = 0;
    cart.cartItems.forEach((item) => {
        totalPrice += item.quantity * item.price;
    });
    cart.totalCartPrice = totalPrice;
    cart.totalPriceAfterDiscount = undefined;
    return totalPrice;
};


// مساعد لاختيار صورة آمنة (من المنتج أو بديل)
const pickImage = (product) =>
  product?.imageCover ||
  (Array.isArray(product?.images) ? product.images[0] : null) ||
  "/images/placeholder.png";
  
// @desc    Add product to  cart
// @route   POST /api/v1/cart
// @access  Private/User
// @desc    Add product to cart
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;
  const product = await Product.findById(productId).lean();
  if (!product) return next(new ApiError("Product not found", 404));

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
        user: req.user._id,
        cartItems: [
            {
                product: productId,
                price: product.price,
                imageCover: pickImage(product),
                title: product.title,
            },
        ],
    });
  } else {
    const idx = cart.cartItems.findIndex(
      (it) =>
        it.product.toString() === productId
    );

    if (idx > -1) {
      const item = cart.cartItems[idx];
      item.quantity += 1;
       item.imageCover = pickImage(product);
       item.title = product.title; // تأكدنا إن العنوان دائماً محدث
       cart.cartItems[idx] = item;
    } else {
      cart.cartItems.push({
          product: productId,
          price: product.price,
          imageCover: pickImage(product),
          title: product.title,
      });
    }
  }

  calcTotalCartPrice(cart);
  await cart.save();

  // مهم: رجّع cart مع populate
  const populatedCart = await Cart.findById(cart._id);

  res.status(200).json({
    status: "success",
    message: "Product added to cart successfully",
    numOfCartItems: populatedCart.cartItems.length,
    data: populatedCart,
  });
});

// @desc    Get logged user cart
exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({ path: "cartItems.product", select: "title price imageCover" });

  if (!cart) return res.status(204).send();

  res.status(200).json({
    status: "success",
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});



// @desc    Remove specific cart item
// @route   DELETE /api/v1/cart/:itemId
// @access  Private/User
exports.removeSpecificCartItem = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        {
            $pull: { cartItems: { _id: req.params.itemId } },
        },
        { new: true },
    );

    calcTotalCartPrice(cart);
    cart.save();

    res.status(200).json({
        status: "success",
        numOfCartItems: cart.cartItems.length,
        data: cart,
    });
});

// @desc    clear logged user cart
// @route   DELETE /api/v1/cart
// @access  Private/User
exports.clearCart = asyncHandler(async (req, res, next) => {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.status(204).send();
});

// @desc    Update specific cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Private/User
exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        return res.status(204).send();
    }

    const itemIndex = cart.cartItems.findIndex((item) => item._id.toString() === req.params.itemId);
    if (itemIndex > -1) {
        const cartItem = cart.cartItems[itemIndex];
        cartItem.quantity = quantity;
        cart.cartItems[itemIndex] = cartItem;
    } else {
        return res.status(204).send();
    }

    calcTotalCartPrice(cart);

    await cart.save();

    res.status(200).json({
        status: "success",
        numOfCartItems: cart.cartItems.length,
        data: cart,
    });
});

