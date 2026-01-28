import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Link,
  Section,
  Button,
  Hr,
} from '@react-email/components';

interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
  expiresIn?: string;
  requestedIp?: string;
}

export function PasswordResetEmail({
  firstName,
  resetUrl,
  expiresIn = '1 hour',
  requestedIp,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password - RANZ Quality Program</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>RANZ Quality Program</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Password Reset Request
            </Heading>

            <Text style={text}>Hi {firstName},</Text>

            <Text style={text}>
              We received a request to reset your password for your RANZ Quality Program account.
              Click the button below to set a new password:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={warningText}>
              This link will expire in {expiresIn}. If you did not request a password reset,
              please ignore this email or contact support if you have concerns.
            </Text>

            {requestedIp && (
              <Text style={metaText}>
                This request was made from IP address: {requestedIp}
              </Text>
            )}

            <Hr style={hr} />

            <Text style={text}>
              If the button above doesn't work, copy and paste this link into your browser:
            </Text>
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              RANZ Quality Program - portal.ranz.org.nz
            </Text>
            <Text style={footerText}>
              Roofing Association of New Zealand
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// RANZ brand colors
const charcoal = '#3c4b5d';
const darkBlue = '#00417a';

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
  maxWidth: '580px',
};

const header = {
  backgroundColor: charcoal,
  padding: '24px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '32px 40px',
};

const heading = {
  color: charcoal,
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '24px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
};

const button = {
  backgroundColor: darkBlue,
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px',
  marginBottom: '16px',
};

const metaText = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '8px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const link = {
  color: darkBlue,
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};

const footer = {
  padding: '24px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#f6f9fc',
};

const footerText = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '4px 0',
};
