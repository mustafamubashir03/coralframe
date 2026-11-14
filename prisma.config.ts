// For Prisma CLI migrations: direct (unpooled) Neon endpoint.
// Also used when running `pnpm prisma migrate dev` locally.
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
