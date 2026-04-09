import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function CheckEmailPage() {
  const { resendVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const [resending, setResending] = useState(false);

  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const onResend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await resendVerification({ email });
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="container-pad py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-premium">
        <h1 className="font-display text-3xl font-bold text-slate-900">Check Your Email</h1>
        <p className="mt-3 text-slate-600">
          We sent a verification link to <strong>{email || "your email address"}</strong>.
          Please open your inbox and click the link to activate your account.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResend}
            disabled={!email || resending}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? "Sending..." : "Resend Verification Email"}
          </button>
          <Link to="/auth" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Back to Login
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckEmailPage;
