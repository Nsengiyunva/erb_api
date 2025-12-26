import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user";

const JWT_SECRET = "erb182qjdsufsdufudsuy";

export const register = async (req: Request, res: Response) => {
    const exists = await User.findOne({ where: { email: req.body.email } });
    if (exists) return res.status(400).json({ message: "User already exists" });
  
    const user = await User.create({
      ...req.body,
      // user_picture: req.file ? `/uploads/users/${req.file.filename}` : null
    });
  
    res.status(201).json({
      message: "User registered",
      userId: user.id
    });
  };

  export const forgotPassword = async (req: Request, res: Response) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.json({ message: "If user exists, reset sent" });
  
    const token = crypto.randomBytes(32).toString("hex");
  
    await user.update({
      password: token // TEMP (replace with reset table in production)
    });
  
    res.json({ resetToken: token });
  };
  

  export const resetPassword = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;
  
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });
  
    user.password = newPassword;
    await user.save();
  
    res.json({ message: "Password updated" });
  };

  export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
  
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
  
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });
  
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
  
    res.json({ token });
  };
  
  
  
