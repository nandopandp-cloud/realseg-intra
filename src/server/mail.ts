import { getDb } from "./db/client";
import { mailOutbox } from "./db/schema";
import { env } from "./env";
import { logger } from "./logger";

export type MailMessage = { to: string; subject: string; text: string };

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Dev/teste: grava em mail_outbox (ADR-0008). Recusado em produção pela validação de env. */
const outboxMailer: Mailer = {
  async send(message) {
    await getDb().insert(mailOutbox).values(message);
    logger.info("mail.outbox_stored", { subjectLength: message.subject.length });
  },
};

let smtp: Mailer | undefined;
async function smtpMailer(): Promise<Mailer> {
  if (smtp) return smtp;
  const nodemailer = await import("nodemailer");
  const e = env();
  const transport = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  smtp = {
    async send(message) {
      await transport.sendMail({ from: e.MAIL_FROM, to: message.to, subject: message.subject, text: message.text });
    },
  };
  return smtp;
}

export async function getMailer(): Promise<Mailer> {
  return env().MAIL_DRIVER === "smtp" ? smtpMailer() : outboxMailer;
}
