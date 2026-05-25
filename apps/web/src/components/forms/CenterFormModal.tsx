"use client";

import { useEffect, useState } from "react";
import type { ApiCenter } from "@/lib/api";

type CenterFormModalProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialCenter?: ApiCenter | null;
  onClose: () => void;
  onSubmit: (data: { name: string; code: string }) => Promise<void>;
};

export function CenterFormModal({
  open,
  title,
  submitLabel,
  initialCenter,
  onClose,
  onSubmit,
}: CenterFormModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialCenter?.name || "");
    setCode(initialCenter?.code || "");
    setError(null);
  }, [open, initialCenter]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ name, code });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save center");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md card p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Code</label>
            <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
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
