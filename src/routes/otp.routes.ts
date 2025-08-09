import { FastifyInstance } from 'fastify';
import { handleOtpRequest, handleOtpVerify } from '../controllers/otp.controller';

export async function otpRoutes(app: FastifyInstance) {
  app.post('/otp/request', handleOtpRequest);
  app.post('/otp/verify',  handleOtpVerify);
}