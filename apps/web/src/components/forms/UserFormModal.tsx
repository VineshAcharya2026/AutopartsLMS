"use client";

import { useEffect, useState } from "react";
import type { ApiCenter, ApiUser } from "@/lib/api";

type UserFormModalProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  showCenterField?: boolean;
  centers?: ApiCenter[];
  initialUser?: ApiUser | null;
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    center_id?: string;
  }) => Promise<void>;
};

export function UserFormModal({
  open,
  title,
  submitLabel,
  showCenterField,
  centers = [],
  initialUser,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const isEdit = Boolean(initialUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [centerId, setCenterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialUser) {
      setEmail(initialUser.email);
      setFirstName(initialUser.first_name);
      setLastName(initialUser.last_name);
      setCenterId(initialUser.center_id || "");
      setPassword("");
    } else {
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setCenterId("");
    }
    setError(null);
  }, [open, initialUser]);

  if (!open) return null;

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        email,
        first_name: firstName,
        last_name: lastName,
        ...(password ? { password } : {}),
        ...(showCenterField ? { center_id: centerId || undefined } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-md card p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">First name</label>
              <input
                className="input w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Last name</label>
              <input
                className="input w-full"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Password{isEdit ? " (leave blank to keep current)" : ""}
            </label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={isEdit ? undefined : 6}
            />
          </div>
          {showCenterField && (
            <div>
              <label className="block text-sm mb-1">Center</label>
              <select
                className="input w-full"
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
                required
              >
                <option value="">Select center</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
