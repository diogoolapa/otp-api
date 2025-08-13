// src/infra/mailer.ts
import { Resend } from "resend";

export type SendOtpEmailInput = {
  to: string;
  code: string;
  expiresAt: Date;
  appName?: string;
  subject?: string;
};

function otpEmailHtml({
  code,
  expiresAt,
  appName = "OTP API",
}: {
  code: string;
  expiresAt: Date;
  appName?: string;
}) {
  const exp = expiresAt.toLocaleString("pt-BR");
  return `
    <div style="font-family:system-ui,Arial,sans-serif;line-height:1.5">
      <h1 style="color:#0f4c81;margin-bottom:4px;">OTP - Desafio Técnico BTG</h1>
      <p>Use o código abaixo para concluir sua operação:</p>
      <p style="font-size:28px;letter-spacing:6px;margin:16px 0"><strong>${code}</strong></p>
      <p>Validade: <strong>${exp}</strong></p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <small>Desenvolvido por <strong>Diogo Lapa</strong></small>
    </div>`;
}

function otpEmailText({ code, expiresAt }: { code: string; expiresAt: Date }) {
  const exp = expiresAt.toLocaleString("pt-BR");
  return `OTP - Desafio Técnico BTG
Código: ${code}
Validade: ${exp}

Desenvolvido por Diogo Lapa`;
}

export class Mailer {
  private readonly client: Resend;
  private readonly from: string;

  constructor(params?: { apiKey?: string; from?: string }) {
    const apiKey = params?.apiKey ?? process.env.RESEND_API_KEY;
    const from =
      params?.from ?? process.env.MAIL_FROM ?? "onboarding@resend.dev";
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async sendOtpEmail({
    to,
    code,
    expiresAt,
    appName,
    subject,
  }: SendOtpEmailInput) {
    const maxAttempts = 3;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.client.emails.send({
          from: this.from,
          to,
          subject: subject ?? "Seu código OTP",
          html: otpEmailHtml({ code, expiresAt }),
          text: otpEmailText({ code, expiresAt }),
        });

        // SDK v4 retorna { data, error }
        if ((res as any)?.error) throw (res as any).error;
        return;
      } catch (e) {
        lastErr = e;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
        }
      }
    }
    throw lastErr;
  }
}
