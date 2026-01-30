"use client";

import { useState, useEffect } from "react";

interface NotificationPreferences {
  id: string;
  emailEnabled: boolean;
  emailInsuranceAlerts: boolean;
  emailAuditAlerts: boolean;
  emailComplianceAlerts: boolean;
  emailSystemAlerts: boolean;
  smsEnabled: boolean;
  smsInsuranceAlerts: boolean;
  smsAuditAlerts: boolean;
  smsCriticalAlerts: boolean;
  notificationEmail: string | null;
  notificationPhone: string | null;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch("/api/organizations/current/notifications");
        if (!response.ok) throw new Error("Failed to fetch preferences");
        const data = await response.json();
        setPreferences(data);
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
        setMessage({ type: "error", text: "Failed to load notification preferences" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  const handleToggle = async (field: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[field];
    const updatedPreferences = { ...preferences, [field]: newValue };
    setPreferences(updatedPreferences);
    setMessage(null);

    try {
      setIsSaving(true);
      const response = await fetch("/api/organizations/current/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }

      setMessage({ type: "success", text: "Preference updated" });
      setTimeout(() => setMessage(null), 2000);
    } catch {
      // Revert on error
      setPreferences(preferences);
      setMessage({ type: "error", text: "Failed to update preference" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-red-600 py-4">
        Failed to load notification preferences. Please refresh the page.
      </div>
    );
  }

  const Toggle = ({
    checked,
    onChange,
    disabled = false,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled || isSaving}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Email Notifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Receive notifications via email</p>
          </div>
          <Toggle
            checked={preferences.emailEnabled}
            onChange={() => handleToggle("emailEnabled")}
          />
        </div>

        {preferences.emailEnabled && (
          <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Insurance Alerts</p>
                <p className="text-xs text-gray-500">Policy expiry reminders and updates</p>
              </div>
              <Toggle
                checked={preferences.emailInsuranceAlerts}
                onChange={() => handleToggle("emailInsuranceAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Audit Alerts</p>
                <p className="text-xs text-gray-500">Scheduled audits and reminders</p>
              </div>
              <Toggle
                checked={preferences.emailAuditAlerts}
                onChange={() => handleToggle("emailAuditAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Compliance Alerts</p>
                <p className="text-xs text-gray-500">Compliance score changes and warnings</p>
              </div>
              <Toggle
                checked={preferences.emailComplianceAlerts}
                onChange={() => handleToggle("emailComplianceAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">System Alerts</p>
                <p className="text-xs text-gray-500">Important system notifications</p>
              </div>
              <Toggle
                checked={preferences.emailSystemAlerts}
                onChange={() => handleToggle("emailSystemAlerts")}
              />
            </div>
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
            <p className="text-sm text-gray-500">Receive urgent notifications via SMS</p>
          </div>
          <Toggle
            checked={preferences.smsEnabled}
            onChange={() => handleToggle("smsEnabled")}
          />
        </div>

        {preferences.smsEnabled && (
          <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Insurance Alerts</p>
                <p className="text-xs text-gray-500">Urgent policy expiry warnings</p>
              </div>
              <Toggle
                checked={preferences.smsInsuranceAlerts}
                onChange={() => handleToggle("smsInsuranceAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Audit Alerts</p>
                <p className="text-xs text-gray-500">Upcoming audit reminders</p>
              </div>
              <Toggle
                checked={preferences.smsAuditAlerts}
                onChange={() => handleToggle("smsAuditAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Critical Alerts</p>
                <p className="text-xs text-gray-500">Critical compliance issues requiring immediate attention</p>
              </div>
              <Toggle
                checked={preferences.smsCriticalAlerts}
                onChange={() => handleToggle("smsCriticalAlerts")}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 pt-4">
        Note: These settings control notifications sent to your organization. Individual staff members can configure their personal notification preferences separately.
      </p>
    </div>
  );
}
