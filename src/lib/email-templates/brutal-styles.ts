import type * as React from 'react'

// Shared bold editorial ("Brutalist Night") styling for every RoostNI email.
// Email-safe: inline styles only, white body, sharp corners, solid borders.
const ink = '#0B0F17'
const emerald = '#00C88C'
const emeraldDeep = '#047857'
const paper = '#F6F1E7'
const muted = '#3F4652'
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const mono = "'Courier New', Courier, monospace"

export const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: sans,
  color: ink,
  margin: 0,
  padding: '24px 0',
}

export const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }

export const wordmark: React.CSSProperties = {
  margin: '0',
  padding: '14px 20px',
  backgroundColor: ink,
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  border: `2px solid ${ink}`,
}

export const dot: React.CSSProperties = { color: emerald }

export const tag: React.CSSProperties = {
  display: 'inline-block',
  margin: '18px 0 0 0',
  padding: '4px 10px',
  backgroundColor: emerald,
  color: ink,
  fontFamily: mono,
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  border: `2px solid ${ink}`,
}

export const card: React.CSSProperties = {
  border: `2px solid ${ink}`,
  borderTop: 'none',
  borderRadius: '0',
  padding: '24px 28px 28px',
  backgroundColor: '#ffffff',
  boxShadow: `6px 6px 0 ${emerald}`,
}

const headingBase: React.CSSProperties = {
  margin: '16px 0 14px',
  fontSize: '28px',
  lineHeight: '1.1',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: ink,
}
export const heading = headingBase
export const h1 = headingBase

const bodyText: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: muted,
}
export const paragraph = bodyText
export const text = bodyText

export const link: React.CSSProperties = {
  color: emeraldDeep,
  fontWeight: 700,
  textDecoration: 'underline',
}

export const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: emerald,
  color: ink,
  fontSize: '15px',
  fontWeight: 800,
  textDecoration: 'none',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  borderRadius: '0',
  border: `2px solid ${ink}`,
  padding: '14px 24px',
  boxShadow: `4px 4px 0 ${ink}`,
}

export const codeStyle: React.CSSProperties = {
  display: 'inline-block',
  margin: '0 0 20px',
  padding: '12px 18px',
  backgroundColor: paper,
  border: `2px solid ${ink}`,
  fontFamily: mono,
  fontSize: '26px',
  fontWeight: 800,
  letterSpacing: '0.2em',
  color: ink,
}

const smallPrint: React.CSSProperties = {
  margin: '24px 0 0',
  padding: '12px 14px',
  backgroundColor: paper,
  borderLeft: `4px solid ${emerald}`,
  fontSize: '12px',
  lineHeight: '1.6',
  color: muted,
}
export const footer = smallPrint
export const footnote = smallPrint

export const signoff: React.CSSProperties = {
  margin: '24px 0 0',
  fontSize: '15px',
  lineHeight: '1.6',
  color: ink,
  fontWeight: 600,
}

export const signoffRole: React.CSSProperties = {
  color: muted,
  fontFamily: mono,
  fontSize: '12px',
  textTransform: 'uppercase',
}
