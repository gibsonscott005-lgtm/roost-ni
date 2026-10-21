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
import { button, card, container, dot, footer, h1, link, main, tag, text, wordmark } from './brutal-styles'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en-GB" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>You are invited to join RoostNI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <div style={card}>
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
          <Heading style={h1}>You are invited</Heading>
          <Text style={text}>
            You have been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>RoostNI</strong>
            </Link>
            . Click the button below to accept and create your account.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept invitation
          </Button>
        </div>
        <Text style={footer}>
          If you were not expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

