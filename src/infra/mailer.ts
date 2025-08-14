import { Resend } from "resend";
import { logger } from "./logger";

type Mode = "resend" | "console";

export class Mailer {
  private client?: Resend;
  private from: string;
  private mode: Mode;

  constructor(params?: { apiKey?: string; from?: string }) {
    const apiKey = params?.apiKey ?? process.env.RESEND_API_KEY;
    const from =
      params?.from ?? process.env.MAIL_FROM ?? "onboarding@resend.dev";
    const env = process.env.NODE_ENV ?? "development";

    this.from = from;

    if (env === "production") {
      // Em produção, a chave é obrigatória.
      if (!apiKey) {
        throw new Error("RESEND_API_KEY não configurada");
      }
      this.client = new Resend(apiKey);
      this.mode = "resend";
    } else {
      // Fora de produção: usa Resend se tiver chave; caso contrário, modo console.
      if (apiKey) {
        this.client = new Resend(apiKey);
        this.mode = "resend";
      } else {
        this.mode = "console";
        logger.warn(
          "[Mailer] RESEND_API_KEY ausente — usando modo console (mock)",
        );
      }
    }
  }

  async sendOtpEmail(to: string, code: string) {
    const subject = "OTP - Desafio Técnico BTG";
    const html = `
      <div style="font-family: Arial, sans-serif">
        <h2 style="margin:0 0 12px">Seu código OTP</h2>
        <p style="font-size:16px">Código: <strong>${code}</strong></p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
        <small>Desenvolvido por Diogo Lapa</small>
      </div>
    `.trim();

    if (this.mode === "console") {
      logger.info(
        { op: "mailer:mock_send", to, subject, code },
        "Simulando envio de e-mail",
      );
      return { id: "mock" };
    }

    return this.client!.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
  }
}
