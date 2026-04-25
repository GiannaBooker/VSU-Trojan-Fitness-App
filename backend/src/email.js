import sgMail from "@sendgrid/mail";

function isDev() {
  return (process.env.NODE_ENV || "development") !== "production";
}

export async function sendVerificationCodeEmail({ to, code }) {
  const service = (process.env.EMAIL_SERVICE || "").toLowerCase();
  if (!service) {
    return { sent: false, reason: "EMAIL_SERVICE not set" };
  }

  if (service !== "sendgrid") {
    return { sent: false, reason: `Unsupported EMAIL_SERVICE: ${service}` };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "Missing SENDGRID_API_KEY or EMAIL_FROM" };
  }

  sgMail.setApiKey(apiKey);

  const subject = "Verify your email";
  const text = `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`;

  try {
    await sgMail.send({
      to,
      from,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    if (isDev()) {
      console.error("[email] sendgrid send failed:", err?.message || err);
    }
    return { sent: false, reason: "Send failed" };
  }
}

