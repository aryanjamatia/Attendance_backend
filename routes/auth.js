import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../model/User.js";

const router = express.Router();

// 🔐 REGISTER
router.post("/register", async (req, res) => {
  try {
    const { password, role, email } = req.body;

    // check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      ...req.body,
      password: hashedPassword,
      role,
    });

    res.json({
      message: "Registered successfully",
      user,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔐 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // 🔥 ROLE CHECK (THIS FIXES YOUR ISSUE)
    if (user.role !== role) {
      return res.status(400).json({ msg: "Invalid role for this user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    const { password: _, ...safeUser } = user.toObject();

    res.json({
      token,
      user: safeUser,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔐 PROFILE
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const decoded = jwt.verify(token, "SECRET_KEY");

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    res.json(user);

  } catch (err) {
    console.log(err);
    res.status(401).json({ msg: "Invalid token" });
  }
});

export default router;