import { z } from "zod/v4";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Email
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // LBP API (MBIE)
  LBP_API_BASE_URL: z.string().url().optional(),
  LBP_API_KEY: z.string().optional(),

  // Badge CDN
  BADGE_CDN_URL: z.string().url().optional(),

  // Cron secret for securing cron endpoints
  CRON_SECRET: z.string().min(32, { message: "CRON_SECRET must be at least 32 characters for security" }),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

// Only validate on server side
function validateEnv() {
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof envSchema>;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
