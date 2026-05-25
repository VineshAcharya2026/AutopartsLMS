"use client";

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  permanent?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  open,
  title,
  message,
  loading,
  permanent,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md card p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-[rgb(var(--muted))] mb-4">{message}</p>
        {!permanent && (
          <p className="text-sm mb-4">This item will be moved to Trash and can be restored later.</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : permanent ? "Delete Forever" : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
}
