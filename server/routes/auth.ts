import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getUserByEmail, upsertUser, getDb } from "../db";
import { users as dbUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "../_core/env";

const router = express.Router();

// Password store for placeholder login (since we don't store passwords in DB yet)
const passwordStore = new Map<string, string>();
const nameStore = new Map<string, string>();

// Default admin setup
const ADMIN_EMAIL = "admin@filmstudio.ai";
const DEFAULT_PASSWORD = "admin123";
passwordStore.set(ADMIN_EMAIL, bcrypt.hashSync(DEFAULT_PASSWORD, 10));
nameStore.set(ADMIN_EMAIL, "Admin User");

async function ensureUserInDb(email: string) {
    const existing = await getUserByEmail(email);
    if (!existing) {
        await upsertUser({
            openId: `placeholder_${email}`,
            email: email,
            name: nameStore.get(email) || email.split('@')[0],
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            loginMethod: 'placeholder'
        });
        return await getUserByEmail(email);
    }
    return existing;
}

const JWT_SECRET = ENV.cookieSecret || "your-secret-key-change-in-production";

// Login endpoint
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const lowerEmail = email.toLowerCase();
        const hashedPassword = passwordStore.get(lowerEmail);

        if (!hashedPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Ensure user exists in MySQL DB and get their actual ID
        const dbUser = await ensureUserInDb(lowerEmail);
        if (!dbUser) {
            return res.status(500).json({ error: "Failed to sync user with database" });
        }

        // Create JWT token with DB ID
        const token = jwt.sign(
            { id: dbUser.id, email: dbUser.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Set cookie
        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            success: true,
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Logout endpoint
router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
});

// Get current user
router.get("/me", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.json({ user: null });
    }

    try {
        let user: any = null;

        // Try standard JWT
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
            const db = await getDb();
            if (db) {
                const result = await db.select().from(dbUsers).where(eq(dbUsers.id, decoded.id)).limit(1);
                user = result[0];
            }
        } catch (jwtErr) {
            user = null;
        }

        if (!user) {
            return res.json({ user: null });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        res.json({ user: null });
    }
});

// Admin: List all users
router.get("/admin/users", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

        // Only admin can list users
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const db = await getDb();
        if (!db) return res.status(500).json({ error: "Database not available" });

        const userList = await db.select().from(dbUsers);

        res.json({ users: userList });
    } catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// Admin: Create user
router.post("/admin/users", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

        // Only admin can create users
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Email, password, and name required" });
        }

        const lowerEmail = email.toLowerCase();
        if (passwordStore.has(lowerEmail)) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        passwordStore.set(lowerEmail, hashedPassword);
        nameStore.set(lowerEmail, name);

        const dbUser = await ensureUserInDb(lowerEmail);

        res.json({
            success: true,
            user: {
                id: dbUser?.id,
                email: dbUser?.email,
                name: dbUser?.name,
            },
        });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Admin: Delete user
router.delete("/admin/users/:email", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

        // Only admin can delete users
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { email } = req.params;
        const lowerEmail = email.toLowerCase();

        if (lowerEmail === ADMIN_EMAIL) {
            return res.status(400).json({ error: "Cannot delete admin user" });
        }

        passwordStore.delete(lowerEmail);
        nameStore.delete(lowerEmail);

        const db = await getDb();
        if (db) {
            await db.delete(dbUsers).where(eq(dbUsers.email, lowerEmail));
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
