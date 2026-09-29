# Instant sign-up (no email confirmation)

There is no built-in demo account — you create your own login. To make that frictionless, new sign-ups will log in immediately instead of waiting for a confirmation email.

## What changes

- Turn on auto-confirm for email sign-ups in the backend auth settings.
- Leave the sign-in page as is: enter any email you own plus a 6+ character password, click "Create an account", and you land straight on the dashboard with your business workspace created.

## Technical notes

- Call the auth configuration tool with `auto_confirm_email: true`, keeping sign-ups enabled, anonymous users off, and leaked-password protection on.
- No code changes required; `signUp` already returns a live session once auto-confirm is enabled, and the existing redirect to `/dashboard` then works on the first try.
