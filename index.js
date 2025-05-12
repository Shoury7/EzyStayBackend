import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";

import cors from "cors";
import { authenticate } from "./middlewares/authenticate.js";
import { authorizeRoles } from "./middlewares/authorize.js";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listingRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
// Import routes here later
app.get("/api/admin", authenticate, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Welcome admin!" });
});

app.get("/api/user", authenticate, authorizeRoles("user"), (req, res) => {
  res.json({ message: `Welcome user ${req.user.role}` });
});

app.use("/api/listings", listingRoutes);

mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
