import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes; a revoked session can stay valid until this expires
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "github_client_id_placeholder",
      clientSecret:
        process.env.GITHUB_CLIENT_SECRET || "github_client_secret_placeholder",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder",
    },
  },
});
