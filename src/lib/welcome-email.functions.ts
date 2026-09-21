import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

const WELCOME_WINDOW_MS = 15 * 60 * 1000

/**
 * Sends the one-off welcome email for a brand-new sign-up.
 *
 * Public by necessity (no session exists yet when email confirmation is on),
 * so it only sends when the account genuinely exists and was created within
 * the last 15 minutes. The per-user idempotency key means retries and repeat
 * calls can never produce a second welcome email. Never throws — a failed
 * email must not affect sign-up.
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.userId)
      const user = userRes?.user
      if (!user?.email || !user.created_at) return { sent: false }

      const ageMs = Date.now() - new Date(user.created_at).getTime()
      if (ageMs < 0 || ageMs > WELCOME_WINDOW_MS) return { sent: false }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('account_type, full_name')
        .eq('id', user.id)
        .maybeSingle()

      const firstName = profile?.full_name?.trim().split(/\s+/)[0] || undefined
      const templateName =
        profile?.account_type === 'landlord' ? 'welcome-landlord' : 'welcome-tenant'

      const result = await sendTemplateEmail(templateName, user.email, {
        templateData: { name: firstName },
        idempotencyKey: `welcome-${user.id}`,
      })

      return { sent: result.sent }
    } catch (err) {
      console.error('[welcome-email] send failed', err)
      return { sent: false }
    }
  })
