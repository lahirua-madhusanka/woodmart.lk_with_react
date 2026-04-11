import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeNewsletterApi } from "../../services/newsletterService";
import { getApiErrorMessage } from "../../services/apiClient";

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

function NewsletterSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [activeAction, setActiveAction] = useState("");

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  const messageClassName = useMemo(() => {
    if (state === "success") return "text-emerald-200";
    if (state === "already") return "text-amber-200";
    if (state === "error") return "text-rose-200";
    return "text-brand-light";
  }, [state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setState("error");
      setMessage("Please enter your email");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setState("error");
      setMessage("Please enter a valid email address");
      return;
    }

    setState("loading");
    setActiveAction("subscribe");
    setMessage("");

    try {
      const response = await subscribeNewsletterApi({
        email: normalizedEmail,
        source: "homepage",
      });

      if (response?.status === "already_subscribed") {
        setState("already");
        setMessage("You are already subscribed");
        return;
      }

      setState("success");
      setMessage("Subscribed successfully!");
      setEmail("");
    } catch (error) {
      setState("error");
      setMessage(getApiErrorMessage(error) || "Something went wrong");
    } finally {
      setActiveAction("");
    }
  };

  return (
    <section className="container-pad py-10">
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark to-brand p-8 text-white lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-light">
              Join Our Newsletter
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold">
              Get style drops, private offers, and design tips.
            </h3>
            <p className="mt-2 text-sm text-brand-light">
              Be first to access curated product launches and exclusive seasonal edits.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row lg:w-[420px]">
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (state !== "idle") {
                  setState("idle");
                  setActiveAction("");
                  setMessage("");
                }
              }}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-white/30 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-200 outline-none"
              aria-label="Email address"
              disabled={state === "loading"}
            />
            <button
              type="submit"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-dark transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-80"
              disabled={state === "loading"}
            >
              {state === "loading" && activeAction === "subscribe" ? "Subscribing..." : "Subscribe"}
            </button>
           
          </form>
        </div>

        <p className={`mt-3 text-sm transition-all duration-200 ${messageClassName}`} aria-live="polite">
          {message || " "}
        </p>
      </div>
    </section>
  );
}

export default NewsletterSection;