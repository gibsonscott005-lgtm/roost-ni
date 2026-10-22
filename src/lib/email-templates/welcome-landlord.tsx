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
import { card, container, dot, footnote, heading, link, main, paragraph, signoff, signoffRole, tag, wordmark } from './brutal-styles'

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
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
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
            Core tools on RoostNI are free forever, with no commission on your rent, so if anything is unclear
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

export default WelcomeLandlord
