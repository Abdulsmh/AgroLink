
import { useEffect, useState } from "react";
import {
  UserRound,
  Building2,
  MapPin,
  Mail,
  ShieldCheck,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Save,
  RefreshCw,
  Pencil,
  X,
  Sprout,
  LockKeyhole,
} from "lucide-react";

import { supabase } from '../../config/supabaseClient';
import { useAuth } from "../../context/AuthContext";

const KANO_LGAS = [
  "Kano Central",
  "Kano South",
  "Kano West",
  "Kano East",
  "Kano North",
];

const VERIFICATION_CONFIG = {
  approved: {
    label: "Verified aggregator",
    description: "Your aggregator account is approved.",
    icon: ShieldCheck,
    classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  pending: {
    label: "Verification pending",
    description: "Your documents are awaiting review.",
    icon: Clock3,
    classes: "bg-amber-50 text-amber-800 border-amber-200",
  },
  rejected: {
    label: "Verification rejected",
    description: "Your verification was rejected. Contact the administrator for guidance.",
    icon: AlertCircle,
    classes: "bg-red-50 text-red-800 border-red-200",
  },
};

const EMPTY_PROFILE = {
  full_name: "",
  business_name: "",
  farm_location: "",
  lga_location: "",
};

function Field({ label, icon: Icon, children, hint }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {Icon && <Icon size={16} className="text-gray-400" />}
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-gray-500">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {Icon && <Icon size={16} className="text-gray-400" />}
        {label}
      </p>
      <div className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700">
        <span className="break-all">
          {value || "Not provided"}
        </span>
      </div>
    </div>
  );
}

