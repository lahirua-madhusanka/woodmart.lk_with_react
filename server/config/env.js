import dotenv from "dotenv";

dotenv.config();

const clean = (value) => String(value || "").trim();

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: clean(process.env.CLIENT_URL) || "http://localhost:5173",
  clientUrls: String(process.env.CLIENT_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  smtpHost: clean(process.env.SMTP_HOST),
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: clean(process.env.SMTP_USER),
  smtpPass: clean(process.env.SMTP_PASS),
  smtpFrom: clean(process.env.SMTP_FROM),
  emailDebugLog: String(process.env.EMAIL_DEBUG_LOG || "false").toLowerCase() === "true",
  brevoApiKey: process.env.BREVO_API_KEY || "",
  brevoNewsletterListId: Number(process.env.BREVO_NEWSLETTER_LIST_ID || 0),
};

export default env;
