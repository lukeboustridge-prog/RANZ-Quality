import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// --- Types ---

export interface ProcedureDocumentProps {
  organization: {
    name: string;
    tradingName?: string | null;
    nzbn?: string | null;
  };
  template: { title: string; description?: string | null };
  instance: {
    startedAt: Date;
    completedAt: Date | null;
    createdBy: string;
  };
  sections: Array<{
    title: string;
    description?: string | null;
    items: Array<{
      title: string;
      description?: string | null;
      itemType: string;
      isRequired: boolean;
      completed: boolean;
      textValue?: string | null;
      notes?: string | null;
      completedAt?: Date | null;
      completedBy?: string | null;
      hasPhoto: boolean;
    }>;
  }>;
  project: {
    projectNumber: string;
    clientName: string;
    siteAddress: string;
    startDate: Date;
    completionDate?: Date | null;
  };
  completionStats: {
    totalItems: number;
    completedItems: number;
    percentage: number;
  };
  generatedAt: Date;
  referenceId: string;
}

// --- Styles ---

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
  logoSubtitle: {
    fontSize: 8,
    color: "#666",
  },
  headerRight: {
    textAlign: "right",
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
  },
  sectionDescription: {
    fontSize: 9,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
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
  cellLabel: {
    fontWeight: "bold",
    marginBottom: 2,
    fontSize: 9,
    color: "#555",
  },
  cellValue: {
    color: "#000",
    fontSize: 10,
  },
  completionBanner: {
    textAlign: "center",
    padding: 15,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  completionPercentage: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#16a34a",
  },
  completionLabel: {
    fontSize: 10,
    marginTop: 4,
    color: "#555",
  },
  // Table styles
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#fafafa",
  },
  colNum: { width: "5%", fontSize: 9 },
  colItem: { width: "22%", fontSize: 9 },
  colType: { width: "12%", fontSize: 9 },
  colRequired: { width: "8%", fontSize: 9, textAlign: "center" },
  colStatus: { width: "7%", fontSize: 9, textAlign: "center" },
  colCompletedBy: { width: "14%", fontSize: 9 },
  colDate: { width: "12%", fontSize: 9 },
  colNotes: { width: "20%", fontSize: 8, color: "#555" },
  headerText: {
    fontWeight: "bold",
    fontSize: 8,
    color: "#475569",
  },
  // ISO statement
  isoSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  isoTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e293b",
  },
  isoText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#475569",
    marginBottom: 8,
  },
  // Footer
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
});

// --- Helpers ---

