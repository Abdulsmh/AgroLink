
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  LockKeyhole,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const PROFILE_FIELDS =
  'id, full_name, phone_number, role, lga_location, verification_status';

const OPERATING_AREAS = [
  'Kano Central',
  'Kano South',
  'Kano West',
  'Kano East',
  'Kano North',
];

const VERIFICATION_STATES = {
  approved: {
    label: 'Verified',
    description: 'Your aggregator account has been approved.',
    icon: BadgeCheck,
    styles: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Under review',
    description:
      'Your account is awaiting admin review. Some aggregator features may remain unavailable.',
    icon: Clock3,
    styles: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  rejected: {
    label: 'Not approved',
    description:
      'Your verification was not approved. Contact AgroLink support or follow the instructions provided by the admin.',
    icon: AlertCircle,
    styles: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
};

const normalizeProfile = (row) => ({
  id: row?.id ?? '',
  full_name: row?.full_name ?? '',
  phone_number: row?.phone_number ?? '',
  lga_location: row?.lga_location ?? '',
  role: row?.role ?? '',
  verification_status: String(
    row?.verification_status ?? 'pending'
  ).toLowerCase(),
});

const getErrorMessage = (error) => {
  if (!error) return 'Something went wrong. Please try again.';

  if (error.code === '42501') {
    return 'You are not permitted to update this profile. Check your Supabase profile policies.';
  }

  if (error.code === '23505') {
    return 'This information conflicts with an existing record.';
  }

  if (error.code === '23503') {
    return 'This profile update references a record that does not exist.';
  }

  if (error.code === 'PGRST116') {
    return 'Your profile could not be found. Please sign in again or contact the administrator.';
  }

  return error.message || 'Something went wrong. Please try again.';
};

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50';

const labelClass = 'text-sm font-semibold text-slate-700';

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon size={19} />
      </div>
      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Notice({ type = 'info', children }) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  const Icon =
    type === 'success'
      ? CheckCircle2
      : type === 'error'
        ? AlertCircle
        : type === 'warning'
          ? Clock3
          : Info;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${styles[type]}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function AggregatorProfile() {
  const {
    user,
    userProfile,
    isLoading: authLoading,
    updateUserProfile,
  } = useAuth();

  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    lga_location: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Refs let asynchronous requests and realtime callbacks read the
  // latest state without recreating subscriptions on every render.
  const editingRef = useRef(editing);
  const savingRef = useRef(saving);
  const requestIdRef = useRef(0);

  editingRef.current = editing;
  savingRef.current = saving;

  const verificationStatus = String(
    profile?.verification_status ??
      userProfile?.verification_status ??
      'pending'
  ).toLowerCase();

  const verification =
    VERIFICATION_STATES[verificationStatus] ??
    VERIFICATION_STATES.pending;

  const VerificationIcon = verification.icon;

  const hasChanges = useMemo(() => {
    if (!profile) return false;

    return (
      form.full_name.trim() !== profile.full_name ||
      form.phone_number.trim() !== profile.phone_number ||
      form.lga_location.trim() !== profile.lga_location
    );
  }, [form, profile]);

  const syncProfile = useCallback((row) => {
    const normalized = normalizeProfile(row);

    setProfile(normalized);

    // Never overwrite a form that the aggregator is currently editing
    // or saving.
    if (!editingRef.current && !savingRef.current) {
      setForm({
        full_name: normalized.full_name,
        phone_number: normalized.phone_number,
        lga_location: normalized.lga_location,
      });
    }

    return normalized;
  }, []);

  const loadProfile = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (!user?.id) {
        setProfile(null);
        setLoading(false);
        setRefreshing(false);
        setError(
          'Your session could not be identified. Please sign in again.'
        );
        return;
      }

      const requestId = ++requestIdRef.current;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .eq('id', user.id)
          .maybeSingle();

        // Ignore a response from an older request.
        if (requestId !== requestIdRef.current) return;

        if (queryError) throw queryError;

        if (!data) {
          setProfile(null);
          setError(
            'Your AgroLink profile was not found. Sign out and sign in again. If the problem continues, contact the administrator.'
          );
          return;
        }

        if (data.role !== 'aggregator') {
          setProfile(data);
          setError(
            'This page is intended for aggregator accounts. Your account role does not currently match.'
          );
          return;
        }

        syncProfile(data);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;

        console.error('Aggregator profile load failed:', err);
        setError(getErrorMessage(err));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user?.id, syncProfile]
  );

  // Load the profile after authentication has finished.
  useEffect(() => {
    if (authLoading) return;

    loadProfile();

    return () => {
      // Invalidate any outstanding request when the user changes or
      // the component unmounts.
      requestIdRef.current += 1;
    };
  }, [authLoading, loadProfile]);

  // Subscribe directly to the signed-in aggregator's profile.
  // Admin verification decisions and profile changes can then appear
  // without requiring a manual refresh.
  useEffect(() => {
    if (authLoading || !user?.id) return;

    let active = true;

    const channel = supabase
      .channel(`aggregator-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (!active) return;

          if (payload.eventType === 'DELETE') {
            setProfile(null);
            setError(
              'Your AgroLink profile is no longer available. Please contact the administrator.'
            );
            return;
          }

          const row = payload.new;

          if (!row?.id) return;

          if (row.role !== 'aggregator') {
            setProfile(row);
            setError(
              'This page is intended for aggregator accounts. Your account role does not currently match.'
            );
            return;
          }

          setError('');
          syncProfile(row);
        }
      )
      .subscribe((status) => {
        if (
          active &&
          status === 'CHANNEL_ERROR'
        ) {
          console.error(
            'Aggregator profile realtime subscription failed. Check Supabase Realtime configuration and profile access policies.'
          );
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id, syncProfile]);

  /*
   * Keep this page aligned with AuthContext updates initiated by
   * other parts of AgroLink. Do not replace active form edits.
   */
  useEffect(() => {
    if (!userProfile || userProfile.id !== user?.id) return;

    if (userProfile.role !== 'aggregator') return;

    syncProfile(userProfile);
  }, [userProfile, user?.id, syncProfile]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        lga_location: profile.lga_location,
      });
    }

    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user?.id || !profile) {
      setError(
        'Your profile is unavailable. Refresh the page and try again.'
      );
      return;
    }

    if (profile.role !== 'aggregator') {
      setError(
        'Your account is not authorized to edit an aggregator profile.'
      );
      return;
    }

    const fullName = form.full_name.trim();
    const phoneNumber = form.phone_number.trim();
    const lgaLocation = form.lga_location.trim();

    if (!fullName) {
      setError('Please enter your full name.');
      return;
    }

    if (fullName.length > 120) {
      setError('Your full name must not exceed 120 characters.');
      return;
    }

    if (phoneNumber.length > 30) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (!lgaLocation) {
      setError('Please select your operating area.');
      return;
    }

    if (!OPERATING_AREAS.includes(lgaLocation) &&
        lgaLocation !== profile.lga_location) {
      setError('Please select a valid operating area.');
      return;
    }

    if (!hasChanges) {
      setSuccess('Your profile is already up to date.');
      setEditing(false);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const updates = {
      full_name: fullName,
      phone_number: phoneNumber || null,
      lga_location: lgaLocation,
    };

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .eq('role', 'aggregator')
        .select(PROFILE_FIELDS)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          'No profile was updated. Check that your profile exists and that your Supabase UPDATE and SELECT policies allow you to access your own profile.'
        );
      }

      if (data.role !== 'aggregator') {
        throw new Error(
          'The returned profile is not an aggregator profile. Please contact the administrator.'
        );
      }

      const normalized = normalizeProfile(data);

      // Update the database-backed page state.
      setProfile(normalized);
      setForm({
        full_name: normalized.full_name,
        phone_number: normalized.phone_number,
        lga_location: normalized.lga_location,
      });

      // Keep shared authentication state in sync with the saved profile.
      if (typeof updateUserProfile === 'function') {
        updateUserProfile(data);
      } else {
        console.error(
          'updateUserProfile is missing from AuthContext. The database was updated, but shared profile state may not refresh immediately.'
        );
      }

      setEditing(false);
      setSuccess('Your profile has been updated successfully.');
    } catch (err) {
      console.error('Aggregator profile update failed:', err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    if (refreshing || saving) return;

    loadProfile({ isRefresh: true });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Loader2 size={27} className="animate-spin" />
          </div>
          <h2 className="mt-5 font-bold text-slate-900">
            Loading your profile
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please wait while AgroLink retrieves your information.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-[60vh] bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={27} />
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Profile unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error || 'AgroLink could not load your profile.'}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Try again
          </button>
        </div>
      </main>
    );
  }

  const initials =
    profile.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'AG';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Building2 size={16} />
              AgroLink Aggregator Portal
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              My profile
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Keep your contact information and operating area accurate so
              AgroLink can coordinate your aggregator activities.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {refreshing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Refresh
          </button>
        </header>

        {error && <Notice type="error">{error}</Notice>}
        {success && <Notice type="success">{success}</Notice>}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400" />

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-800 ring-4 ring-emerald-50 sm:h-20 sm:w-20 sm:text-2xl">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Aggregator account
                  </p>
                  <h2 className="mt-1 break-words text-xl font-extrabold text-slate-950 sm:text-2xl">
                    {profile.full_name || 'Name not provided'}
                  </h2>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {user?.email || 'Email is managed by your sign-in account'}
                  </p>
                </div>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold ${verification.styles}`}
              >
                <span className={`h-2 w-2 rounded-full ${verification.dot}`} />
                <VerificationIcon size={17} />
                {verification.label}
              </div>
            </div>

            <div className={`mt-6 rounded-2xl border p-4 ${verification.styles}`}>
              <div className="flex items-start gap-3">
                <VerificationIcon size={21} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{verification.label}</p>
                  <p className="mt-1 text-sm leading-6">
                    {verification.description}
                  </p>
                </div>
              </div>
            </div>

            {verificationStatus !== 'approved' && (
              <div className="mt-4">
                <Notice type="warning">
                  Your verification status is controlled by AgroLink
                  administrators. Editing your profile will not approve your
                  account or unlock restricted aggregator operations.
                </Notice>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading
              icon={UserRound}
              title="Personal and contact information"
              description="Review your details and update any information that has changed."
            />

            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setEditing(true);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                <Pencil size={16} />
                Edit profile
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="mt-7 space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Full name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserRound
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={form.full_name}
                    onChange={handleFieldChange}
                    disabled={!editing || saving}
                    placeholder="Enter your full name"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone_number" className={labelClass}>
                  Phone number
                </label>
                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={form.phone_number}
                    onChange={handleFieldChange}
                    disabled={!editing || saving}
                    placeholder="Enter your contact number"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Use a number where farmers and AgroLink can reach you.
                </p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="lga_location" className={labelClass}>
                  Operating area <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    id="lga_location"
                    name="lga_location"
                    required
                    value={form.lga_location}
                    onChange={handleFieldChange}
                    disabled={!editing || saving}
                    className={`${inputClass} appearance-none pl-10`}
                  >
                    <option value="" disabled>
                      Select your operating area
                    </option>

                    {form.lga_location &&
                      !OPERATING_AREAS.includes(form.lga_location) && (
                        <option value={form.lga_location}>
                          {form.lga_location} (current value)
                        </option>
                      )}

                    {OPERATING_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Select the area where you coordinate farmers. Your current
                  value is preserved if it is not in the available options.
                </p>
              </div>
            </div>

            {editing && (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <X size={17} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? 'Saving changes...' : 'Save changes'}
                </button>
              </div>
            )}

            {!editing && (
              <div className="flex items-start gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
                <LockKeyhole size={15} className="mt-0.5 shrink-0" />
                Your role and verification status cannot be changed from this
                form.
              </div>
            )}
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionHeading
            icon={ShieldCheck}
            title="Account and verification"
            description="Important information about your AgroLink account permissions."
          />

          <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Building2 size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  Account role
                </p>
                <p className="mt-1 text-sm text-slate-500">Aggregator</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Role changes must follow AgroLink’s authorized approval
                  process.
                </p>
              </div>
              <LockKeyhole size={17} className="mt-1 shrink-0 text-slate-400" />
            </div>

            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <ShieldCheck size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  Verification status
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {verification.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Only an authorized administrator can change this status.
                </p>
              </div>
              <LockKeyhole size={17} className="mt-1 shrink-0 text-slate-400" />
            </div>

            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Phone size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  Contact information
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.phone_number || 'No phone number added'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Keep your phone number up to date for account-related
                  communication.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200 px-1 pt-4 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>AgroLink · Aggregator profile</span>
          <span>
            Your account information is managed securely through AgroLink.
          </span>
        </footer>
      </div>
    </main>
  );
}
