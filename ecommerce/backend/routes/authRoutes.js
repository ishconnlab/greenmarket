import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const saltRounds = 10;
const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !emailPattern.test(email.trim()) ||
      password.length < 6
    ) {
      return res.status(400).json({ msg: 'Enter a name, valid email and password of at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existUser = await User.findOne({ email: normalizedEmail });

    if (existUser) {
      return res.status(409).json({ msg: 'User already exists' });
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashPassword,
    });

    return res.status(201).json({
      msg: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ msg: 'User already exists' });
    }
    console.error(error);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !emailPattern.test(email.trim()) ||
      !password
    ) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      msg: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

export default router;