function StatusPanel({ status }) {
  const normalizedStatus = String(status || "pending").toLowerCase();
  const config =
    VERIFICATION_CONFIG[normalizedStatus] || VERIFICATION_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-4 ${config.classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon size={23} />
        </div>
        <div>
          <p className="font-bold">{config.label}</p>
          <p className="mt-1 text-sm leading-6">{config.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function AggregatorProfile() {
  const { user, userProfile, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [originalProfile, setOriginalProfile] = useState(EMPTY_PROFILE);
  const [verificationStatus, setVerificationStatus] = useState("pending");

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setError("Please sign in to view your aggregator profile.");
      setLoading(false);
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  async function loadProfile() {
    if (!user?.id) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id,full_name,business_name,farm_location,lga_location,role,verification_status"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!data) {
        throw new Error(
          "Your profile record could not be found. Please contact the administrator."
        );
      }

      if (data.role !== "aggregator") {
        throw new Error(
          "This page is available to aggregator accounts only."
        );
      }

      const nextProfile = {
        full_name: data.full_name || "",
        business_name: data.business_name || "",
        farm_location: data.farm_location || "",
        lga_location: data.lga_location || "",
      };

      setProfile(nextProfile);
      setOriginalProfile(nextProfile);
      setVerificationStatus(data.verification_status || "pending");
    } catch (loadError) {
      console.error("Error loading aggregator profile:", loadError);
      setError(
        loadError?.message || "Unable to load your profile. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateField(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setProfile(originalProfile);
    setEditing(false);
    setError("");
    setSuccess("");
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!user?.id) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const fullName = profile.full_name.trim();
    const businessName = profile.business_name.trim();
    const farmLocation = profile.farm_location.trim();
    const lgaLocation = profile.lga_location.trim();

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!businessName) {
      setError("Please enter your business or trading name.");
      return;
    }

    if (!farmLocation) {
      setError("Please enter your office or business address.");
      return;
    }

    if (!lgaLocation) {
      setError("Please select your LGA area.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Only update editable profile fields. Never allow this form
      // to change the user's role or verification status.
      const updates = {
        full_name: fullName,
        business_name: businessName,
        farm_location: farmLocation,
        lga_location: lgaLocation,
      };

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select(
          "id,full_name,business_name,farm_location,lga_location,role,verification_status"
        )
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "The profile was not updated. Check your profile update permissions or contact the administrator."
        );
      }

      if (data.role !== "aggregator") {
        throw new Error(
          "Your account role changed. Please refresh your session or contact the administrator."
        );
      }

      const savedProfile = {
        full_name: data.full_name || "",
        business_name: data.business_name || "",
        farm_location: data.farm_location || "",
        lga_location: data.lga_location || "",
      };

      setProfile(savedProfile);
      setOriginalProfile(savedProfile);
      setVerificationStatus(data.verification_status || "pending");
      setEditing(false);
      setSuccess("Your profile has been updated successfully.");
    } catch (saveError) {
      console.error("Error saving aggregator profile:", saveError);
      setError(
        saveError?.message ||
          "Unable to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadProfile();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm text-gray-500">
            Loading your aggregator profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <UserRound size={17} />
              Aggregator workspace
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              My profile
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Manage your business information and review your account
              verification status.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || saving}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="break-words text-sm leading-6">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
          >
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-6">{success}</p>
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main profile card */}
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <UserRound size={28} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">
                    Business information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Keep your contact and business details current.
                  </p>
                </div>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setEditing(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <Pencil size={16} />
                  Edit profile
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" icon={UserRound}>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(event) =>
                      updateField("full_name", event.target.value)
                    }
                    disabled={!editing || saving}
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </Field>

                <Field label="Business / trading name" icon={Building2}>
                  <input
                    type="text"
                    value={profile.business_name}
                    onChange={(event) =>
                      updateField("business_name", event.target.value)
                    }
                    disabled={!editing || saving}
                    required
                    maxLength={150}
                    autoComplete="organization"
                    placeholder="Enter your business name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    label="Office / business address"
                    icon={MapPin}
                    hint="Enter the location where you coordinate produce collection and farmer relationships."
                  >
                    <textarea
                      value={profile.farm_location}
                      onChange={(event) =>
                        updateField("farm_location", event.target.value)
                      }
                      disabled={!editing || saving}
                      required
                      maxLength={300}
                      rows={3}
                      autoComplete="street-address"
                      placeholder="Enter your office or business address"
                      className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </Field>
                </div>

                <Field
                  label="LGA / operating area"
                  icon={MapPin}
                  hint="Choose the operating area recorded in your profile."
                >
                  <select
                    value={profile.lga_location}
                    onChange={(event) =>
                      updateField("lga_location", event.target.value)
                    }
                    disabled={!editing || saving}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                  >
                    <option value="">Select operating area</option>
                    {KANO_LGAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                    {profile.lga_location &&
                      !KANO_LGAS.includes(profile.lga_location) && (
                        <option value={profile.lga_location}>
                          {profile.lga_location}
                        </option>
                      )}
                  </select>
                </Field>

                <ReadOnlyField
                  label="Email address"
                  value={user?.email}
                  icon={Mail}
                />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                  <LockKeyhole
                    size={19}
                    className="mt-0.5 shrink-0 text-gray-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Account security
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Your email, account role and verification status cannot
                      be changed from this form. Role changes and verification
                      decisions must go through the appropriate AgroLink
                      workflow.
                    </p>
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-700" />
                <h2 className="font-bold text-gray-900">
                  Verification status
                </h2>
              </div>

              <div className="mt-4">
                <StatusPanel status={verificationStatus} />
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Only an authorized administrator can approve or reject your
                aggregator verification.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sprout size={20} className="text-emerald-700" />
                <h2 className="font-bold text-gray-900">
                  Your role
                </h2>
              </div>

              <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">
                  AgroLink Aggregator
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Coordinate with farmers and help connect agricultural
                  produce with buyers.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-gray-500" />
                <h2 className="font-bold text-gray-900">
                  Profile checklist
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Full name",
                    complete: Boolean(profile.full_name.trim()),
                  },
                  {
                    label: "Business name",
                    complete: Boolean(profile.business_name.trim()),
                  },
                  {
                    label: "Business address",
                    complete: Boolean(profile.farm_location.trim()),
                  },
                  {
                    label: "Operating area",
                    complete: Boolean(profile.lga_location.trim()),
                  },
                  {
                    label: "Email address",
                    complete: Boolean(user?.email),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-gray-600">
                      {item.label}
                    </span>
                    {item.complete ? (
                      <CheckCircle2
                        size={17}
                        className="shrink-0 text-emerald-600"
                      />
                    ) : (
                      <AlertCircle
                        size={17}
                        className="shrink-0 text-amber-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500">
                This checklist checks profile fields only. It does not confirm
                that your verification documents have been approved.
              </p>
            </section>
          </aside>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          AgroLink · Aggregator account settings
        </p>
      </div>
    </div>
  );
}
