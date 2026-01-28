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

interface PasswordChangedEmailProps {
  firstName: string;
  changedAt: string;
  changedIp?: string;
}

export function PasswordChangedEmail({
  firstName,
  changedAt,
  changedIp,
}: PasswordChangedEmailProps) {
  // Format the timestamp for display
  const formattedDate = new Date(changedAt).toLocaleString('en-NZ', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Pacific/Auckland',
  });

  return (
    <Html>
      <Head />
      <Preview>Your password has been changed - RANZ Quality Program</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>RANZ Quality Program</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Password Changed
            </Heading>

            <Text style={text}>Hi {firstName},</Text>

            <Text style={text}>
              Your password for your RANZ Quality Program account has been successfully changed.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsText}>
                <strong>Changed at:</strong> {formattedDate}
              </Text>
              {changedIp && (
                <Text style={detailsText}>
                  <strong>IP address:</strong> {changedIp}
                </Text>
              )}
            </Section>

            <Hr style={hr} />

            <Section style={securityNotice}>
              <Text style={securityHeading}>
                Did not make this change?
              </Text>
              <Text style={securityText}>
                If you did not change your password, your account may have been compromised.
                Please contact RANZ support immediately at{' '}
                <strong>support@ranz.org.nz</strong> or call <strong>0800 RANZ NZ</strong>.
              </Text>
            </Section>
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

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const securityNotice = {
  backgroundColor: '#fff8e6',
  borderLeft: '4px solid #f5a623',
  padding: '16px 20px',
  marginTop: '16px',
};

const securityHeading = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const securityText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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
