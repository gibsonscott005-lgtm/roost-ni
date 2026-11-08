import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { cleanName } from '../display-name'
import { button, card, container, dot, footnote, heading, main, paragraph, tag, wordmark } from './brutal-styles'

interface Props {
  tenantName?: string
  landlordName?: string
  address?: string
  url?: string
}

const TenancyInvite = ({ tenantName, landlordName, address, url = 'https://roostni.co.uk' }: Props) => {
  const name = cleanName(tenantName)?.split(/\s+/)[0]
  const landlord = cleanName(landlordName) ?? 'Your landlord'
  return (
    <Html lang="en-GB" dir="ltr">
      <Head />
      <Preview>{`${landlord} has invited you to your tenancy on RoostNI`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={wordmark}>
            Roost<span style={dot}>NI</span>
          </Text>
          <Section style={card}>
            <Text style={tag}>{'// Tenancy invite'}</Text>
            <Heading style={heading}>{name ? `Hi ${name}` : 'Hi there'}</Heading>
            <Text style={paragraph}>
              {landlord} has invited you to see your tenancy{address ? ` at ${address}` : ''} on RoostNI: rent receipts,
              repairs and notices in one place. It costs tenants nothing.
            </Text>
            <Button href={url} style={button}>
              Open your tenancy
            </Button>
          </Section>
          <Text style={footnote}>
            This link works once and expires in 14 days. Use the email address this was sent to. If you weren't expecting
            it, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TenancyInvite,
  subject: 'Your landlord has invited you to RoostNI',
  displayName: 'Tenant invite to an existing tenancy',
  previewData: { tenantName: 'Jane Tenant', landlordName: 'Sam Landlord', address: '12 Main Street, Belfast', url: 'https://roostni.co.uk/invite?token=example' },
} satisfies TemplateEntry
