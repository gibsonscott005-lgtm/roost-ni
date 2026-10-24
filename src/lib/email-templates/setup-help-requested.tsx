import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { button, card, container, dot, footnote, heading, main, paragraph, tag, wordmark } from './brutal-styles'

interface Props {
  name?: string
  email?: string
  url?: string
}

const SetupHelpRequested = ({
  name = 'A landlord',
  email = '',
  url = 'https://roostni.co.uk/dashboard/landlord-funnel',
}: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>{`${name} asked you to set up their first property`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Text style={tag}>{'// Landlord asked for a hand'}</Text>
          <Heading style={heading}>{name} wants help setting up</Heading>
          <Text style={paragraph}>
            They tapped “Want me to set this up for you?” on an empty dashboard.
            {email ? ` Their email is ${email}.` : ''} Nothing has been sent to them —
            get in touch yourself when you are ready.
          </Text>
          <Button href={url} style={button}>
            Open the landlord funnel
          </Button>
        </Section>
        <Text style={footnote}>This goes only to you. The landlord is never emailed automatically.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SetupHelpRequested,
  subject: (d: Record<string, any>) => `Set-up help requested: ${d.name ?? 'a landlord'}`,
  displayName: 'Landlord set-up help requested',
  previewData: { name: 'Jane Landlord', email: 'jane@example.com' },
  to: 'scott@roostni.co.uk',
} satisfies TemplateEntry
