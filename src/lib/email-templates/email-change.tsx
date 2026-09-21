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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en-GB" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>Confirm your RoostNI email change</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <div style={card}>
          <Heading style={h1}>Confirm your email change</Heading>
          <Text style={text}>
            You requested to change your RoostNI email address from{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>
              {oldEmail}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={text}>Click the button below to confirm this change:</Text>
          <Button style={button} href={confirmationUrl}>
            Confirm email change
          </Button>
        </div>
        <Text style={footer}>
          If you did not request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
