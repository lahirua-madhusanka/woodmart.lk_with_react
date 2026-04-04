import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/apiClient";
import { evaluatePasswordStrength } from "../utils/passwordStrength";

function AuthPage() {
  const { isAuthenticated, loading, login, register, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const redirectTarget = useMemo(
    () => location.state?.from || "/",
    [location.state]
  );

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(form.password),
    [form.password]
  );

  const passwordsMatch = form.password === form.confirmPassword;
  const isRegisterPasswordValid = mode !== "register" || passwordStrength.isStrong;
  const canSubmit = mode === "register"
    ? Boolean(form.name.trim() && form.email.trim() && form.password && form.confirmPassword && passwordsMatch && isRegisterPasswordValid)
    : Boolean(form.email.trim() && form.password);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTarget]);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (inlineError) {
      setInlineError("");
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (mode === "register" && form.password !== form.confirmPassword) {
      setInlineError("Passwords do not match");
      return;
    }

    if (mode === "register" && !passwordStrength.isStrong) {
      setInlineError("Password is not strong enough");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        const response = await register({ name: form.name, email: form.email, password: form.password });
        if (response?.requiresVerification) {
          setVerificationEmail(response.email || form.email);
          navigate(`/auth/check-email?email=${encodeURIComponent(response.email || form.email)}`, { replace: true });
          return;
        }
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error).toLowerCase();
      if (mode === "login" && message.includes("verify your email")) {
        setVerificationEmail(form.email);
      }
      if (mode === "register") {
        setInlineError(getApiErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResendVerification = async () => {
    if (!verificationEmail || resending) return;
    setResending(true);
    try {
      await resendVerification({ email: verificationEmail });
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="container-pad py-10">
      <div className="mx-auto grid max-w-5xl gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-premium md:grid-cols-2 md:p-8">
        <aside className="rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-[#0d75cc] p-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">Welcome to Woodmart.lk</p>
          <h1 className="mt-2 font-display text-4xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-3 text-sm text-brand-light">
            Save favorites, track orders, and enjoy a seamless premium shopping experience.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-brand-light">
            <li>Exclusive member offers</li>
            <li>Faster checkout experience</li>
            <li>Personalized product recommendations</li>
          </ul>
        </aside>

        <div className="p-2 md:p-4">
          <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            <button
              onClick={() => setMode("login")}
              className={`rounded-md px-4 py-2 font-semibold ${
                mode === "login" ? "bg-white text-brand shadow" : "text-muted"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-md px-4 py-2 font-semibold ${
                mode === "register" ? "bg-white text-brand shadow" : "text-muted"
              }`}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Full Name</span>
                <input
                  value={form.name}
                  onChange={onChange("name")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                />
              </label>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Email Address</span>
              <input
                type="email"
                value={form.email}
                onChange={onChange("email")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={onChange("password")}
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

            {mode === "register" && form.password && (
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

                {!passwordStrength.isStrong && (
                  <p className="mt-2 text-xs font-medium text-red-600">Password is not strong enough</p>
                )}
              </div>
            )}

            {mode === "register" && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={onChange("confirmPassword")}
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
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <span className="mt-1 block text-xs text-red-600">Passwords do not match</span>
                )}
              </label>
            )}

            {inlineError && mode === "register" && (
              <p className="text-sm text-red-600">{inlineError}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            {mode === "login" && (
              <p className="text-sm text-muted">
                Forgot your password? <button type="button" className="font-semibold text-brand">Reset here</button>
              </p>
            )}

            {mode === "login" && verificationEmail && (
              <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-slate-700">
                <p>
                  Need a new verification email for <strong>{verificationEmail}</strong>?
                </p>
                <button
                  type="button"
                  onClick={onResendVerification}
                  disabled={resending}
                  className="mt-2 font-semibold text-brand disabled:opacity-60"
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default AuthPage;