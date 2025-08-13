# OTP API (Node.js + Fastify + Redis)

API para geração e validação de OTP com métricas Prometheus, Swagger e envio por e‑mail (Resend).  
Em **development**, o OTP é **logado no console**; em **production**, o Mailer tenta enviar por e‑mail e faz fallback para log se falhar.

## Endpoints

- Health: `GET /otp/health`
- Swagger UI: `GET /otp/docs` | Spec: `/otp/docs/json`
- Métricas: `GET /otp/metrics`
- Gerar OTP: `POST /otp/request`
  ```json
  { "identifier": "user@example.com", "channel": "email" }
  ```
