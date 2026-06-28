import os
import httpx
from app.core.config import settings

RESEND_API_URL = "https://api.resend.com/emails"

def get_sandbox_recipients(recipient_email: str) -> list[str]:
    
    return ["shubhtech1056@gmail.com"]

async def send_magic_link(to: str, link: str, role: str):
    """Send magic link email via Resend."""
    
    subject, body = _build_email(role, link)

    # always prints
    print("\n" + "="*60)
    print(f"  ðŸ“§ [{role.upper()}] MAGIC LINK")
    print(f"  To (Original):   {to}")
    print("="*60 + "\n")

    
    # If no real API key, just print to console (dev mode)
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_your"):
        print("Resend isn't configured")
        print(f"\n{'='*50}")
        print(f"[DEV MODE] Magic link for {role}: {to}")
        print(f"Link: {link}")
        print(f"{'='*50}\n")
        return

    sandbox_recipients = get_sandbox_recipients(to)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "onboarding@resend.dev",
                "to": sandbox_recipients,
                "subject": subject,
                "html": body,
            },
        )
        if response.status_code not in (200, 201):
            print(f"[EMAIL ERROR] Failed to send to {sandbox_recipients}: {response.text}")


def _build_email(role: str, link: str) -> tuple[str, str]:
    if role == "evaluator":
        subject = "Your Evaluator Access Link â€” HackSmart"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7dbbff;">You've been invited as an Evaluator</h2>
            <p>You have been assigned submissions to evaluate for the hackathon.</p>
            <p>Click the button below to access your evaluator portal:</p>
            <a href="{link}" 
               style="display: inline-block; padding: 12px 24px; background: #7dbbff; 
                      color: #1e293b; text-decoration: none; border-radius: 8px; 
                      font-weight: bold; margin: 16px 0;">
                Open Evaluator Portal
            </a>
            <p style="color: #888; font-size: 12px;">
                This link is unique to you. Do not share it with others.<br>
                If you did not expect this email, please ignore it.
            </p>
        </div>
        """
    elif role == "participant":
        subject = "Your Participant Access Link â€” HackSmart"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7dbbff;">Welcome to the Hackathon!</h2>
            <p>Your participant portal is ready. Click below to access your dashboard:</p>
            <a href="{link}" 
               style="display: inline-block; padding: 12px 24px; background: #7dbbff; 
                      color: #1e293b; text-decoration: none; border-radius: 8px; 
                      font-weight: bold; margin: 16px 0;">
                Open Participant Portal
            </a>
            <p style="color: #888; font-size: 12px;">
                This link is unique to you. Do not share it with others.<br>
                If you did not expect this email, please ignore it.
            </p>
        </div>
        """
    else:
        subject = "Your Access Link â€” HackSmart"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7dbbff;">Your Access Link</h2>
            <a href="{link}"
               style="display: inline-block; padding: 12px 24px; background: #7dbbff;
                      color: #1e293b; text-decoration: none; border-radius: 8px;
                      font-weight: bold; margin: 16px 0;">
                Open Portal
            </a>
        </div>
        """
    
    return subject, body

async def send_invite_email(to: str, invite_link: str, inviter_name: str):
    """Send committee invite email via Resend."""

        # â† ADD THIS BLOCK (always prints)
    print("\n" + "="*60)
    print(f"  ðŸ“§ [COMMITTEE INVITE]")
    print(f"  To:      {to}")
    print(f"  From:    {inviter_name}")
    print(f"  Link:    {invite_link}")
    print("="*60 + "\n")

    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_your"):
        return  # dev mode, skip email
    
    subject = "You've been invited to join the Committee â€” HackSmart"
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7dbbff;">You've been invited to join the Committee</h2>
        <p>{inviter_name} has invited you to join the HackSmart committee panel.</p>
        <p>Click the button below to set up your account. This link expires in 48 hours.</p>
        <a href="{invite_link}" 
           style="display: inline-block; padding: 12px 24px; background: #7dbbff; 
                  color: #1e293b; text-decoration: none; border-radius: 8px; 
                  font-weight: bold; margin: 16px 0;">
            Set Up My Account
        </a>
        <p style="color: #888; font-size: 12px;">
            This link is unique to you and expires in 48 hours.<br>
            If you did not expect this email, please ignore it.
        </p>
    </div>
    """

    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_your"):
        print(f"\n{'='*50}")
        print(f"[DEV MODE] Invite link for: {to}")
        print(f"Link: {invite_link}")
        print(f"{'='*50}\n")
        return

    sandbox_recipients = get_sandbox_recipients(to)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "onboarding@resend.dev",
                "to": sandbox_recipients,
                "subject": subject,
                "html": body,
            },
        )
        if response.status_code not in (200, 201):
            print(f"[EMAIL ERROR] Failed to send to {sandbox_recipients}: {response.text}")
