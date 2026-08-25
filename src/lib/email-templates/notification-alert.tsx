import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  title?: string
  message?: string
  url?: string
  actionLabel?: string
}

const NotificationAlert = ({
  title = 'An update on your tenancy',
  message = 'There is an update waiting for you in Roost.',
  url = 'https://roostni.co.uk',
  actionLabel = 'Open in Roost',
}: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>.</span>ni
        </Text>
        <Section style={card}>
          <Heading style={heading}>{title}</Heading>
          <Text style={paragraph}>{message}</Text>
          <Button href={url} style={button}>
            {actionLabel}
          </Button>
        </Section>
        <Text style={footnote}>
          You are receiving this because it affects your tenancy or your property. You can
          turn these emails off in Roost under Settings, Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NotificationAlert,
  subject: (data: Record<string, any>) =>
    data?.['title'] ? `Roost — ${data['title']}` : 'Roost — an update on your tenancy',
  displayName: 'High-priority notification',
  previewData: {
    title: 'Your application has been accepted',
    message:
      'Sarah has accepted your application for 14 Malone Avenue, Belfast. The next step is reviewing the lease.',
    url: 'https://roostni.co.uk/dashboard',
    actionLabel: 'Open in Roost',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  color: '#0f172a',
  margin: 0,
  padding: '24px 0',
}

const container: React.CSSProperties = { maxWidth: '540px', margin: '0 auto', padding: '0 16px' }

const wordmark: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '18px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
}

const dot: React.CSSProperties = { color: '#059669' }

const card: React.CSSProperties = {
  border: '1px solid #e7e5e0',
  borderRadius: '14px',
  padding: '28px',
  backgroundColor: '#fdfcfa',
}

const heading: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '19px',
  lineHeight: '1.35',
  fontWeight: 600,
}

const paragraph: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: '14px',
  lineHeight: '1.65',
  color: '#475569',
}

const button: React.CSSProperties = {
  backgroundColor: '#059669',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '11px 18px',
  borderRadius: '9px',
  textDecoration: 'none',
}

const footnote: React.CSSProperties = {
  margin: '20px 0 0',
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#94a3b8',
}

export default NotificationAlert
