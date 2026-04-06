import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const inFlightVerificationRequests = new Map();
const LOGIN_REDIRECT_DELAY_MS = 4000;

function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email link...");
  const verifyEmailRef = useRef(verifyEmail);

  useEffect(() => {
    verifyEmailRef.current = verifyEmail;
  }, [verifyEmail]);

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const errorDescription = useMemo(
    () => searchParams.get("error_description") || searchParams.get("error") || "",
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (errorDescription) {
        if (cancelled) return;
        setStatus("error");
        setMessage(decodeURIComponent(errorDescription).replace(/\+/g, " "));
        return;
      }

      if (!token) {
        if (cancelled) return;
        setStatus("error");
        setMessage("Invalid verification link. Please request a new verification email.");
        return;
      }

      const verificationSessionKey = `verify-email:${token}`;
      const alreadyVerifiedInSession = sessionStorage.getItem(verificationSessionKey) === "done";
      if (alreadyVerifiedInSession) {
        if (cancelled) return;
        setStatus("success");
        setMessage("Email verified successfully. You can now log in.");
        return;
      }

      try {
        let requestPromise = inFlightVerificationRequests.get(token);
        if (!requestPromise) {
          requestPromise = verifyEmailRef.current({ token }).finally(() => {
            inFlightVerificationRequests.delete(token);
          });
          inFlightVerificationRequests.set(token, requestPromise);
        }

        const response = await requestPromise;
        if (cancelled) return;

        const nextStatus = response?.status === "already_verified" ? "already_verified" : "success";
        setStatus(nextStatus);
        setMessage(
          response?.message ||
            (nextStatus === "already_verified"
              ? "Email already verified. Please log in."
              : "Your email is verified. You can now log in.")
        );
        sessionStorage.setItem(verificationSessionKey, "done");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Verification failed or the link expired. Please request a new verification email.");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [errorDescription, token]);

  useEffect(() => {
    if (status !== "success" && status !== "already_verified") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/auth", { replace: true });
    }, LOGIN_REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, status]);

  return (
    <section className="container-pad py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-premium">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          {status === "success" || status === "already_verified"
            ? "Email Verified"
            : "Email Verification"}
        </h1>
        <p className="mt-3 text-slate-600">{message}</p>

        {status === "loading" && <p className="mt-4 text-sm text-slate-500">Please wait...</p>}

        {(status === "success" || status === "already_verified") && (
          <p className="mt-4 text-sm text-slate-500">Redirecting to login in 4 seconds...</p>
        )}

        {status !== "loading" && (
          <div className="mt-6">
            <Link to="/auth" className="btn-primary inline-flex">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default VerifyEmailPage;
