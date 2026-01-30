"use client";

import { useState } from "react";
import { Shield, User, Trash2, Check } from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  lbpNumber: string | null;
  lbpVerified: boolean;
  clerkUserId: string;
}

interface StaffListProps {
  members: StaffMember[];
  currentUserId: string;
}

export function StaffList({ members, currentUserId }: StaffListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: "ADMIN" | "STAFF") => {
    setLoading(memberId);
    try {
      const response = await fetch(`/api/staff/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to update role");
        return;
      }

      // Reload to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the organization?`)) {
      return;
    }

    setLoading(memberId);
    try {
      const response = await fetch(`/api/staff/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to remove member");
        return;
      }

      // Reload to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert("Failed to remove member. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const getRoleIcon = (role: "OWNER" | "ADMIN" | "STAFF") => {
    switch (role) {
      case "OWNER":
        return <Shield className="w-4 h-4 text-purple-600" />;
      case "ADMIN":
        return <Shield className="w-4 h-4 text-blue-600" />;
      case "STAFF":
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: "OWNER" | "ADMIN" | "STAFF") => {
    switch (role) {
      case "OWNER":
        return "text-purple-700 bg-purple-50";
      case "ADMIN":
        return "text-blue-700 bg-blue-50";
      case "STAFF":
        return "text-gray-700 bg-gray-50";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LBP Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map((member) => {
            const isCurrentUser = member.clerkUserId === currentUserId;
            const isOwner = member.role === "OWNER";
            const canModify = !isOwner && !isCurrentUser;
            const isLoading = loading === member.id;

            return (
              <tr key={member.id} className={isLoading ? "opacity-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getRoleIcon(member.role)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    {member.lbpNumber || "—"}
                    {member.lbpVerified && member.lbpNumber && (
                      <Check className="w-4 h-4 text-green-600 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {canModify ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as "ADMIN" | "STAFF")
                      }
                      disabled={isLoading}
                      className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                        member.role
                      )}`}
                    >
                      {member.role === "OWNER"
                        ? "Owner"
                        : member.role === "ADMIN"
                        ? "Admin"
                        : "Staff"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {canModify ? (
                    <button
                      onClick={() =>
                        handleRemove(member.id, `${member.firstName} ${member.lastName}`)
                      }
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
