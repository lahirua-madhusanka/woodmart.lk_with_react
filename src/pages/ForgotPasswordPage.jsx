import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../services/authService";
import { getApiErrorMessage } from "../services/apiClient";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await forgotPasswordApi({ email: normalizedEmail });
      setStatus("success");
      setMessage(
        response?.message ||
          "If an account exists for this email, a password reset link has been sent."
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
        <h1 className="font-display text-3xl font-bold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your registered email address and we will send you a password reset link.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Sending reset link..." : "Send Reset Link"}
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {status === "error" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <div className="mt-6 text-sm text-muted">
          Remembered your password?{" "}
          <Link to="/auth" className="font-semibold text-brand hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ForgotPasswordPage;