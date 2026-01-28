import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    async url() {
      return process.env.DATABASE_URL!;
    },
  },
});
