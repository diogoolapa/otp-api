import buildApp from '../app';
import { disconnectRedis } from '../infra/redis';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function start() {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal?: string) => {
    app.log.info({ signal }, 'Shutting down...');
    try {
      await app.close();
      await disconnectRedis();
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    app.log.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    app.log.error({ err }, 'Unhandled rejection');
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 Server running on http://${HOST}:${PORT}`);
    app.ready().then(() => app.log.info(app.printRoutes()));
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
