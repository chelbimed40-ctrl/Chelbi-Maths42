import nodemailer from "nodemailer";

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

export function emailIsConfigured() {
  return !!smtpConfig();
}

export async function sendTeacherResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const cfg = smtpConfig();
  if (!cfg) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject: "استرجاع كلمة المرور — النجاح في الرياضيات",
    text:
      `مرحبًا،\n\n` +
      `لقد تلقينا طلبًا لإعادة تعيين كلمة مرور حساب الأستاذ محمد شلبي.\n` +
      `استخدم الرابط التالي خلال 30 دقيقة:\n\n${resetUrl}\n\n` +
      `إذا لم تطلب هذا الإجراء، تجاهل هذه الرسالة.`,
    html: `
      <div dir="rtl" style="font-family:Cairo,Tajawal,Arial,sans-serif;background:#faf7ef;padding:24px;color:#1c1917">
        <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:24px;padding:32px">
          <h1 style="margin:0 0 12px;font-size:28px;color:#17140c">استرجاع كلمة المرور</h1>
          <p style="margin:0 0 16px;line-height:1.9;font-weight:700;color:#57534e">
            تلقّينا طلبًا لإعادة تعيين كلمة مرور حساب <strong>الأستاذ محمد شلبي</strong> في منصة <strong>النجاح في الرياضيات</strong>.
          </p>
          <p style="margin:0 0 20px;line-height:1.9;color:#78716c">
            اضغط الزر التالي خلال <strong>30 دقيقة</strong> لإنشاء كلمة مرور جديدة:
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f2d47e);color:#241a02;text-decoration:none;font-weight:900;padding:14px 24px;border-radius:16px">
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <p style="font-size:12px;color:#a8a29e;line-height:1.8">
            أو انسخ هذا الرابط والصقه في المتصفح:<br/>
            <span dir="ltr" style="display:inline-block;color:#57534e">${resetUrl}</span>
          </p>
          <p style="font-size:12px;color:#a8a29e;line-height:1.8;margin-top:16px">
            إذا لم تطلب هذا الإجراء، فتجاهل الرسالة ولن يتم تغيير شيء.
          </p>
        </div>
      </div>
    `,
  });
}
