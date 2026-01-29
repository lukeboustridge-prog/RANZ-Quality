import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
} from '@react-email/components';

interface SuspiciousLoginEmailProps {
  deviceName: string;
  location: string;
  ipAddress: string;
  timestamp: Date;
  reasons: string[];
}

export function SuspiciousLoginEmail({
  deviceName,
  location,
  ipAddress,
  timestamp,
  reasons,
}: SuspiciousLoginEmailProps) {
  const formattedTime = timestamp.toLocaleString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <Html>
      <Head />
      <Preview>Security Alert: New sign-in to your RANZ account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>RANZ Quality Program</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={alertHeading}>
              Security Alert
            </Heading>

            <Text style={text}>
              We noticed a sign-in to your RANZ account that looks different
              from your usual activity.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsText}>
                <strong>Device:</strong> {deviceName}
              </Text>
              <Text style={detailsText}>
                <strong>Location:</strong> {location}
              </Text>
              <Text style={detailsText}>
                <strong>IP Address:</strong> {ipAddress}
              </Text>
              <Text style={detailsText}>
                <strong>Time:</strong> {formattedTime}
              </Text>
            </Section>

            {reasons.length > 0 && (
              <>
                <Text style={reasonsHeading}>
                  <strong>Why this looks unusual:</strong>
                </Text>
                <ul style={list}>
                  {reasons.map((reason, i) => (
                    <li key={i} style={listItem}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Hr style={hr} />

            <Text style={text}>
              If this was you, you can ignore this email. Your account is
              secure.
            </Text>

            <Text style={warningText}>
              If you did not sign in, please contact RANZ support immediately at{' '}
              <a href="mailto:support@ranz.org.nz" style={link}>
                support@ranz.org.nz
              </a>{' '}
              and consider changing your password.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              RANZ Quality Program - portal.ranz.org.nz
            </Text>
            <Text style={footerText}>Roofing Association of New Zealand</Text>
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

const alertHeading = {
  color: '#dc2626', // Red for security alert
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
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const detailsText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const reasonsHeading = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '24px',
  marginBottom: '8px',
};

const list = {
  paddingLeft: '20px',
  margin: '8px 0',
};

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  marginBottom: '4px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '16px',
  marginBottom: '16px',
};

const link = {
  color: darkBlue,
  textDecoration: 'underline',
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

export default SuspiciousLoginEmail;
