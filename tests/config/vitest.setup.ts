// vitest.setup.ts
import { config } from 'dotenv';
import path from 'node:path';

// Se for teste, carrega o .env.test
if (process.env.NODE_ENV === 'test') {
  config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  // Caso contrário, carrega o .env padrão
  config();
}