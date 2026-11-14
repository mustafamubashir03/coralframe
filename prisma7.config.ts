// Prisma configuration uses a direct (unpooled) connection for migrations
// to avoid advisory-lock and transaction timeouts on Neon's pooler.
// The app itself keeps using the pooled DATABASE_URL via lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env["DATABASE_URL"],
  },
});
