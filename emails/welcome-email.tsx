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

interface WelcomeEmailProps {
  firstName: string;
  email: string;
  activationUrl: string;
  expiresIn?: string;
}

export function WelcomeEmail({
  firstName,
  email,
  activationUrl,
  expiresIn = '7 days',
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to RANZ Quality Program - Activate your account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>RANZ Quality Program</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Welcome to RANZ!
            </Heading>

            <Text style={text}>Hi {firstName},</Text>

            <Text style={text}>
              Welcome to the RANZ Quality Program portal. Your account has been created
              and is ready for activation.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsText}>
                <strong>Your login email:</strong> {email}
              </Text>
            </Section>

            <Text style={text}>
              To get started, click the button below to set your password and activate
              your account:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={activationUrl}>
                Activate Your Account
              </Button>
            </Section>

            <Text style={warningText}>
              This activation link will expire in {expiresIn}. For security reasons,
              you will need to set your own password when activating your account.
            </Text>

            <Hr style={hr} />

            <Section style={helpSection}>
              <Text style={helpHeading}>What's next?</Text>
              <Text style={helpText}>
                After activating your account, you'll be able to:
              </Text>
              <ul style={helpList}>
                <li style={helpListItem}>Access your certification dashboard</li>
                <li style={helpListItem}>Upload and manage compliance documents</li>
                <li style={helpListItem}>Track insurance policies and expiry dates</li>
                <li style={helpListItem}>Manage your team's qualifications</li>
              </ul>
            </Section>

            <Hr style={hr} />

            <Text style={text}>
              If the button above doesn't work, copy and paste this link into your browser:
            </Text>
            <Link href={activationUrl} style={link}>
              {activationUrl}
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              RANZ Quality Program - portal.ranz.org.nz
            </Text>
            <Text style={footerText}>
              Roofing Association of New Zealand
            </Text>
            <Text style={footerText}>
              Questions? Contact us at support@ranz.org.nz
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

const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '6px',
  padding: '16px 20px',
  marginTop: '24px',
  marginBottom: '24px',
};

const detailsText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0',
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

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const helpSection = {
  marginTop: '16px',
};

const helpHeading = {
  color: charcoal,
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '12px',
};

const helpText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '8px',
};

const helpList = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  paddingLeft: '20px',
};

const helpListItem = {
  marginBottom: '4px',
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
