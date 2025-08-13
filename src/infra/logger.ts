import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';
const isPretty =
  process.env.NODE_ENV !== 'production' &&
  (process.env.LOG_PRETTY ?? 'true') !== 'false'; // default true fora de produção

export const logger = isPretty
  ? pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    })
  : pino({ level });
