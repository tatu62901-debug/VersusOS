import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: "postgresql://neondb_owner:npg_xJHW4BuNMQs2@ep-lucky-mud-b80bx79p.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
});
