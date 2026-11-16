import nodemailer from "nodemailer";

export const renderOtpEmailHtml = (otp) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - WhatsApp ChatApp</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background-color: #0b141a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #e9edef;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #111b21;
      border: 1px solid #222e35;
      border-radius: 16px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #00a884;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      color: #e9edef;
      margin: 0 0 12px 0;
    }
    .description {
      font-size: 14px;
      color: #8696a0;
      line-height: 1.6;
      margin: 0 0 28px 0;
    }
    .otp-container {
      background-color: #202c33;
      border: 1px solid #2a3942;
      border-radius: 12px;
      padding: 20px;
      margin: 0 auto 28px auto;
      display: inline-block;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #00a884;
      letter-spacing: 10px;
      margin: 0;
      padding-left: 10px; /* balances letter spacing */
    }
    .expiry {
      font-size: 13px;
      color: #00a884;
      font-weight: 500;
      margin-top: 8px;
    }
    .warning {
      background-color: #182229;
      border-left: 3px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      color: #aebac1;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .footer {
      border-top: 1px solid #222e35;
      padding-top: 20px;
      font-size: 11px;
      color: #667781;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <span>💬 WhatsApp ChatApp</span>
    </div>
    <h1 class="title">Password Reset Code</h1>
    <p class="description">
      We received a request to reset your password. Use the verification code below to complete the reset process:
    </p>

    <div class="otp-container">
      <div class="otp-code">${otp}</div>
      <div class="expiry">⏱ Valid for 10 minutes</div>
    </div>

    <div class="warning">
      <strong>Security notice:</strong> If you did not request a password reset, please ignore this email or review your account settings immediately. Never share this code with anyone.
    </div>

    <div class="footer">
      This is an automated security email from WhatsApp ChatApp.<br>
      Protected with end-to-end security.
    </div>
  </div>
</body>
</html>`;
};

export const sendEmail = async ({ to, subject, text, html, otp }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"WhatsApp ChatApp" <${process.env.EMAIL_USER}>`,
      to,
      subject: subject || "Your Password Reset Code",
      text: text || (otp ? `Your OTP code is: ${otp}. It is valid for 10 minutes.` : ""),
      html: html || (otp ? renderOtpEmailHtml(otp) : undefined),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[SMTP] Email sent successfully:", info.response || info.messageId);
    return info;
  } catch (error) {
    console.error("[SMTP] Error sending email:", error.message || error);
    throw new Error("Could not send email", { cause: error });
  }
};