function formatItemType(itemType: string): string {
  switch (itemType) {
    case "CHECKBOX":
      return "Checkbox";
    case "TEXT_INPUT":
      return "Text Input";
    case "PHOTO_REQUIRED":
      return "Photo Required";
    case "SIGNATURE":
      return "Signature";
    default:
      return itemType;
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "--";
  const d = new Date(date);
  return d.toLocaleDateString("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getNotesText(item: {
  itemType: string;
  textValue?: string | null;
  notes?: string | null;
  hasPhoto: boolean;
}): string {
  const parts: string[] = [];
  if (item.itemType === "TEXT_INPUT" && item.textValue) {
    parts.push(item.textValue);
  }
  if (item.itemType === "PHOTO_REQUIRED") {
    parts.push(item.hasPhoto ? "Photo attached" : "No photo");
  }
  if (item.notes) {
    parts.push(item.notes);
  }
  return parts.join("; ") || "--";
}

// --- Component ---

export function ProcedureDocumentPDF({
  organization,
  template,
  instance,
  sections,
  project,
  completionStats,
  generatedAt,
  referenceId,
}: ProcedureDocumentProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>RANZ</Text>
            <Text style={styles.logoSubtitle}>
              Roofing Association of New Zealand
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 9, color: "#666" }}>
              Ref: {referenceId}
            </Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              Generated: {formatDate(generatedAt)}
            </Text>
          </View>
        </View>

        {/* Cover Title */}
        <Text style={styles.coverTitle}>Company Procedure Document</Text>
        <Text style={styles.coverSubtitle}>
          Process Control -- ISO Element 12
        </Text>

        {/* Organization Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organisation Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Business Name</Text>
              <Text style={styles.cellValue}>{organization.name}</Text>
            </View>
            {organization.tradingName && (
              <View style={styles.infoItem}>
                <Text style={styles.cellLabel}>Trading Name</Text>
                <Text style={styles.cellValue}>
                  {organization.tradingName}
                </Text>
              </View>
            )}
            {organization.nzbn && (
              <View style={styles.infoItem}>
                <Text style={styles.cellLabel}>NZBN</Text>
                <Text style={styles.cellValue}>{organization.nzbn}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Project Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Project Number</Text>
              <Text style={styles.cellValue}>{project.projectNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Client</Text>
              <Text style={styles.cellValue}>{project.clientName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Site Address</Text>
              <Text style={styles.cellValue}>{project.siteAddress}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Project Start</Text>
              <Text style={styles.cellValue}>
                {formatDate(project.startDate)}
              </Text>
            </View>
            {project.completionDate && (
              <View style={styles.infoItem}>
                <Text style={styles.cellLabel}>Project Completion</Text>
                <Text style={styles.cellValue}>
                  {formatDate(project.completionDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Checklist Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Template</Text>
              <Text style={styles.cellValue}>{template.title}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Started</Text>
              <Text style={styles.cellValue}>
                {formatDate(instance.startedAt)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Completed</Text>
              <Text style={styles.cellValue}>
                {formatDate(instance.completedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Completion Stats */}
        <View style={styles.completionBanner}>
          <Text style={styles.completionPercentage}>
            {completionStats.percentage}%
          </Text>
          <Text style={styles.completionLabel}>
            {completionStats.completedItems}/{completionStats.totalItems} items
            completed
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text>Roofing Association of New Zealand</Text>
            <Text>Ref: {referenceId}</Text>
          </View>
          <Text style={{ fontSize: 7 }}>
            This document is generated from the RANZ Certified Business
            Programme Portal.
          </Text>
        </View>
      </Page>

      {/* Section Pages */}
      {sections.map((section, sectionIndex) => (
        <Page key={sectionIndex} size="A4" style={styles.page}>
          {/* Page Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.logo}>RANZ</Text>
              <Text style={styles.logoSubtitle}>Procedure Document</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={{ fontSize: 9, color: "#666" }}>
                {organization.name}
              </Text>
              <Text style={{ fontSize: 9, color: "#666" }}>
                {project.projectNumber} - {project.clientName}
              </Text>
            </View>
          </View>

          {/* Section Header */}
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.description && (
            <Text style={styles.sectionDescription}>{section.description}</Text>
          )}

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colNum, styles.headerText]}>#</Text>
            <Text style={[styles.colItem, styles.headerText]}>Item</Text>
            <Text style={[styles.colType, styles.headerText]}>Type</Text>
            <Text style={[styles.colRequired, styles.headerText]}>Req.</Text>
            <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
            <Text style={[styles.colCompletedBy, styles.headerText]}>
              Completed By
            </Text>
            <Text style={[styles.colDate, styles.headerText]}>Date</Text>
            <Text style={[styles.colNotes, styles.headerText]}>Notes</Text>
          </View>

          {/* Table Rows */}
          {section.items.map((item, itemIndex) => (
            <View
              key={itemIndex}
              style={itemIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={styles.colNum}>{itemIndex + 1}</Text>
              <Text style={styles.colItem}>{item.title}</Text>
              <Text style={styles.colType}>{formatItemType(item.itemType)}</Text>
              <Text style={styles.colRequired}>
                {item.isRequired ? "Yes" : "No"}
              </Text>
              <Text style={styles.colStatus}>
                {item.completed ? "[X]" : "[ ]"}
              </Text>
              <Text style={styles.colCompletedBy}>
                {item.completedBy || "--"}
              </Text>
              <Text style={styles.colDate}>
                {formatDate(item.completedAt)}
              </Text>
              <Text style={styles.colNotes}>{getNotesText(item)}</Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text>
                Section {sectionIndex + 1} of {sections.length}
              </Text>
              <Text>Ref: {referenceId}</Text>
            </View>
          </View>
        </Page>
      ))}

      {/* ISO Compliance Statement Page */}
      <Page size="A4" style={styles.page}>
        {/* Page Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>RANZ</Text>
            <Text style={styles.logoSubtitle}>Procedure Document</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 9, color: "#666" }}>
              {organization.name}
            </Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              {project.projectNumber} - {project.clientName}
            </Text>
          </View>
        </View>

        {/* ISO Statement */}
        <View style={styles.isoSection}>
          <Text style={styles.isoTitle}>
            ISO Element 12 -- Process Control
          </Text>
          <Text style={styles.isoText}>
            This document demonstrates that {organization.name} maintains
            documented procedures for client project processes as required by
            the RANZ Certified Business Programme quality management system.
          </Text>
          <Text style={styles.isoText}>
            The procedures documented herein cover the complete client
            engagement lifecycle and are maintained through the RANZ Quality
            Programme Portal.
          </Text>
          <Text style={styles.isoText}>
            All checklist items have been reviewed and completed by authorised
            personnel. Photographic evidence and text records are stored
            securely within the quality management system.
          </Text>
        </View>

        {/* Summary */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Organisation</Text>
              <Text style={styles.cellValue}>{organization.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Project</Text>
              <Text style={styles.cellValue}>
                {project.projectNumber} - {project.clientName}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Checklist Completed</Text>
              <Text style={styles.cellValue}>
                {formatDate(instance.completedAt)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Document Generated</Text>
              <Text style={styles.cellValue}>{formatDate(generatedAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.cellLabel}>Reference</Text>
              <Text style={styles.cellValue}>{referenceId}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text>Roofing Association of New Zealand</Text>
            <Text>Ref: {referenceId}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text>Generated: {generatedAt.toISOString()}</Text>
            <Text>ISO Element 12 - Process Control</Text>
          </View>
          <Text style={{ marginTop: 5, fontSize: 7 }}>
            This procedure document is generated from verified checklist
            completion data within the RANZ Certified Business Programme Portal.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
