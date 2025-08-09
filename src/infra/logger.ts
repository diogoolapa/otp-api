import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: null, // tira pid/hostname do output pra facilitar ver no vitest
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty', // garanta: pnpm add -D pino-pretty
        options: {
          translateTime: 'HH:MM:ss',
          singleLine: true,
        },
      },
});
