import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { button, card, container, dot, footnote, heading, main, paragraph, tag, wordmark } from './brutal-styles'

interface Props {
  title?: string
  area?: string
  rent?: number
  bedrooms?: number | null
  url?: string
  unsubscribeUrl?: string
  isPreview?: boolean
}

const ListingAlertSubscriber = ({
  title = '3-bed terrace, Ormeau Road',
  area = 'Belfast',
  rent = 850,
  bedrooms = 3,
  url = 'https://roostni.co.uk/listings',
  unsubscribeUrl = 'https://roostni.co.uk/unsubscribe',
  isPreview = false,
}: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>{`New home listed in ${area}: ${title}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Text style={tag}>{isPreview ? '// PREVIEW · only sent to you' : `// New listing · ${area}`}</Text>
          <Heading style={heading}>{title}</Heading>
          <Text style={paragraph}>
            {area} · £{rent?.toLocaleString('en-GB')} a month
            {bedrooms ? ` · ${bedrooms} bed` : ''}. Listed directly by the landlord on RoostNI.
          </Text>
          <Button href={url} style={button}>
            View the property
          </Button>
        </Section>
        <Text style={footnote}>
          You asked for alerts about new homes in {area}. At most one email a day.{' '}
          <Link href={unsubscribeUrl}>Unsubscribe from listing alerts</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ListingAlertSubscriber,
  subject: (data: Record<string, any>) =>
    `${data?.['isPreview'] ? '[Preview] ' : ''}New home in ${data?.['area'] ?? 'Northern Ireland'}: ${data?.['title'] ?? 'listed on RoostNI'}`,
  displayName: 'Tenant alert — new listing in your area',
  previewData: {
    title: '3-bed terrace, Ormeau Road',
    area: 'Belfast',
    rent: 850,
    bedrooms: 3,
    url: 'https://roostni.co.uk/listings',
    unsubscribeUrl: 'https://roostni.co.uk/unsubscribe?token=preview',
  },
} satisfies TemplateEntry
