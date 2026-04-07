/**
 * Email helper — password reset flow
 * Uses Nodemailer with SMTP (configurable via env vars).
 * Falls back to Ethereal (test) if no SMTP credentials are set.
 */
import nodemailer from "nodemailer";

interface SendResetEmailOptions {
  to: string;
  userName: string;
  resetUrl: string;
  expiresMinutes?: number;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "noreply@incidentsys.local";

  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }),
      from,
    };
  }

  // Development fallback: log to console instead of sending
  return { transporter: null, from };
}

export async function sendPasswordResetEmail(opts: SendResetEmailOptions): Promise<{ sent: boolean; preview?: string }> {
  const { to, userName, resetUrl, expiresMinutes = 10 } = opts;
  const { transporter, from } = createTransporter();

  const subject = "Redefinição de Senha — Incident Security System";
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0d1117;border-bottom:2px solid #00b4d8;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:monospace;font-size:18px;font-weight:700;color:#e6edf3;">
                    🔒 Incident Security System
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#8b949e;font-size:13px;margin:0 0 8px 0;font-family:monospace;letter-spacing:1px;text-transform:uppercase;">REDEFINIÇÃO DE SENHA</p>
            <h2 style="color:#e6edf3;font-size:22px;margin:0 0 16px 0;">Olá, ${userName}!</h2>
            <p style="color:#8b949e;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
              Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color:#e6edf3;">Incident Security System</strong>.
            </p>
            <!-- Alert box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c2128;border:1px solid #f85149;border-radius:6px;margin:0 0 24px 0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="color:#f85149;font-size:13px;font-weight:700;margin:0 0 6px 0;font-family:monospace;">⚠ ATENÇÃO — LINK COM VALIDADE LIMITADA</p>
                  <p style="color:#8b949e;font-size:13px;margin:0;line-height:1.5;">
                    Este link é válido por apenas <strong style="color:#e6edf3;">${expiresMinutes} minutos</strong> a partir do momento em que este e-mail foi enviado. Após esse prazo, o link expirará e uma nova solicitação será necessária.
                  </p>
                </td>
              </tr>
            </table>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display:inline-block;background:#00b4d8;color:#0d1117;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:6px;font-family:monospace;">
                    Redefinir Minha Senha
                  </a>
                </td>
              </tr>
            </table>
            <!-- URL fallback -->
            <p style="color:#8b949e;font-size:12px;margin:0 0 8px 0;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="background:#0d1117;border:1px solid #21262d;border-radius:4px;padding:10px 12px;font-family:monospace;font-size:11px;color:#00b4d8;word-break:break-all;margin:0 0 24px 0;">${resetUrl}</p>
            <!-- Security note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;border:1px solid #21262d;border-radius:6px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="color:#8b949e;font-size:12px;margin:0;line-height:1.6;">
                    🔐 <strong style="color:#e6edf3;">Não solicitou esta redefinição?</strong><br>
                    Ignore este e-mail com segurança. Sua senha atual permanece inalterada. Se você suspeita de acesso não autorizado, entre em contato com o administrador do sistema.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0d1117;border-top:1px solid #21262d;padding:16px 32px;">
            <p style="color:#30363d;font-size:11px;margin:0;font-family:monospace;text-align:center;">
              Incident Security System · ICOMP 2025/2026 · Este é um e-mail automático, não responda.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Redefinição de Senha — Incident Security System\n\nOlá, ${userName}!\n\nClique no link abaixo para redefinir sua senha:\n${resetUrl}\n\nATENÇÃO: Este link é válido por apenas ${expiresMinutes} minutos.\n\nSe você não solicitou esta redefinição, ignore este e-mail.`;

  if (!transporter) {
    // Dev mode: log to console
    console.log("\n========== PASSWORD RESET EMAIL (DEV MODE) ==========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Expires in: ${expiresMinutes} minutes`);
    console.log("=====================================================\n");
    return { sent: true, preview: resetUrl };
  }

  const info = await transporter.sendMail({
    from: `"Incident Security System" <${from}>`,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, preview: nodemailer.getTestMessageUrl(info) || undefined };
}
