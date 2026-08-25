import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en-GB" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>You are invited to join Roost</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>.</span>ni
        </Text>
        <div style={card}>
          <Heading style={h1}>You are invited</Heading>
          <Text style={text}>
            You have been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>Roost.ni</strong>
            </Link>
            . Click the button below to accept and create your account.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept invitation
          </Button>
        </div>
        <Text style={footer}>
          If you were not expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: '#0f172a',
  margin: 0,
  padding: '32px 0',
}

const container: React.CSSProperties = { maxWidth: '540px', margin: '0 auto', padding: '0 16px' }

const wordmark: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '18px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  fontFamily:
    "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const dot: React.CSSProperties = { color: '#059669' }

const card: React.CSSProperties = {
  border: '1px solid #e7e5e0',
  borderRadius: '14px',
  padding: '28px',
  backgroundColor: '#fdfcfa',
}

const h1: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 16px',
  fontFamily:
    "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const text: React.CSSProperties = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.65',
  margin: '0 0 20px',
}

const link: React.CSSProperties = { color: '#0f172a', textDecoration: 'underline' }

const button: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '9px',
  padding: '11px 18px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '20px 0 0',
  lineHeight: '1.6',
}
