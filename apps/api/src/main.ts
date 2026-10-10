import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createApp } from './app';
config({ path: process.env.ENV_FILE || resolve(process.cwd(), '../../.env'), quiet: true });
async function main() {
  const app = await createApp();
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3333), process.env.HOST || '0.0.0.0');
  console.log(`Entrega API: http://localhost:${process.env.PORT || 3333}/docs`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
