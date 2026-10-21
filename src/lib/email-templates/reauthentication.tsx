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
import { card, codeStyle, container, dot, footer, h1, main, tag, text, wordmark } from './brutal-styles'

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
    <Preview>Your RoostNI verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <div style={card}>
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
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

