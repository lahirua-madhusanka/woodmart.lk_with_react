import dotenv from "dotenv";

dotenv.config();

const clean = (value) => String(value || "").trim();
const nodeEnv = process.env.NODE_ENV || "development";

const configuredClientUrl = clean(process.env.CLIENT_URL);
const configuredClientUrls = String(process.env.CLIENT_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultDevClientUrls = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

const clientUrl = configuredClientUrl || "http://localhost:5173";
const clientUrls = Array.from(
  new Set([
    ...configuredClientUrls,
    ...(nodeEnv === "development" ? defaultDevClientUrls : []),
  ])
);

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl,
  clientUrls,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  smtpHost: clean(process.env.SMTP_HOST),
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: clean(process.env.SMTP_USER),
  smtpPass: clean(process.env.SMTP_PASS),
  smtpFrom: clean(process.env.SMTP_FROM),
  emailDebugLog: String(process.env.EMAIL_DEBUG_LOG || "false").toLowerCase() === "true",
  brevoApiKey: process.env.BREVO_API_KEY || "",
  brevoSenderEmail: clean(process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER),
  brevoSenderName: clean(process.env.BREVO_SENDER_NAME || "Woodmart.lk"),
  orderEmailBrandName: clean(process.env.ORDER_EMAIL_BRAND_NAME || process.env.BREVO_SENDER_NAME || "Woodmart.lk"),
  orderEmailSupportEmail: clean(process.env.ORDER_EMAIL_SUPPORT_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER),
  emailVerificationTtlHours: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 1),
  brevoNewsletterListId: Number(process.env.BREVO_NEWSLETTER_LIST_ID || 0),
};

export default env;
