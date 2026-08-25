import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en-GB" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>Your Roost verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>.</span>ni
        </Text>
        <div style={card}>
          <Heading style={h1}>Confirm reauthentication</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
        </div>
        <Text style={footer}>
          This code will expire shortly. If you did not request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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

const codeStyle: React.CSSProperties = {
  fontFamily: "'Sora', Courier, monospace",
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#0f172a',
  margin: '0 0 10px',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '20px 0 0',
  lineHeight: '1.6',
}
