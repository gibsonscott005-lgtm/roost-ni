import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
}

const WelcomeTenant = ({ name }: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>Welcome to RoostNI — your Tenant Passport is ready to set up</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Heading style={heading}>{name ? `Welcome, ${name}` : 'Welcome to RoostNI'}</Heading>
          <Text style={paragraph}>
            Thanks for joining us. RoostNI is built for renters in Northern Ireland — instead of
            re-sending payslips, ID and references for every viewing, you organise them once in a
            self-certified Tenant Passport that you control and share.
          </Text>
          <Text style={paragraph}>
            Your best first step is to set up your Tenant Passport. It takes about ten minutes, and
            you can add to it whenever suits you:
          </Text>
          <Text style={paragraph}>
            <Link href="https://roostni.co.uk/dashboard" style={link}>
              Set up your Tenant Passport
            </Link>
          </Text>
          <Text style={paragraph}>
            RoostNI is free for renters — no fees, no card required — so if anything is unclear
            or doesn't work the way you'd expect, I would genuinely like to hear about it. Just
            reply to this email and it lands straight in my inbox.
          </Text>
          <Text style={signoff}>
            Thanks again,
            <br />
            Scott
            <br />
            <span style={signoffRole}>Founder, RoostNI</span>
          </Text>
        </Section>
        <Text style={footnote}>
          You are receiving this because you created a RoostNI account. RoostNI organises
          self-certified documents — it does not vet tenants or provide credit scores.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeTenant,
  subject: 'Welcome to RoostNI — your Tenant Passport is ready to set up',
  displayName: 'Welcome email (tenant)',
  previewData: { name: 'Kelly' },
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
  margin: '0 0 16px',
  fontSize: '14px',
  lineHeight: '1.65',
  color: '#475569',
}

const link: React.CSSProperties = {
  color: '#059669',
  fontWeight: 600,
  textDecoration: 'underline',
}

const signoff: React.CSSProperties = {
  margin: '24px 0 0',
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#0f172a',
}

const signoffRole: React.CSSProperties = { color: '#94a3b8', fontSize: '13px' }

const footnote: React.CSSProperties = {
  margin: '20px 0 0',
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#94a3b8',
}

export default WelcomeTenant
