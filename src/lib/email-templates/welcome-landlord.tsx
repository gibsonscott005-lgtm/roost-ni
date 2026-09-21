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

const WelcomeLandlord = ({ name }: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>Welcome to RoostNI — organise your tenancy records in one place</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Heading style={heading}>{name ? `Welcome, ${name}` : 'Welcome to RoostNI'}</Heading>
          <Text style={paragraph}>
            Thanks for joining us. RoostNI is built for self-managing landlords in Northern Ireland
            — tenancy paperwork, statutory dates (deposit protection, gas safety, EPC) and rent
            records kept tidy in one place.
          </Text>
          <Text style={paragraph}>
            A good first step is to add your first property. If it is currently tenanted, it stays
            private — nothing is advertised until you choose to. And if you haven't already, the
            free two-minute Landlord Audit benchmarks your paperwork against the core NI statutory
            requirements:
          </Text>
          <Text style={paragraph}>
            <Link href="https://roostni.co.uk/dashboard" style={link}>
              Add your first property
            </Link>
            {'  ·  '}
            <Link href="https://roostni.co.uk/audit" style={link}>
              Run the free Landlord Audit
            </Link>
          </Text>
          <Text style={paragraph}>
            RoostNI is in free early beta — no fees, no card required — so if anything is unclear
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
          You are receiving this because you created a RoostNI account. RoostNI organises your
          records — it does not provide legal advice or vet tenants.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeLandlord,
  subject: 'Welcome to RoostNI — organise your tenancy records in one place',
  displayName: 'Welcome email (landlord)',
  previewData: { name: 'Clare' },
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

export default WelcomeLandlord
