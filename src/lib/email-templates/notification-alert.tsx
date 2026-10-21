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
  message?: string
  url?: string
  actionLabel?: string
}

const NotificationAlert = ({
  title = 'An update on your tenancy',
  message = 'There is an update waiting for you in RoostNI.',
  url = 'https://roostni.co.uk',
  actionLabel = 'Open in RoostNI',
}: Props) => (
  <Html lang="en-GB" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <Section style={card}>
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
          <Heading style={heading}>{title}</Heading>
          <Text style={paragraph}>{message}</Text>
          <Button href={url} style={button}>
            {actionLabel}
          </Button>
        </Section>
        <Text style={footnote}>
          You are receiving this because it affects your tenancy or your property. You can
          turn these emails off in RoostNI under Settings, Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NotificationAlert,
  subject: (data: Record<string, any>) =>
    data?.['title'] ? `RoostNI — ${data['title']}` : 'RoostNI — an update on your tenancy',
  displayName: 'High-priority notification',
  previewData: {
    title: 'Your application has been accepted',
    message:
      'Sarah has accepted your application for 14 Malone Avenue, Belfast. The next step is reviewing the lease.',
    url: 'https://roostni.co.uk/dashboard',
    actionLabel: 'Open in RoostNI',
  },
} satisfies TemplateEntry

export default NotificationAlert
