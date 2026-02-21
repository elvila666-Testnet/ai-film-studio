import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";
import { COOKIE_NAME } from "@shared/const";
import { upsertUser, getUserByEmail } from "../db";

const router = express.Router();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const JWT_SECRET = ENV.cookieSecret || "your-secret-key-change-in-production";

const getRedirectUri = (req: express.Request) => {
    const host = req.get("host");
    const protocol = host?.includes("localhost") || host?.includes("127.0.0.1") ? req.protocol : "https";
    return `${protocol}://${host}/api/auth/google/callback`;
};

// Get Google Auth URL
router.get("/url", (req, res) => {
    const rootUrl = GOOGLE_AUTH_URL;
    const options = {
        redirect_uri: getRedirectUri(req),
        client_id: ENV.googleClientId,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
});

// Callback handler
router.get("/callback", async (req, res) => {
    const code = req.query.code as string;

    try {
        // Exchange code for tokens
        const { data: tokens } = await axios.post(GOOGLE_TOKEN_URL, {
            code,
            client_id: ENV.googleClientId,
            client_secret: ENV.googleClientSecret,
            redirect_uri: getRedirectUri(req),
            grant_type: "authorization_code",
        });

        // Get user info from Google
        const { data: googleUser } = await axios.get(GOOGLE_USER_INFO_URL, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        if (!googleUser.email_verified) {
            return res.status(403).send("Google account not verified");
        }

        // Upsert user in our database
        await upsertUser({
            openId: `google_${googleUser.sub}`,
            email: googleUser.email,
            name: googleUser.name,
            loginMethod: "google",
            lastSignedIn: new Date(),
        });

        const dbUser = await getUserByEmail(googleUser.email);
        if (!dbUser) {
            throw new Error("Failed to retrieve user after upsert");
        }

        // Create session token
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
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Redirect back to original app
        res.redirect("/");
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.redirect("/login?error=google_auth_failed");
    }
});

export default router;
