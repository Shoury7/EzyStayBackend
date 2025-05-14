import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
const ADMIN_SECRET = "xyz";
const router = express.Router();

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register
router.post("/register", async (req, res) => {
  const { name, email, password, role, adminKey } = req.body;

  try {
    if (role === "admin") {
      if (!adminKey || adminKey !== ADMIN_SECRET) {
        return res
          .status(403)
          .json({ message: "Invalid or missing admin secret key" });
      }
    }

    const user = new User({ name, email, password, role });
    await user.save();
    const token = createToken(user);
    res.json({ token });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Registration failed", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = createToken(user);
    res.json({
      token,
      username: user.name,
      userid: user._id,
      role: user.role,
      email: user.email, // ✅ Include email here
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
