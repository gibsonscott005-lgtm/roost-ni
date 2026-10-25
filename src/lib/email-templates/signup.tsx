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
import { button, card, codeStyle, container, dot, footer, h1, link, main, tag, text, wordmark } from './brutal-styles'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en-GB" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>Confirm your email for RoostNI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>
          Roost<span style={dot}>NI</span>
        </Text>
        <div style={card}>
          <Text style={tag}>{'// RoostNI · Northern Ireland'}</Text>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Thanks for signing up to{' '}
            <Link href={siteUrl} style={link}>
              <strong>RoostNI</strong>
            </Link>
            , the Northern Ireland tenancy platform.
          </Text>
          <Text style={text}>
            Please confirm{' '}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>{' '}
            by clicking below:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify email
          </Button>
          {token ? (
            <>
              <Text style={text}>Or type this code on the sign-up screen:</Text>
              <Text style={codeStyle}>{token}</Text>
            </>
          ) : null}
        </div>
        <Text style={footer}>
          If you did not create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

