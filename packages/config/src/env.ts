import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database (Prisma)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Groq (IA gratuita — Llama 3)
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().default("llama3-70b-8192"),

  // Worker
  WORKER_SECRET: z.string().default("prospectai-worker-secret-2025"),

  // OpenStreetMap — sem chave necessaria
  OSM_OVERPASS_URL: z.string().url().default("https://overpass-api.de/api/interpreter"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
