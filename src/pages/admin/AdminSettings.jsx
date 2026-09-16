import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminSettings = () => {
  const [verificationRequired, setVerificationRequired] = useState(true);

  const handleSave = () => {
    toast.success(
      'Settings updated for this session. Persistent platform configuration will be added later.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Settings className="h-5 w-5" />
          </div>

          <div>
            <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
              Platform Configuration
            </span>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              System Admin Settings
            </h1>

            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              Manage operational policies and configuration options for
              the AgroLink marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

        <div>
          <p className="text-xs font-bold text-blue-800">
            Configuration storage
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            These settings are currently interface-level controls.
            Persistent platform settings will require a dedicated
            configuration table in Supabase.
          </p>
        </div>
      </div>

      {/* Main Settings */}
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
            <Sliders className="h-4 w-4 text-emerald-600" />
            Global Operational Parameters
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Configure the current marketplace operating policies.
          </p>
        </div>

        <div className="space-y-4">
          {/* Producer Verification */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Shield className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Mandatory Producer Verification
                  </h4>

                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                    Require producer verification before approved
                    producers can operate within the marketplace.
                  </p>
                </div>
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-3">
                <span
                  className={`text-xs font-bold ${
                    verificationRequired
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {verificationRequired ? 'Enabled' : 'Disabled'}
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={verificationRequired}
                  onClick={() =>
                    setVerificationRequired(
                      (current) => !current
                    )
                  }
                  className={`relative h-6 w-11 rounded-full transition ${
                    verificationRequired
                      ? 'bg-emerald-600'
                      : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      verificationRequired
                        ? 'left-6'
                        : 'left-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Commission */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Settings className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Marketplace Commission Rate
                  </h4>

                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                    Default platform service fee for eligible marketplace
                    transactions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900">
                  1.5%
                </span>

                <span className="rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-600">
                  Default
                </span>
              </div>
            </div>
          </div>

          {/* Verification Policy */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900">
                  Verification Policy
                </h4>

                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Producer accounts currently use the verification status
                  stored in the <strong>profiles</strong> table.
                  Administrators can approve or reject producer
                  verification from the Producer Approvals page.
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Controlled through Producer Approvals
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Future configuration */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Settings className="h-5 w-5 text-emerald-300" />
          </div>

          <div>
            <h3 className="text-sm font-black">
              Future platform controls
            </h3>

            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">
              A dedicated platform settings table can later store
              commission rates, verification requirements, marketplace
              policies, notification preferences, transaction limits and
              other administrator-controlled settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};