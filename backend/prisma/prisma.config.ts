import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async resolveUrl() {
      const { config } = await import('dotenv');
      config();
      return process.env.DATABASE_URL!;
    },
  },
});
