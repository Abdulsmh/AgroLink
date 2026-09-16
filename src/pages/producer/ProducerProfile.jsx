import React, { useEffect, useState } from 'react';
import {
  Save,
  User,
  MapPin,
  Sprout,
  Building2,
  Phone,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Tractor,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export const ProducerProfile = () => {
  const { user, userProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    lga_location: '',
    farm_name: '',
    farm_location: '',
    farm_size: '',
    farm_type: '',
    business_name: '',
    business_address: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    setForm({
      full_name: userProfile.full_name || '',
      phone_number: userProfile.phone_number || '',
      lga_location: userProfile.lga_location || '',
      farm_name: userProfile.farm_name || '',
      farm_location: userProfile.farm_location || '',
      farm_size: userProfile.farm_size || '',
      farm_type: userProfile.farm_type || '',
      business_name: userProfile.business_name || '',
      business_address: userProfile.business_address || '',
    });
  }, [userProfile]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Your session could not be found.');
      return;
    }

    if (!form.full_name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          phone_number: form.phone_number.trim() || null,
          lga_location: form.lga_location.trim() || null,
          farm_name: form.farm_name.trim() || null,
          farm_location: form.farm_location.trim() || null,
          farm_size: form.farm_size.trim() || null,
          farm_type: form.farm_type.trim() || null,
          business_name: form.business_name.trim() || null,
          business_address: form.business_address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        toast.error(error.message || 'Unable to update your profile.');
        return;
      }

      toast.success('Profile updated successfully.');
    } catch (error) {
      console.error('Profile update exception:', error);
      toast.error('Something went wrong while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const verificationLabel = {
    approved: 'Verified Producer',
    pending: 'Verification Pending',
    rejected: 'Verification Requires Attention',
  }[verificationStatus] || 'Verification Pending';

  const verificationStyles = {
    approved:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:
      'bg-amber-50 text-amber-700 border-amber-200',
    rejected:
      'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-lime-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <User className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-600">
                Producer Workspace
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Profile Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Keep your personal, farm, and business information
                up to date so buyers can better understand your
                operation.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${
              verificationStyles[verificationStatus] ||
              verificationStyles.pending
            }`}
          >
            {verificationStatus === 'approved' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}

            {verificationLabel}
          </div>
        </div>
      </div>

      {/* Account information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={User}
          title="Personal Information"
          description="Basic information connected to your producer account."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Full name"
            icon={User}
            value={form.full_name}
            onChange={(value) => updateField('full_name', value)}
            required
          />

          <Field
            label="Phone number"
            icon={Phone}
            value={form.phone_number}
            onChange={(value) => updateField('phone_number', value)}
            placeholder="e.g. 08012345678"
          />

          <div className="sm:col-span-2">
            <LockedField
              label="Email address"
              icon={User}
              value={user?.email || ''}
              helper="Your login email is managed through your account security settings."
            />
          </div>

          <Field
            label="LGA"
            icon={MapPin}
            value={form.lga_location}
            onChange={(value) => updateField('lga_location', value)}
            placeholder="e.g. Kano Central"
          />
        </div>
      </section>

      {/* Farm information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={Sprout}
          title="Farm Information"
          description="Tell buyers more about where and how you produce."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Farm name"
            icon={Sprout}
            value={form.farm_name}
            onChange={(value) => updateField('farm_name', value)}
            placeholder="e.g. Hassan Family Farm"
          />

          <Field
            label="Farm type"
            icon={Tractor}
            value={form.farm_type}
            onChange={(value) => updateField('farm_type', value)}
            placeholder="e.g. Crop farming"
          />

          <Field
            label="Farm location"
            icon={MapPin}
            value={form.farm_location}
            onChange={(value) => updateField('farm_location', value)}
            placeholder="e.g. Kura, Kano"
          />

          <Field
            label="Farm size"
            icon={Sprout}
            value={form.farm_size}
            onChange={(value) => updateField('farm_size', value)}
            placeholder="e.g. 5 hectares"
          />
        </div>
      </section>

      {/* Business information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={Building2}
          title="Business Information"
          description="Optional information about your farming business."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Business name"
            icon={Building2}
            value={form.business_name}
            onChange={(value) => updateField('business_name', value)}
            placeholder="e.g. Hassan Agro Farms"
          />

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Business address
            </label>

            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

              <textarea
                value={form.business_address}
                onChange={(event) =>
                  updateField('business_address', event.target.value)
                }
                rows={3}
                placeholder="Enter your business address"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 pl-10 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security / protected information */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <Lock className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Protected Account Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your account role, verification status, and account
              identity are protected and cannot be changed from this
              page. These details are managed securely by AgroLink.
            </p>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="sticky bottom-3 z-10 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
};

const Field = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || label}
          required={required}
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
    </div>
  );
};

const LockedField = ({ label, icon: Icon, value, helper }) => {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          <Lock className="h-3 w-3" />
          Protected
        </span>
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          disabled
          readOnly
          className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-500 outline-none"
        />

        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {helper && (
        <p className="mt-1.5 text-xs text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
};
