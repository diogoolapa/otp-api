import { otpRequests, otpVerifyOk, otpVerifyFail, rateLimitHits } from '../../infra/metrics';

export const Metrics = {
  incOtpRequest:   () => otpRequests.inc(),
  incOtpVerifyOk:  () => otpVerifyOk.inc(),
  incOtpVerifyFail:() => otpVerifyFail.inc(),
  incRateLimitHit: () => rateLimitHits.inc(),
};
