import { useEffect, useRef } from "react";

function PasswordConfirmModal({
  open,
  title = "Confirm Action",
  description,
  password,
  error,
  loading,
  confirmText = "Confirm",
  onPasswordChange,
  onConfirm,
  onClose,
}) {
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => passwordInputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && open && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [loading, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-premium">
        <h3 className="text-xl font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
          className="mt-5 space-y-3"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Admin password</span>
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand focus:border-brand focus:ring-2 disabled:opacity-70"
              placeholder="Enter your admin password"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Verifying..." : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordConfirmModal;