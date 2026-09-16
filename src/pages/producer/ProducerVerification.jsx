import React, { useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock3,
  XCircle,
  User,
  MapPin,
  Sprout,
  Building2,
  Phone,
  ArrowRight,
  Info,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const statusMap = {
  approved: {
    label: 'Verified Producer',
    shortLabel: 'Approved',
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconBg: 'bg-emerald-100',
    description:
      'Your producer account has been approved and is ready to operate on AgroLink.',
  },

  pending: {
    label: 'Verification Pending',
    shortLabel: 'Pending Review',
    icon: Clock3,
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
    iconBg: 'bg-amber-100',
    description:
      'Your producer information has not been approved yet. Please keep your profile information accurate and up to date.',
  },

  rejected: {
    label: 'Verification Requires Attention',
    shortLabel: 'Rejected',
    icon: XCircle,
    className:
      'border-red-200 bg-red-50 text-red-700',
    iconBg: 'bg-red-100',
    description:
      'Your producer verification was not approved. Review your profile information and contact AgroLink administration for the next step.',
  },
};

export const ProducerVerification = () => {
  const { userProfile } = useAuth();

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const status =
    statusMap[verificationStatus] || statusMap.pending;

  const StatusIcon = status.icon;

  const profileFields = [
    userProfile?.full_name,
    userProfile?.phone_number,
    userProfile?.lga_location,
    userProfile?.farm_name,
    userProfile?.farm_location,
    userProfile?.farm_size,
    userProfile?.farm_type,
  ];

  const completedFields = profileFields.filter(
    (field) => field && String(field).trim()
  ).length;

  const profileCompletion = Math.round(
    (completedFields / profileFields.length) * 100
  );

  const isApproved = verificationStatus === 'approved';
  const isRejected = verificationStatus === 'rejected';

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-lime-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-600">
                Producer Workspace
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Verification Center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Check the verification status of your producer
                account and review the information connected to it.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${status.className}`}
          >
            <StatusIcon className="h-4 w-4" />
            {status.shortLabel}
          </div>
        </div>
      </section>

      {/* Status card */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6 ${status.className}`}
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${status.iconBg}`}
          >
            <StatusIcon className="h-7 w-7" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">
              Current status
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              {status.label}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">
              {status.description}
            </p>
          </div>
        </div>
      </section>

      {/* Verification progress */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Profile readiness
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Keep your information complete
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete producer details make your profile easier to
              review and understand.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-2xl font-bold text-emerald-600">
              {profileCompletion}%
            </p>

            <p className="text-xs font-medium text-slate-400">
              Profile information
            </p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-4 w-4 text-slate-400" />

          {profileCompletion === 100
            ? 'Your main producer information is complete.'
            : 'You can improve your profile by adding the missing information.'}
        </div>
      </section>

      {/* Verification process */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Verification Process
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Your producer status follows the AgroLink review process.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <ProcessStep
            number="01"
            title="Profile Information"
            description="Your producer and farm information is kept on your account."
            active
            completed={profileCompletion === 100}
          />

          <ProcessStep
            number="02"
            title="AgroLink Review"
            description="The AgroLink administration team reviews your producer account."
            active={verificationStatus !== 'rejected'}
            completed={isApproved}
          />

          <ProcessStep
            number="03"
            title="Producer Approval"
            description="Approved producers can continue using AgroLink as verified producers."
            active={isApproved}
            completed={isApproved}
          />
        </div>
      </section>

      {/* Producer information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="font-bold text-slate-900">
            Information Under Review
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            These are the producer details currently connected to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
          <InfoItem
            icon={User}
            label="Full name"
            value={userProfile?.full_name}
          />

          <InfoItem
            icon={Phone}
            label="Phone number"
            value={userProfile?.phone_number}
          />

          <InfoItem
            icon={MapPin}
            label="LGA"
            value={userProfile?.lga_location}
          />

          <InfoItem
            icon={Sprout}
            label="Farm name"
            value={userProfile?.farm_name}
          />

          <InfoItem
            icon={MapPin}
            label="Farm location"
            value={userProfile?.farm_location}
          />

          <InfoItem
            icon={Sprout}
            label="Farm size"
            value={userProfile?.farm_size}
          />

          <InfoItem
            icon={Sprout}
            label="Farm type"
            value={userProfile?.farm_type}
          />

          <InfoItem
            icon={Building2}
            label="Business name"
            value={userProfile?.business_name}
          />

          <InfoItem
            icon={MapPin}
            label="Business address"
            value={userProfile?.business_address}
          />
        </div>
      </section>

      {/* Status-specific message */}
      {isApproved && (
        <MessageBox
          type="success"
          icon={CheckCircle2}
          title="Your producer account is verified"
          text="You can continue managing your harvests, receiving orders, and using the producer workspace."
        />
      )}

      {verificationStatus === 'pending' && (
        <MessageBox
          type="warning"
          icon={Clock3}
          title="Your account is awaiting review"
          text="Your verification status is controlled by AgroLink administration. Keep your profile information accurate while your account is being reviewed."
        />
      )}

      {isRejected && (
        <MessageBox
          type="danger"
          icon={XCircle}
          title="Verification requires attention"
          text="Your account is currently not approved. Please review your profile information and contact AgroLink administration for guidance on the next step."
        />
      )}

      {/* Admin-controlled notice */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">
              Verification is managed by AgroLink
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Producers cannot directly approve, reject, or change
              their verification status. This helps keep producer
              verification trustworthy across the marketplace.
            </p>

            {!isApproved && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-600">
                <ArrowRight className="h-4 w-4" />
                Keep your profile information up to date
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const ProcessStep = ({
  number,
  title,
  description,
  active,
  completed,
}) => {
  return (
    <div
      className={`rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 ${
        active
          ? 'border-emerald-100 bg-emerald-50/50'
          : 'border-slate-100 bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold ${
            active ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {number}
        </span>

        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Clock3
            className={`h-5 w-5 ${
              active ? 'text-amber-500' : 'text-slate-300'
            }`}
          />
        )}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value || 'Not provided'}
      </p>
    </div>
  );
};

const MessageBox = ({ type, icon: Icon, title, text }) => {
  const styles = {
    success: {
      wrapper: 'border-emerald-200 bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      title: 'text-emerald-800',
      text: 'text-emerald-700/80',
    },

    warning: {
      wrapper: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      title: 'text-amber-800',
      text: 'text-amber-700/80',
    },

    danger: {
      wrapper: 'border-red-200 bg-red-50',
      icon: 'bg-red-100 text-red-600',
      title: 'text-red-800',
      text: 'text-red-700/80',
    },
  };

  const style = styles[type];

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${style.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className={`text-sm font-bold ${style.title}`}>
            {title}
          </h2>

          <p className={`mt-1 text-sm leading-6 ${style.text}`}>
            {text}
          </p>
        </div>
      </div>
    </section>
  );
};
