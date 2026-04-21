import crypto from "node:crypto";
import { Router } from "express";
import { mutateDb } from "../storage.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import { signJwt } from "../jwt.js";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAuthRouter({ jwtSecret }) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const emailNormalized = email.trim().toLowerCase();
    const { salt, hash } = await hashPassword(password);

    try {
      const user = await mutateDb((db) => {
        const exists = db.users.some((u) => u.email === emailNormalized);
        if (exists) {
          const err = new Error("EMAIL_EXISTS");
          err.code = "EMAIL_EXISTS";
          throw err;
        }

        const newUser = {
          id: crypto.randomUUID(),
          email: emailNormalized,
          password: { salt, hash },
          createdAt: new Date().toISOString(),
        };
        db.users.push(newUser);
        return { id: newUser.id, email: newUser.email };
      });

      return res.status(201).json({ user });
    } catch (err) {
      if (err?.code === "EMAIL_EXISTS") {
        return res.status(409).json({ error: "Email already registered" });
      }
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    const emailNormalized = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!isValidEmail(emailNormalized) || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { user, ok } = await mutateDb(async (db) => {
      const found = db.users.find((u) => u.email === emailNormalized);
      if (!found) return { user: null, ok: false };

      const passwordOk = await verifyPassword(password, found.password);
      if (!passwordOk) return { user: null, ok: false };
      return { user: found, ok: true };
    });

    if (!ok || !user) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const { token } = signJwt(
      { sub: user.id, email: user.email },
      jwtSecret,
      { expiresInSeconds: 60 * 60 * 24 * 7 },
    );

    return res.json({ token, user: { id: user.id, email: user.email } });
  });

  return router;
}

