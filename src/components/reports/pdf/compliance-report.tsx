import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ComplianceResult } from "@/lib/compliance-v2";

// Styles for PDF components
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 10,
    marginBottom: 20,
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    textAlign: "right",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    padding: 4,
  },
  cellLabel: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  cellValue: {
    color: "#333",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  infoItem: {
    width: "48%",
    marginBottom: 8,
  },
  overallScore: {
    textAlign: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginVertical: 15,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 12,
    marginTop: 5,
    color: "#666",
  },
  dimensionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dimensionLabel: {
    width: "30%",
    fontSize: 11,
    fontWeight: "bold",
  },
  dimensionScore: {
    width: "15%",
    fontSize: 11,
    textAlign: "right",
    marginRight: 10,
  },
  dimensionBarContainer: {
    width: "50%",
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    position: "relative",
  },
  dimensionBarFill: {
    height: 12,
    borderRadius: 4,
    position: "absolute",
    left: 0,
    top: 0,
  },
  issueRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  issueSeverity: {
    width: "10%",
    fontSize: 16,
  },
  issueMessage: {
    width: "50%",
    fontSize: 10,
    paddingRight: 8,
  },
  issueAction: {
    width: "40%",
    fontSize: 9,
    color: "#666",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  badge: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
  },
});

export interface ComplianceReportPDFProps {
  organization: {
    name: string;
    tradingName: string | null;
    nzbn: string | null;
    certificationTier: string;
  };
  complianceResult: ComplianceResult;
  generatedAt: Date;
  reportId: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e"; // green
  if (score >= 70) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function getStatusLabel(score: number): string {
  if (score >= 90) return "Compliant";
  if (score >= 70) return "At Risk";
  return "Critical";
}

function formatTier(tier: string): string {
  return tier
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "🔴";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "•";
  }
}

export function ComplianceReportPDF({
  organization,
  complianceResult,
  generatedAt,
  reportId,
}: ComplianceReportPDFProps) {
  const score = complianceResult.overallScore;
  const status = getStatusLabel(score);
  const scoreColor = getScoreColor(score);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>RANZ</Text>
            <Text style={styles.subtitle}>Roofing Association of New Zealand</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Compliance Report</Text>
            <Text style={styles.subtitle}>
              Generated: {generatedAt.toLocaleDateString()} {generatedAt.toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Organization Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Business Name</Text>
              <Text style={styles.cellValue}>{organization.name}</Text>
            </View>
            {organization.tradingName && (
              <View style={styles.infoItem}>
                <Text style={styles.cellLabel}>Trading Name</Text>
                <Text style={styles.cellValue}>{organization.tradingName}</Text>
              </View>
            )}
            {organization.nzbn && (
              <View style={styles.infoItem}>
                <Text style={styles.cellLabel}>NZBN</Text>
                <Text style={styles.cellValue}>{organization.nzbn}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Certification Tier</Text>
              <Text style={styles.badge}>{formatTier(organization.certificationTier)}</Text>
            </View>
          </View>
        </View>

        {/* Overall Score */}
        <View style={styles.section}>
          <View style={styles.overallScore}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}%</Text>
            <Text style={styles.scoreLabel}>{status}</Text>
          </View>
        </View>

        {/* Dimension Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Dimensions</Text>

          <View style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>Documentation (50%)</Text>
            <Text style={styles.dimensionScore}>{complianceResult.breakdown.documentation.score}%</Text>
            <View style={styles.dimensionBarContainer}>
              <View
                style={[
                  styles.dimensionBarFill,
                  {
                    width: `${complianceResult.breakdown.documentation.score}%`,
                    backgroundColor: getScoreColor(complianceResult.breakdown.documentation.score),
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>Insurance (25%)</Text>
            <Text style={styles.dimensionScore}>{complianceResult.breakdown.insurance.score}%</Text>
            <View style={styles.dimensionBarContainer}>
              <View
                style={[
                  styles.dimensionBarFill,
                  {
                    width: `${complianceResult.breakdown.insurance.score}%`,
                    backgroundColor: getScoreColor(complianceResult.breakdown.insurance.score),
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>Personnel (15%)</Text>
            <Text style={styles.dimensionScore}>{complianceResult.breakdown.personnel.score}%</Text>
            <View style={styles.dimensionBarContainer}>
              <View
                style={[
                  styles.dimensionBarFill,
                  {
                    width: `${complianceResult.breakdown.personnel.score}%`,
                    backgroundColor: getScoreColor(complianceResult.breakdown.personnel.score),
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>Audit (10%)</Text>
            <Text style={styles.dimensionScore}>{complianceResult.breakdown.audit.score}%</Text>
            <View style={styles.dimensionBarContainer}>
              <View
                style={[
                  styles.dimensionBarFill,
                  {
                    width: `${complianceResult.breakdown.audit.score}%`,
                    backgroundColor: getScoreColor(complianceResult.breakdown.audit.score),
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Issues Summary */}
        {complianceResult.issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Issues</Text>
            {complianceResult.issues.slice(0, 10).map((issue, index) => (
              <View key={index} style={styles.issueRow}>
                <Text style={styles.issueSeverity}>{getSeverityIcon(issue.severity)}</Text>
                <Text style={styles.issueMessage}>{issue.message}</Text>
                <Text style={styles.issueAction}>
                  {issue.actionRequired || "Review required"}
                </Text>
              </View>
            ))}
            {complianceResult.issues.length > 10 && (
              <Text style={{ marginTop: 8, fontSize: 9, color: "#666" }}>
                ... and {complianceResult.issues.length - 10} more issue(s)
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text>Roofing Association of New Zealand</Text>
            <Text>Report ID: {reportId}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text>Generated: {generatedAt.toISOString()}</Text>
            <Text>Valid for 30 days from generation date</Text>
          </View>
          <Text style={{ marginTop: 5, fontSize: 7 }}>
            This report is generated from real-time compliance data. For the most current
            information, visit the RANZ Certified Business Portal.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
