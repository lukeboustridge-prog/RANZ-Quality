"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * User data structure from API.
 */
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * UsersTableContent - Simplified version to debug React error #185.
 * Renders a basic table without TanStack Table or complex components.
 */
export default function UsersTableContent() {
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch users on mount
  React.useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/admin/users?page=1&limit=20");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/users?page=1&limit=20")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <span className="text-sm text-slate-500">
          {users.length} users loaded
        </span>
      </div>

      {/* Simple table without TanStack Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={String(user.id)}
                  className="border-b hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/admin/users/${String(user.id)}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    {String(user.email ?? "")}
                  </td>
                  <td className="px-4 py-3">
                    {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                      {String(user.userType ?? "Unknown")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {String(user.status ?? "Unknown")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.company ? String(user.company.name ?? "Unknown") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
