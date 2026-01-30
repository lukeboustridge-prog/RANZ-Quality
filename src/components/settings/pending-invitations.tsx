"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";

interface PendingInvitation {
  id: string;
  emailAddress: string;
  role: string;
  createdAt: number;
  status: string;
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    try {
      const response = await fetch("/api/staff/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(invitationId: string, email: string) {
    if (!confirm(`Revoke invitation to ${email}?`)) {
      return;
    }

    setRevoking(invitationId);
    try {
      const response = await fetch("/api/staff/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      alert("Failed to revoke invitation");
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading pending invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic">
        No pending invitations
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {invitation.emailAddress}
              </div>
              <div className="text-xs text-gray-500">
                Invited as {invitation.role} • {new Date(invitation.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleRevoke(invitation.id, invitation.emailAddress)}
            disabled={revoking === invitation.id}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
            title="Revoke invitation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
