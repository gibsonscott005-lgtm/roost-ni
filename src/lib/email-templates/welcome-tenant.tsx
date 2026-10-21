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
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
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

export default WelcomeTenant
