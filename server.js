// server.js
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");

dotenv.config({ path: "config.env" });

const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const dbConnection = require("./config/database");

// Routes
const categoryRoute = require("./routes/categoryRoute");
const userRoute = require("./routes/userRoute");
const authRoute = require("./routes/authRoute");
const productRoute = require("./routes/productRoute");
const cartRouter = require("./routes/cartRoute");
const wishlistRoute = require("./routes/wishlistRoute");
const adminRoute = require("./routes/adminRoute");
const subscriberRoute = require("./routes/subscriberRoute");

// 1) Connect DB
dbConnection();

// 2) App
const app = express();

// Detect ROOT correctly for exe/dev
const ROOT = process.pkg ? path.dirname(process.execPath) : __dirname;

// 3) CORS
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://frontsoftw.netlify.app",
    /\.netlify\.app$/, 
];

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true); // same-origin / curl
            const ok = allowedOrigins.some((o) => (typeof o === "string" ? o === origin : o instanceof RegExp ? o.test(origin) : false));
            if (ok) return cb(null, true);
            console.log("Blocked CORS request from:", origin);
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }),
);

// 4) Core middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`mode: ${process.env.NODE_ENV}`);
}

// 5) Static: uploads (MUST come before SPA fallback)
const UPLOADS_DIR = path.join(ROOT, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR)); // sets proper content-type automatically

// 6) API Routes
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/Subscribe".toLowerCase(), subscriberRoute); // keep path stable

// 7) Serve FRONTEND build (if present)
const STATIC_DIR = path.join(ROOT, "dist");
if (fs.existsSync(STATIC_DIR)) {
    app.use(express.static(STATIC_DIR));
    // SPA fallback, but exclude API and uploads
    app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
        res.sendFile(path.join(STATIC_DIR, "index.html"));
    });
}

// 8) 404 handler (after SPA fallback)
app.use((req, _res, next) => {
    next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// 9) Global error handler
app.use(globalError);

// 10) Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`App running on http://127.0.0.1:${PORT}`);
});

// 11) Unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
    server.close(() => {
        console.error("Shutting down....");
        process.exit(1);
    });
});
