import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

import httpx

from app.config import settings

logger = logging.getLogger("plant_aid.otp_service")
logging.basicConfig(level=logging.INFO)

OTP_SUBJECT = "Your Plant-Aid Verification Code"
PASSWORD_RESET_SUBJECT = "Your Plant-Aid Password Reset Code"

PURPOSE_SUBJECTS = {
    "verification": OTP_SUBJECT,
    "password_reset": PASSWORD_RESET_SUBJECT,
}


class OTPService:
    @property
    def provider(self) -> str:
        return settings.OTP_PROVIDER.lower()

    def _build_email_content(self, otp_code: str, purpose: str = "verification") -> tuple[str, str]:
        """Constructs plain-text and responsive branded HTML email bodies."""
        is_reset = purpose == "password_reset"
        headline = "Password Reset" if is_reset else "Account Verification"
        action_line = (
            "Use the one-time passcode below to reset your account password. For security "
            "purposes, this code is valid for"
            if is_reset
            else "Use the one-time passcode below to complete your authentication. For security purposes, this code is valid for"
        )

        text_body = (
            f"Plant-Aid Security Verification\n\n"
            f"Your {'password reset' if is_reset else 'verification'} code is: {otp_code}\n\n"
            f"This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n"
            f"If you did not request this code, please ignore this email"
            + (" and your password will remain unchanged." if is_reset else ".")
            + "\n"
        )

        subject = PURPOSE_SUBJECTS.get(purpose, OTP_SUBJECT)
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 25px rgba(22, 101, 52, 0.08); overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #15803d; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🌱 Plant-Aid</h1>
              <p style="margin: 4px 0 0; color: #bbf7d0; font-size: 13px; font-weight: 500;">Real-Time Crop Disease Diagnostic</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a;">{headline}</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                {action_line} <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.
              </p>
              <!-- Code Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 14px; padding: 20px 24px; text-align: center; display: inline-block;">
                      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #14532d;">{otp_code}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Never share this verification code with anyone. Plant-Aid staff will never ask for your code.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                If you did not request this code, no action is needed. Your account remains safe.<br>
                © Plant-Aid Agronomic Technologies
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
        return text_body, html_body

    def send_otp(self, destination: str, otp_code: str, purpose: str = "verification") -> bool:
        """
        Dispatches the 2FA/reset OTP to the user.

        `destination` is a phone number or an email address; the channel is derived from it
        (an '@' means email), and the configured provider decides the transport.
        `purpose` selects the email copy ("verification" or "password_reset").
        """
        channel = "email" if "@" in destination else "sms"
        provider = self.provider

        if provider == "console":
            return self._send_console(destination, otp_code, channel)
        if provider == "gas":
            if channel == "email":
                return self._send_gas_email(destination, otp_code, purpose)
            logger.error("OTP provider 'gas' does not support SMS transport.")
            return self._fallback_to_console(destination, otp_code, channel)
        if provider == "smtp":
            if channel == "email":
                if getattr(settings, "GAS_WEBHOOK_URL", "").strip():
                    return self._send_gas_email(destination, otp_code, purpose)
                return self._send_smtp_email(destination, otp_code, purpose)
            logger.error("OTP provider 'smtp' does not support SMS transport.")
            return self._fallback_to_console(destination, otp_code, channel)
        if provider == "resend":
            if channel == "email":
                return self._send_resend_email(destination, otp_code, purpose)
            logger.error("OTP provider 'resend' does not support SMS transport.")
            return self._fallback_to_console(destination, otp_code, channel)
        if provider == "twilio":
            if channel == "sms":
                return self._send_twilio_sms(destination, otp_code)
            logger.error("OTP provider 'twilio' does not support email transport.")
            return self._fallback_to_console(destination, otp_code, channel)
        if provider == "sendgrid":
            if channel == "email":
                return self._send_sendgrid_email(destination, otp_code, purpose)
            logger.error("OTP provider 'sendgrid' does not support SMS transport.")
            return self._fallback_to_console(destination, otp_code, channel)

        logger.error("Unknown OTP provider '%s'; no transport available.", provider)
        return self._fallback_to_console(destination, otp_code, channel)

    def _send_console(self, destination: str, otp_code: str, channel: str) -> bool:
        logger.info(
            f"\n"
            f"====================================================\n"
            f"[2FA OTP DISPATCH — {channel.upper()}]\n"
            f"To: {destination}\n"
            f"Your Plant-Aid Verification Code is: {otp_code}\n"
            f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes.\n"
            f"===================================================="
        )
        return True

    def _fallback_to_console(
        self, destination: str, otp_code: str, channel: str
    ) -> bool:
        """Last resort when a provider fails or credentials are unconfigured."""
        if settings.OTP_ALLOW_CONSOLE_FALLBACK:
            logger.warning(
                "Falling back to console OTP dispatch (OTP_ALLOW_CONSOLE_FALLBACK=true)."
            )
            return self._send_console(destination, otp_code, channel)
        logger.error("OTP not delivered; provider dispatch failed.")
        return False

    def _send_gas_email(self, email: str, otp_code: str, purpose: str = "verification") -> bool:
        webhook_url = getattr(settings, "GAS_WEBHOOK_URL", "").strip()
        if not webhook_url:
            logger.warning("GAS_WEBHOOK_URL not configured; cannot dispatch via Google Apps Script.")
            return self._fallback_to_console(email, otp_code, "email")

        text_body, html_body = self._build_email_content(otp_code, purpose)
        subject = PURPOSE_SUBJECTS.get(purpose, OTP_SUBJECT)
        payload = {
            "to": email,
            "subject": f"{subject}: {otp_code}",
            "text": text_body,
            "html": html_body,
            "senderName": settings.SMTP_FROM_NAME,
        }
        try:
            with httpx.Client(timeout=25.0, follow_redirects=True) as client:
                res = client.post(webhook_url, json=payload)
                res.raise_for_status()
                logger.info("Successfully dispatched OTP email via GAS HTTPS relay to %s", email)
                return True
        except Exception as exc:
            logger.error("Failed to send OTP email via GAS HTTPS relay: %s", exc)
            return self._fallback_to_console(email, otp_code, "email")

    def _send_smtp_email(self, email: str, otp_code: str, purpose: str = "verification") -> bool:
        if not (settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD):
            logger.warning(
                "SMTP credentials not fully configured; cannot send real email."
            )
            return self._fallback_to_console(email, otp_code, "email")

        text_body, html_body = self._build_email_content(otp_code, purpose)
        subject = PURPOSE_SUBJECTS.get(purpose, OTP_SUBJECT)
        message = EmailMessage()
        message["Subject"] = f"{subject}: {otp_code}"
        message["From"] = formataddr(
            (settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL)
        )
        message["To"] = email
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        try:
            if settings.SMTP_USE_STARTTLS:
                with smtplib.SMTP(
                    settings.SMTP_HOST,
                    settings.SMTP_PORT,
                    timeout=settings.SMTP_TIMEOUT_SECONDS,
                ) as server:
                    server.ehlo()
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(message)
            else:
                with smtplib.SMTP_SSL(
                    settings.SMTP_HOST,
                    settings.SMTP_PORT,
                    timeout=settings.SMTP_TIMEOUT_SECONDS,
                ) as server:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(message)
            logger.info("Successfully dispatched OTP email via SMTP to %s", email)
            return True
        except (smtplib.SMTPException, OSError) as exc:
            logger.error("Failed to send OTP email via SMTP: %s", exc)
            if getattr(settings, "GAS_WEBHOOK_URL", "").strip():
                return self._send_gas_email(email, otp_code, purpose)
            return self._fallback_to_console(email, otp_code, "email")

    def _send_resend_email(self, email: str, otp_code: str, purpose: str = "verification") -> bool:
        if not settings.RESEND_API_KEY:
            logger.warning(
                "Resend API key missing; cannot dispatch via Resend."
            )
            return self._fallback_to_console(email, otp_code, "email")

        text_body, html_body = self._build_email_content(otp_code, purpose)
        subject = PURPOSE_SUBJECTS.get(purpose, OTP_SUBJECT)
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": f"{settings.SMTP_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
            "to": [email],
            "subject": f"{subject}: {otp_code}",
            "html": html_body,
            "text": text_body,
        }
        try:
            with httpx.Client(timeout=settings.SMTP_TIMEOUT_SECONDS) as client:
                res = client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                logger.info("Successfully dispatched OTP email via Resend to %s", email)
                return True
        except Exception as exc:
            logger.error("Failed to send OTP email via Resend: %s", exc)
            return self._fallback_to_console(email, otp_code, "email")

    def _send_twilio_sms(self, phone: str, otp_code: str) -> bool:
        if not (
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_PHONE_NUMBER
        ):
            logger.warning(
                "Twilio credentials incomplete, falling back to console dispatch."
            )
            return self._fallback_to_console(phone, otp_code, "sms")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        data = {
            "From": settings.TWILIO_PHONE_NUMBER,
            "To": phone,
            "Body": f"Your Plant-Aid 2FA verification code is: {otp_code}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes.",
        }
        try:
            with httpx.Client(timeout=settings.SMTP_TIMEOUT_SECONDS) as client:
                res = client.post(
                    url,
                    data=data,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                )
                res.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to send Twilio SMS: {e}")
            return self._fallback_to_console(phone, otp_code, "sms")

    def _send_sendgrid_email(self, email: str, otp_code: str, purpose: str = "verification") -> bool:
        if not settings.SENDGRID_API_KEY:
            logger.warning(
                "SendGrid API key missing, falling back to console dispatch."
            )
            return self._fallback_to_console(email, otp_code, "email")

        text_body, html_body = self._build_email_content(otp_code, purpose)
        subject = PURPOSE_SUBJECTS.get(purpose, OTP_SUBJECT)
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "personalizations": [{"to": [{"email": email}]}],
            "from": {
                "email": settings.SENDGRID_FROM_EMAIL,
                "name": settings.SMTP_FROM_NAME,
            },
            "subject": f"{subject}: {otp_code}",
            "content": [
                {
                    "type": "text/html",
                    "value": html_body,
                }
            ],
        }
        try:
            with httpx.Client(timeout=settings.SMTP_TIMEOUT_SECONDS) as client:
                res = client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to send SendGrid email: {e}")
            return self._fallback_to_console(email, otp_code, "email")


otp_service = OTPService()
