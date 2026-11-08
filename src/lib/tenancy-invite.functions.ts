import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { checkInvite, hashToken, inviteExpiry, isValidEmail, newToken, normaliseEmail, REFUSAL_MESSAGE } from '@/lib/tenancy-invite'
import { cleanName } from '@/lib/display-name'

function requestOrigin(): string {
  const req = getRequest()
  const url = new URL(req.url)
  const sandboxHost = url.hostname === 'localhost' ? req.headers.get('x-forwarded-host') : null
  return sandboxHost ? `https://${sandboxHost}` : url.origin
}

/** Landlord sends a single-use invite for one of their existing tenancies. */
export const sendTenancyInvite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { shareId: string; email: string }) => {
    const email = normaliseEmail(d?.email)
    if (typeof d?.shareId !== 'string' || !/^[0-9a-f-]{36}$/i.test(d.shareId)) throw new Error('Invalid tenancy')
    if (!isValidEmail(email)) throw new Error('Please enter a valid email address')
    return { shareId: d.shareId, email }
  })
  .handler(async ({ data, context }) => {
    // RLS: a landlord can only read shares on their own listings.
    const { data: share } = await context.supabase
      .from('passport_shares')
      .select('id, tenant_id, lease_kind, tenancy_status, listing:property_listings!listing_id(landlord_id, address, existing_tenant_name)')
      .eq('id', data.shareId)
      .maybeSingle()
    const listing = (share as unknown as { listing: { landlord_id: string; address: string; existing_tenant_name: string | null } | null } | null)?.listing
    if (!share || !listing || listing.landlord_id !== context.userId) throw new Error('Tenancy not found')
    if (share.lease_kind !== 'existing_agreement' || share.tenancy_status === 'completed') throw new Error('Invites are only for existing tenancies')
    if (share.tenant_id) throw new Error('A tenant is already linked to this tenancy')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const now = new Date()
    // One live invite per tenancy: older unused ones are cancelled.
    await supabaseAdmin.from('tenancy_invites').update({ revoked_at: now.toISOString() })
      .eq('share_id', data.shareId).is('used_at', null).is('revoked_at', null)
    const token = newToken()
    const { data: row, error } = await supabaseAdmin.from('tenancy_invites').insert({
      share_id: data.shareId, landlord_id: context.userId, email: data.email,
      token_hash: await hashToken(token), expires_at: inviteExpiry(now).toISOString(),
    }).select('id').single()
    if (error || !row) throw new Error('Could not create the invite')

    const { data: prof } = await supabaseAdmin.from('profiles').select('full_name').eq('id', context.userId).maybeSingle()
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const result = await sendTemplateEmail('tenancy-invite', data.email, {
      templateData: {
        tenantName: cleanName(listing.existing_tenant_name) ?? undefined,
        landlordName: cleanName(prof?.full_name) ?? undefined,
        address: listing.address,
        url: `${requestOrigin()}/invite?token=${token}`,
      },
      idempotencyKey: `tenancy-invite-${row.id}`,
    })
    return { sent: result.sent }
  })

/** Signed-in tenant accepts an invite; attaches them to the tenancy. */
export const acceptTenancyInvite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => {
    if (typeof d?.token !== 'string' || !/^[0-9a-f]{64}$/.test(d.token)) throw new Error(REFUSAL_MESSAGE.not_found)
    return { token: d.token }
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: invite } = await supabaseAdmin.from('tenancy_invites')
      .select('id, share_id, email, expires_at, used_at, revoked_at')
      .eq('token_hash', await hashToken(data.token)).maybeSingle()
    const { data: share } = invite
      ? await supabaseAdmin.from('passport_shares').select('id, tenant_id, lease_kind, tenancy_status').eq('id', invite.share_id).maybeSingle()
      : { data: null }
    const email = (context.claims as { email?: string }).email
    const refusal = checkInvite(invite, share, email, context.userId)
    if (refusal) return { ok: false as const, message: REFUSAL_MESSAGE[refusal] }

    // Claim the invite first so it can only ever be used once.
    const { data: claimed } = await supabaseAdmin.from('tenancy_invites')
      .update({ used_at: new Date().toISOString(), used_by: context.userId })
      .eq('id', invite!.id).is('used_at', null).select('id')
    if (!claimed?.length) return { ok: false as const, message: REFUSAL_MESSAGE.used }
    const { error } = await supabaseAdmin.from('passport_shares').update({ tenant_id: context.userId })
      .eq('id', share!.id).is('tenant_id', null)
    if (error && share!.tenant_id !== context.userId) return { ok: false as const, message: 'Could not link your account. Please try again.' }
    return { ok: true as const, shareId: share!.id }
  })
