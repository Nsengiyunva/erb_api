import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import { Op, col, fn, where } from "sequelize";
import OldUser  from "../models/old_user";
import { ERBEngineer } from "../models";
import { invalidateRegistryCache } from "./engineer_registry";


const normReg = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

export const register = async (req: Request, res: Response) => {
  const started = Date.now();
  try {
    const email = String(req.body.email ?? "").trim();
    if (!email) return res.status(400).json({ message: "Email address is required." });

    const exists = await OldUser.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Renewing engineers: the licence number must exist in erb_engineer and
    // must not already have a portal account. Name, gender and category come
    // from erb_engineer — they are read-only on the form, so never trust the
    // values the browser sends for them.
    const overrides: Record<string, unknown> = {};
    if (req.body.registered === "Yes") {
      const reg = normReg(req.body.licence_no);
      if (!reg) return res.status(400).json({ message: "ERB registration number is required." });

      const taken = await OldUser.findOne({
        where: {
          [Op.or]: [
            where(fn("UPPER", fn("TRIM", col("licence_no"))), reg),
            { licence_no: { [Op.like]: `${reg}/%` } },
          ],
        },
        attributes: ["id"],
      });
      if (taken) {
        return res.status(409).json({
          message: "An account already exists for this registration number. Please sign in or reset your password.",
        });
      }

      const engineer = await ERBEngineer.findOne({
        where: where(fn("UPPER", fn("TRIM", col("reg_no"))), reg),
      });
      if (!engineer) return res.status(400).json({ message: "Registration number not found in the ERB register." });

      overrides.name = String(engineer.name ?? "").trim() || req.body.name;
      overrides.gender = String(engineer.gender ?? "").trim().toUpperCase().charAt(0) || req.body.gender;
      overrides.licence_no = String(engineer.reg_no).trim();
    }

    const user = await OldUser.create({
      ...req.body,
      ...overrides,
      email,
      dob: req.body.birth_date,
      created_at: Date.now(),
      updated_at: Date.now(),
      user_type: "APPLICANT",
      tin: req.body.tin || null,
      user_picture: req.file ? `uploads/users/${req.file.filename}` : null,
    });

    // The registration-number list reads the registry snapshot — drop it so
    // this licence number disappears from the list straight away.
    invalidateRegistryCache();

    return res.status(201).json({
      message: "User registered successfully.",
      userId: user.id,
    });
  } catch (err: any) {
    // Never let a failure here escape: answer with JSON so the browser gets a
    // real message instead of a dropped connection / 502, and log the cause
    // (with timing) so it shows up in pm2 logs.
    console.error(`[register] failed after ${Date.now() - started}ms:`, err?.name, err?.message);

    // Don't leave an orphaned photo behind when the account was not created.
    if (req.file?.path) fs.unlink(req.file.path, () => {});

    if (res.headersSent) return;

    if (err?.name === "SequelizeValidationError" || err?.name === "SequelizeUniqueConstraintError") {
      const detail = err.errors?.map((e: any) => e.message).join("; ");
      return res.status(400).json({ message: detail || "Some of the details you entered are invalid." });
    }
    if (err?.name === "SequelizeDatabaseError" && /Data too long|Incorrect .* value/i.test(err?.parent?.sqlMessage ?? err?.message ?? "")) {
      return res.status(400).json({
        message: "One of the fields is too long or has an invalid value. Please check your details (TIN: max 20 characters).",
      });
    }
    if (/Connection|ECONNREFUSED|ETIMEDOUT|SequelizeConnection|SequelizeDatabaseError/i.test(`${err?.name} ${err?.message}`)) {
      return res.status(503).json({ message: "The registration service is temporarily unavailable. Please try again in a few minutes." });
    }
    return res.status(500).json({ message: "Registration failed due to a server error. Please try again or contact the ERB Information Office." });
  }
};

  export const forgotPassword = async (req: Request, res: Response) => {
    const user = await OldUser.findOne({ where: { email: req.body.email } });
    if (!user) return res.json({ message: "If user exists, reset sent" });
  
    const token = crypto.randomBytes(32).toString("hex");
  
    await user.update({
      password: token // TEMP (replace with reset table in production)
    });
  
    res.json({ resetToken: token });
  };
  

  export const resetPassword = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;
  
    const user = await OldUser.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });
  
    user.password = newPassword;
    await user.save();
  
    res.json({ message: "Password updated" });
  };

  export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
  
    const user = await OldUser.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
  
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Fail loudly with a clear server-side log line instead of the opaque
      // "secretOrPrivateKey must have a value" jsonwebtoken throws — makes
      // a missing/misnamed .env entry immediately obvious in pm2 logs.
      console.error("JWT_SECRET is not set in the environment — check .env on this server");
      return res.status(500).json({ message: "Server misconfiguration: missing JWT secret" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: "1d" }
    );
  
    res.json({ 
      token,
      user
    });
  };
  
  
  
