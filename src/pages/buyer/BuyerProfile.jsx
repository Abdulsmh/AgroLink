
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";

const lgaOptions = [
  "Kano Central",
  "Kano South",
  "Kano West",
  "Kano East",
  "Kano North",
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function BuyerProfile() {
  const { user, userProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [lgaLocation, setLgaLocation] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setEmail(user.email || "");

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("id, full_name, lga_location, role, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (queryError) {
        setError("We could not load your profile.");
      } else if (data) {
        setFullName(data.full_name || "");
        setLgaLocation(data.lga_location || "");
      } else {
        setFullName(userProfile?.full_name || "");
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id, user?.email, userProfile?.full_name]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Please sign in to update your profile.");
      return;
    }

    if (!fullName.trim()) {
      setError("Your full name is required.");
      return;
    }

    if (!lgaLocation) {
      setError("Please select your LGA location.");
      return;
    }

    setSaving(true);

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        lga_location: lgaLocation,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    setSaving(false);

    if (updateError || !data) {
      setError(
        updateError?.message ||
          "Your profile was not updated. Check your account permissions."
      );
      return;
    }

    setSuccess("Your profile has been updated successfully.");
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <LoaderCircle size={20} className="animate-spin" />
          Loading your profile...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="/buyer/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} /> Back to dashboard
        </a>

        <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-950 to-emerald-700 p-6 text-white sm:p-8">
          <div className="flex items-center gap-4">
            <span className="rounded-2xl bg-white/10 p-3">
              <UserRound size={30} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Buyer profile</h1>
              <p className="mt-1 text-sm text-emerald-100">
                Keep your contact and location information up to date.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="buyer-full-name"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Full name
            </label>
            <input
              id="buyer-full-name"
              className={inputClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="buyer-email"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Email address
            </label>
            <input
              id="buyer-email"
              type="email"
              className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500`}
              value={email}
              readOnly
              disabled
            />
            <p className="mt-2 text-xs text-gray-500">
              Your sign-in email is managed by your account authentication
              settings.
            </p>
          </div>

          <div>
            <label
              htmlFor="buyer-lga"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              LGA / operating area
            </label>
            <select
              id="buyer-lga"
              className={inputClass}
              value={lgaLocation}
              onChange={(event) => setLgaLocation(event.target.value)}
              required
            >
              <option value="">Select your area</option>
              {lgaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {lgaLocation && !lgaOptions.includes(lgaLocation) && (
                <option value={lgaLocation}>{lgaLocation}</option>
              )}
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-gray-500">
              Your account role and verification status cannot be changed from
              this page.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" size={17} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} /> Save profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
