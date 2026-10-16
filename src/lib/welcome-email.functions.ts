import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

const WELCOME_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Sends the one-off welcome email to the signed-in user only. Called after the
 * first sign-in (including after email confirmation). Deduped via
 * profiles.welcome_email_sent_at plus an idempotency key. Never throws.
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId)
      const user = userRes?.user
      if (!user?.email || !user.created_at) return { sent: false }

      const ageMs = Date.now() - new Date(user.created_at).getTime()
      if (ageMs < 0 || ageMs > WELCOME_WINDOW_MS) return { sent: false }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('account_type, full_name, welcome_email_sent_at')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile || profile.welcome_email_sent_at) return { sent: false }

      const { data: claimed } = await supabaseAdmin
        .from('profiles')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', user.id)
        .is('welcome_email_sent_at', null)
        .select('id')
      if (!claimed?.length) return { sent: false }

      const firstName = profile.full_name?.trim().split(/\s+/)[0] || undefined
      const templateName =
        profile.account_type === 'landlord' ? 'welcome-landlord' : 'welcome-tenant'

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
