import express from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import user from "./routes/user.route.js";
import post from "./routes/post.route.js";
import feature from "./routes/feature.route.js";
import analytics from "./routes/analytics.route.js";
import site from "./routes/site.route.js";
import notification from "./routes/notification.route.js";

dotenv.config({ path: "./.env" });

export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";

export const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/v1", user);
app.use("/api/v1", post);
app.use("/api/v1", feature);
app.use("/api/v1", analytics);
app.use("/api/v1", site);
app.use("/api/v1", notification);

app.get("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

app.use(errorMiddleware);
