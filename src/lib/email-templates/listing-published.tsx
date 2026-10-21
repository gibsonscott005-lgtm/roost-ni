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
import { button, card, container, dot, footnote, heading, main, paragraph, tag, wordmark } from './brutal-styles'

interface Props {
  title?: string
  area?: string
  rent?: number
  bedrooms?: number | null
  url?: string
  subscriberCount?: number
}

const ListingPublished = ({
  title = '3-bed terrace, Ormeau Road',
  area = 'Belfast',
  rent = 850,
  bedrooms = 3,
  url = 'https://roostni.co.uk/listings',
  subscriberCount = 0,
}: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>A landlord just advertised a property on RoostNI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
          <Heading style={heading}>New listing live: {title}</Heading>
          <Text style={paragraph}>
            {area} · £{rent?.toLocaleString('en-GB')}/month
            {bedrooms ? ` · ${bedrooms} bed` : ''}. It is now showing on the public
            listings page.
          </Text>
          <Text style={paragraph}>
            {subscriberCount > 0
              ? `${subscriberCount} ${subscriberCount === 1 ? 'person has' : 'people have'} asked for new-listing alerts. Open the Command centre to copy their email addresses and let them know with one BCC message.`
              : 'Nobody has joined the tenant alert list yet — no follow-up needed this time.'}
          </Text>
          <Button href={url} style={button}>
            View the listing
          </Button>
        </Section>
        <Text style={footnote}>
          You receive this because you run RoostNI. It goes only to you — never to
          landlords or tenants.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ListingPublished,
  subject: (data: Record<string, any>) =>
    data?.['title']
      ? `New listing live: ${data['title']}`
      : 'A new listing is live on RoostNI',
  displayName: 'Owner alert — listing published',
  // Operational email for the site owner only; never sent to users.
  to: 'usgibsons2004@gmail.com',
  previewData: {
    title: '3-bed terrace, Ormeau Road',
    area: 'Belfast · BT7',
    rent: 850,
    bedrooms: 3,
    url: 'https://roostni.co.uk/listings',
    subscriberCount: 12,
  },
} satisfies TemplateEntry

export default ListingPublished
