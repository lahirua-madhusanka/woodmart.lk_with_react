import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { evaluatePasswordStrength } from "../utils/passwordStrength";
import {
  resetPasswordApi,
  validateResetPasswordTokenApi,
} from "../services/authService";
import { getApiErrorMessage } from "../services/apiClient";

const LOGIN_REDIRECT_DELAY_MS = 4000;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState("validating");
  const [message, setMessage] = useState("Validating your reset link...");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(form.newPassword),
    [form.newPassword]
  );
  const passwordsMatch = form.newPassword === form.confirmPassword;
  const canSubmit = Boolean(
    token &&
      form.newPassword &&
      form.confirmPassword &&
      passwordStrength.isStrong &&
      passwordsMatch &&
      status === "ready"
  );

  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      if (!token) {
        if (cancelled) return;
        setStatus("invalid");
        setMessage("Reset link is invalid or expired.");
        return;
      }

      try {
        await validateResetPasswordTokenApi(token);
        if (cancelled) return;
        setStatus("ready");
        setMessage("Enter your new password below.");
      } catch (error) {
        if (cancelled) return;
        setStatus("invalid");
        setMessage(getApiErrorMessage(error) || "Reset link is invalid or expired.");
      }
    };

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/auth", { replace: true });
    }, LOGIN_REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !canSubmit) return;

    setSubmitting(true);
    try {
      const response = await resetPasswordApi({
        token,
        newPassword: form.newPassword,
      });

      setStatus("success");
      setMessage(
        response?.message ||
          "Password reset successful. You can now log in with your new password."
      );
    } catch (error) {
      setStatus("error");
      setMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container-pad py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-premium md:p-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Reset Password</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>

        {status === "validating" && (
          <p className="mt-3 text-sm text-slate-500">Please wait...</p>
        )}

        {(status === "invalid" || status === "error") && (
          <div className="mt-5">
            <Link to="/auth/forgot-password" className="btn-primary inline-flex">
              Request New Reset Link
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">New Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {form.newPassword && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                  <span className="text-slate-600">Password Strength</span>
                  <span
                    className={
                      passwordStrength.level === "strong"
                        ? "text-green-600"
                        : passwordStrength.level === "medium"
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  >
                    {passwordStrength.level}
                  </span>
                </div>

                <div className="mb-3 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className={
                      passwordStrength.level === "strong"
                        ? "h-2 rounded-full bg-green-500"
                        : passwordStrength.level === "medium"
                          ? "h-2 rounded-full bg-amber-500"
                          : "h-2 rounded-full bg-red-500"
                    }
                    style={{ width: `${(passwordStrength.score / passwordStrength.maxScore) * 100}%` }}
                  />
                </div>

                <ul className="space-y-1 text-xs">
                  {passwordStrength.rules.map((rule) => (
                    <li key={rule.key} className={rule.passed ? "text-green-700" : "text-slate-600"}>
                      {rule.passed ? "✓" : "○"} {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Confirm New Password</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <span className="mt-1 block text-xs text-red-600">Passwords do not match</span>
              )}
            </label>

            {!passwordStrength.isStrong && form.newPassword && (
              <p className="text-sm text-red-600">Password is not strong enough</p>
            )}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Resetting password..." : "Reset Password"}
            </button>
          </form>
        )}

        {status === "success" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-500">Redirecting to login in 4 seconds...</p>
            <Link to="/auth" className="btn-primary inline-flex">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default ResetPasswordPage;