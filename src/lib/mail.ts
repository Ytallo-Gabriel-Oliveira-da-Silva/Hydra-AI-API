import nodemailer from "nodemailer";

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "support@hydra-ai.shop";
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

export function buildAppUrl(origin: string) {
  return process.env.APP_URL || origin;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const transporter = getTransport();
  const supportEmail = getSupportEmail();

  await transporter.sendMail({
    from: supportEmail,
    to,
    replyTo: supportEmail,
    subject: "HYDRA AI · Recuperação de senha",
    text: [
      "Recebemos um pedido para redefinir sua senha.",
      "",
      `Abra este link para continuar: ${resetUrl}`,
      "",
      "Se você não fez este pedido, ignore este e-mail.",
      `Suporte: ${supportEmail}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 16px">HYDRA AI · Recuperação de senha</h2>
        <p>Recebemos um pedido para redefinir sua senha.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
            Redefinir senha
          </a>
        </p>
        <p>Se o botão não abrir, use este link:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Se você não fez este pedido, ignore este e-mail.</p>
        <p style="margin-top:24px;color:#475569">Suporte: ${supportEmail}</p>
      </div>
    `,
  });
}

export async function sendSupportTicketEmail({
  name,
  email,
  subject,
  message,
  category,
  ticketCode,
  source,
  origin,
  supportLink,
  ip,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  ticketCode: string;
  source: "hydra" | "api" | "cli" | "cyber";
  origin: string;
  supportLink: string;
  ip: string;
}) {
  const transporter = getTransport();
  const supportEmail = getSupportEmail();

  await transporter.sendMail({
    from: supportEmail,
    to: supportEmail,
    replyTo: email,
    subject: `[HYDRA suporte] ${ticketCode} · ${subject}`,
    text: [
      `Ticket: ${ticketCode}`,
      `Nome: ${name}`,
      `E-mail: ${email}`,
      `Categoria: ${category}`,
      `Origem do site: ${source}`,
      `Origem: ${origin}`,
      `Link de suporte: ${supportLink}`,
      `IP: ${ip}`,
      "",
      message,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 16px">Novo pedido de suporte</h2>
        <p><strong>Ticket:</strong> ${ticketCode}</p>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Categoria:</strong> ${category}</p>
        <p><strong>Origem do site:</strong> ${source}</p>
        <p><strong>Origem:</strong> ${origin}</p>
        <p><strong>Link:</strong> <a href="${supportLink}">${supportLink}</a></p>
        <p><strong>IP:</strong> ${ip}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #cbd5e1" />
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${message}</pre>
      </div>
    `,
  });

  await transporter.sendMail({
    from: supportEmail,
    to: email,
    replyTo: supportEmail,
    subject: `HYDRA suporte recebido · ${ticketCode}`,
    text: [
      `Olá, ${name}.`,
      "",
      "Recebemos seu pedido de suporte com sucesso.",
      `Código do ticket: ${ticketCode}`,
      `Canal/origem: ${source}`,
      "",
      "Nosso suporte retornará para este e-mail cadastrado no formulário.",
      `Central de suporte: ${supportLink}`,
      `Contato: ${supportEmail}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 14px">Chamado recebido com sucesso</h2>
        <p>Olá, <strong>${name}</strong>.</p>
        <p>Seu chamado foi registrado com o código:</p>
        <p style="font-size:18px;font-weight:700;color:#0f766e">${ticketCode}</p>
        <p>Nossa equipe vai retornar para este e-mail cadastrado no formulário.</p>
        <p><strong>Canal:</strong> ${source}</p>
        <p><strong>Suporte:</strong> <a href="${supportLink}">${supportLink}</a></p>
        <p style="margin-top:20px;color:#475569">HYDRA AI · ${supportEmail}</p>
      </div>
    `,
  });
}