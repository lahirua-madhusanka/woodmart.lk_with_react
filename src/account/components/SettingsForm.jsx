import { useEffect, useState } from "react";

function SettingsForm({ user, phone, onSaveProfile, onChangePassword, savingProfile, savingPassword }) {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
      phone: phone || "",
    });
  }, [user, phone]);

  const submitProfile = (event) => {
    event.preventDefault();
    onSaveProfile(profile);
  };

  const submitPassword = (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return;
    }
    onChangePassword(passwords);
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const mismatch = passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword;

  return (
    <div className="space-y-6">
      <form onSubmit={submitProfile} className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-ink">Profile Details</h3>

        <label className="block text-sm text-muted">
          Full Name
          <input value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </label>

        <label className="block text-sm text-muted">
          Email
          <input type="email" value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </label>

        <label className="block text-sm text-muted">
          Phone Number
          <input value={profile.phone} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
        </label>

        <button type="submit" disabled={savingProfile} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {savingProfile ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form onSubmit={submitPassword} className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-ink">Change Password</h3>

        <label className="block text-sm text-muted">
          Current Password
          <input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </label>

        <label className="block text-sm text-muted">
          New Password
          <input type="password" minLength={6} value={passwords.newPassword} onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </label>

        <label className="block text-sm text-muted">
          Confirm New Password
          <input type="password" minLength={6} value={passwords.confirmPassword} onChange={(event) => setPasswords((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </label>

        {mismatch ? <p className="text-sm font-semibold text-red-600">New passwords do not match.</p> : null}

        <button type="submit" disabled={savingPassword || mismatch} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {savingPassword ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default SettingsForm;
