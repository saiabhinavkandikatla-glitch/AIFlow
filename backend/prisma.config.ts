import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url:
      process.env["AIFLOW_DIRECT_URL"] ??
      process.env["SUPABASE_DIRECT_URL"] ??
      process.env["DIRECT_URL"] ??
      process.env["AIFLOW_DATABASE_URL"] ??
      process.env["SUPABASE_DATABASE_URL"] ??
      process.env["DATABASE_URL"]
  }
});
