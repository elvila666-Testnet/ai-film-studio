import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try resolving .env from process.cwd() (best for standard scripts and dist runs)
let envPath = path.join(process.cwd(), ".env");

// Fallback to relative path if not running from workspace root
if (!fs.existsSync(envPath)) {
  const possiblePaths = [
    path.resolve(__dirname, "../../.env"), // tsx dev: server/_core -> workspace root
    path.resolve(__dirname, "../.env"),    // dist build: dist -> workspace root
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }
}

dotenv.config({ path: envPath });

export const ENV = {
  appId: (process.env.VITE_APP_ID ?? "").trim(),
  cookieSecret: (process.env.JWT_SECRET ?? "").trim(),
  databaseUrl: (process.env.DATABASE_URL ?? "").trim(),
  oAuthServerUrl: (process.env.OAUTH_SERVER_URL ?? "").trim(),
  ownerOpenId: (process.env.OWNER_OPEN_ID ?? "").trim(),
  ownerEmail: (process.env.OWNER_EMAIL ?? "elvila@gmail.com").trim(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: (process.env.BUILT_IN_FORGE_API_URL ?? "").trim(),
  forgeApiKey: (process.env.BUILT_IN_FORGE_API_KEY ?? "").trim(),
  soraApiKey: (process.env.SORA_API_KEY ?? "").trim(),
  veo3ApiKey: (process.env.VEO3_API_KEY ?? "").trim(),
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
  googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  openaiApiKey: (process.env.OPENAI_API_KEY ?? "").trim(),
  kieApiKey: (process.env.KIE_API_KEY ?? "").trim(),
  gcsBucketName: (process.env.GCS_BUCKET_NAME ?? "").trim(),
  gcpProjectId: (process.env.GCP_PROJECT_ID ?? "").trim(),
  // Stripe
  stripeSecretKey: (process.env.STRIPE_SECRET_KEY ?? "").trim(),
  stripeWebhookSecret: (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim(),
  stripeStarterPriceId: (process.env.STRIPE_STARTER_PRICE_ID ?? "").trim(),
  stripeProPriceId: (process.env.STRIPE_PRO_PRICE_ID ?? "").trim(),
  stripeEnterprisePriceId: (process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "").trim(),
  get gcsConfigured() {
    return !!this.gcsBucketName && !!this.gcpProjectId;
  },
  get stripeConfigured() {
    return !!this.stripeSecretKey;
  }
};

console.log("--- [Env] Environment Initialized ---");
console.log(`[Env] GCS Bucket: ${ENV.gcsBucketName || "MISSING"}`);
console.log(`[Env] GCS Project: ${ENV.gcpProjectId || "MISSING"}`);
console.log(`[Env] CWD: ${process.cwd()}`);
console.log("-------------------------------------");
