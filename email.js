/**
 * Email utility for KO-TI.
 * Uses nodemailer with SMTP config from environment variables.
 * Falls back to console logging in development when SMTP is not configured.
 */
require("dotenv").config();
const nodemailer = require("nodemailer");

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  // Verify connection on startup
  transporter.verify((err) => {
    if (err) console.error("⚠️  SMTP connection failed:", err.message);
    else console.log("✅ SMTP connected");
  });
} else {
  console.log("⚠️  No SMTP configured — emails will be logged to console");
}

/**
 * Send an email.
 * @param {Object} opts - { to, subject, html }
 */
async function sendMail({ to, subject, html }) {
  const from = process.env.SMTP_FROM || "KOTI Pet Shop <noreply@koti.com>";

  if (transporter) {
    return transporter.sendMail({ from, to, subject, html });
  }

  // Development fallback: log to console
  console.log(`\n📧 Email (dev mode):`);
  console.log(`   From:    ${from}`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body:    ${html}\n`);
}

/**
 * Order confirmation email template.
 */
function orderConfirmationEmail(order) {
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${i.name}</td>
         <td style="padding:8px;border-bottom:1px solid #eee;">${i.quantity}</td>
         <td style="padding:8px;border-bottom:1px solid #eee;">$${parseFloat(i.price).toFixed(2)}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#ff6b35;">🐾 Order Confirmed!</h2>
      <p>Hi ${order.name},</p>
      <p>Your payment has been confirmed. Here's your order summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:10px;text-align:left;">Product</th>
            <th style="padding:10px;text-align:left;">Qty</th>
            <th style="padding:10px;text-align:left;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total: $${parseFloat(order.total).toFixed(2)}</strong></p>
      <p>Shipping to: ${order.address}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#888;font-size:12px;">Thank you for shopping with KOTI Pet Shop!</p>
    </div>
  `;
}

/**
 * Password reset email template.
 */
function passwordResetEmail(resetUrl) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#ff6b35;">🐾 Password Reset</h2>
      <p>You requested a password reset for your KOTI account.</p>
      <p>Click the button below to set a new password. This link expires in 1 hour.</p>
      <p style="text-align:center;margin:30px 0;">
        <a href="${resetUrl}" style="background:#ff6b35;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Reset Password
        </a>
      </p>
      <p style="color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

module.exports = { sendMail, orderConfirmationEmail, passwordResetEmail };
