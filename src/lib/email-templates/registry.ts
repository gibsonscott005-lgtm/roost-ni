import type { ComponentType } from 'react'
import { template as legalSourceChangedTemplate } from './legal-source-changed'
import { template as notificationAlertTemplate } from './notification-alert'
import { template as welcomeTenantTemplate } from './welcome-tenant'
import { template as welcomeLandlordTemplate } from './welcome-landlord'
import { template as listingPublishedTemplate } from './listing-published'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'legal-source-changed': legalSourceChangedTemplate,
  'notification-alert': notificationAlertTemplate,
  'welcome-tenant': welcomeTenantTemplate,
  'welcome-landlord': welcomeLandlordTemplate,
  'listing-published': listingPublishedTemplate,
}
