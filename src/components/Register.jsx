import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Sprout,
  UserRound,
  MapPin,
  Building2,
  Tractor,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { supabase } from '../config/supabaseClient';

const KANO_ZONES = [
  'Kano Central',
  'Kano South',
  'Kano West',
  'Kano East',
  'Kano North',
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100';

const simpleInputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';

const parseErrorMessage = (error) => {
  if (typeof error === 'string') return error;

  if (error?.message && error.message !== '{}') {
    if (error.message.toLowerCase().includes('already registered')) {
      return 'This email is already registered. Please log in instead.';
    }

    return error.message;
  }

  if (error?.error_description) {
    return error.error_description;
  }

  return 'Registration failed. Please check your details and try again.';
};

const FieldLabel = ({ children, required = false }) => {
  return (
    <label className="mb-2 block text-sm font-bold text-slate-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
};

const IconInput = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  autoComplete,
}) => {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>

      <div className="relative">
        <Icon
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={inputClass}
        />
      </div>
    </div>
  );
};

export const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    lgaLocation: '',
    role: 'buyer',

    farmName: '',
    farmLocation: '',
    farmSize: '',
    farmType: '',

    businessName: '',
    businessAddress: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrorMessage('');
  };

  const passwordStrength = useMemo(() => {
    const password = formData.password;

    if (!password) {
      return {
        label: 'Enter a password',
        width: '0%',
        className: 'bg-slate-200',
      };
    }

    if (password.length < 6) {
      return {
        label: 'Too short',
        width: '25%',
        className: 'bg-red-500',
      };
    }

    if (password.length < 8) {
      return {
        label: 'Fair password',
        width: '50%',
        className: 'bg-amber-500',
      };
    }

    if (
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    ) {
      return {
        label: 'Strong password',
        width: '100%',
        className: 'bg-emerald-600',
      };
    }

    return {
      label: 'Good password',
      width: '75%',
      className: 'bg-emerald-400',
    };
  }, [formData.password]);

  const validateForm = () => {
    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phoneNumber.trim() ||
      !formData.lgaLocation
    ) {
      return 'Please complete your name, email, phone number, and Kano zone.';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    if (formData.role === 'producer') {
      if (
        !formData.farmName.trim() ||
        !formData.farmLocation.trim() ||
        !formData.farmSize.trim() ||
        !formData.farmType
      ) {
        return 'Please complete all farmer verification requirements.';
      }
    }

    if (formData.role === 'aggregator') {
      if (
        !formData.businessName.trim() ||
        !formData.businessAddress.trim()
      ) {
        return 'Please complete all aggregator verification requirements.';
      }
    }

    return null;
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const metadata = {
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim(),
        role: formData.role,
        lga_location: formData.lgaLocation,

        farm_name:
          formData.role === 'producer' ? formData.farmName.trim() : null,

        farm_location:
          formData.role === 'producer'
            ? formData.farmLocation.trim()
            : null,

        farm_size:
          formData.role === 'producer' ? formData.farmSize.trim() : null,

        farm_type:
          formData.role === 'producer' ? formData.farmType : null,

        business_name:
          formData.role === 'aggregator'
            ? formData.businessName.trim()
            : null,

        business_address:
          formData.role === 'aggregator'
            ? formData.businessAddress.trim()
            : null,
      };

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: {
            data: metadata,
          },
        });

      if (authError) {
        throw authError;
      }

      if (!authData?.user?.id) {
        throw new Error('User creation failed. No user ID was returned.');
      }

      if (!authData.session) {
        setSuccessMessage(
          'Registration successful. Please check your email to confirm your account before logging in.'
        );

        toast.success('Account created. Check your email.');
        return;
      }

      toast.success('Account created successfully.');

      if (
        formData.role === 'producer' ||
        formData.role === 'aggregator'
      ) {
        navigate('/producer/dashboard', { replace: true });
      } else {
        navigate('/buyer/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Registration Exception:', error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[0.85fr_1.15fr]">
        {/* Brand panel */}
        <section className="hidden flex-col justify-between bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 p-10 text-white lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="rounded-2xl bg-white/15 p-3">
                <Sprout size={28} />
              </span>

              <span className="text-2xl font-black tracking-tight">
                AgroLink
              </span>
            </Link>

            <div className="mt-24">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                Join the marketplace
              </p>

              <h1 className="max-w-md text-5xl font-black leading-tight">
                Your next opportunity starts here.
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-emerald-100">
                Create your AgroLink account and become part of a growing
                agricultural marketplace connecting buyers, farmers, and
                aggregators.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-emerald-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} />
              Connect with agricultural producers
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} />
              Track orders and marketplace activity
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} />
              Access a role suited to your needs
            </div>
          </div>
        </section>

        {/* Registration form */}
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 lg:hidden">
                <Sprout size={30} />
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
                Account registration
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Create your AgroLink account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your account type and provide the details below.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-700"
              >
                {successMessage}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Account role */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <FieldLabel required>Select account type</FieldLabel>

                <select
                  value={formData.role}
                  onChange={(event) =>
                    updateField('role', event.target.value)
                  }
                  className={simpleInputClass}
                >
                  <option value="buyer">
                    Buyer / Retailer — Instant Access
                  </option>
                  <option value="producer">
                    Farmer / Producer — Requires Verification
                  </option>
                  <option value="aggregator">
                    Aggregator / Field Agent — Requires Verification
                  </option>
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {formData.role === 'buyer' &&
                    'Buyers can browse products and place orders after registration.'}

                  {formData.role === 'producer' &&
                    'Producer accounts require administrator verification before full marketplace access.'}

                  {formData.role === 'aggregator' &&
                    'Aggregator accounts require administrator verification before full marketplace access.'}
                </p>
              </div>

              {/* Basic information */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                  <UserRound size={20} className="text-emerald-600" />
                  Personal information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <IconInput
                    id="fullName"
                    label="Full name"
                    icon={UserRound}
                    value={formData.fullName}
                    onChange={(event) =>
                      updateField('fullName', event.target.value)
                    }
                    placeholder="e.g. Ibrahim Sani"
                    autoComplete="name"
                    required
                  />

                  <IconInput
                    id="phoneNumber"
                    label="Phone number"
                    icon={Phone}
                    value={formData.phoneNumber}
                    onChange={(event) =>
                      updateField('phoneNumber', event.target.value)
                    }
                    placeholder="08030000000"
                    type="tel"
                    autoComplete="tel"
                    required
                  />

                  <IconInput
                    id="email"
                    label="Email address"
                    icon={Mail}
                    value={formData.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />

                  <div>
                    <FieldLabel required>Kano zone</FieldLabel>

                    <div className="relative">
                      <MapPin
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <select
                        required
                        value={formData.lgaLocation}
                        onChange={(event) =>
                          updateField('lgaLocation', event.target.value)
                        }
                        className={`${inputClass} appearance-auto`}
                      >
                        <option value="">Select Kano zone</option>

                        {KANO_ZONES.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Producer fields */}
              {formData.role === 'producer' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-emerald-900">
                    <Tractor size={20} />
                    Farmer verification details
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <FieldLabel required>Farm name</FieldLabel>

                      <input
                        type="text"
                        required
                        value={formData.farmName}
                        onChange={(event) =>
                          updateField('farmName', event.target.value)
                        }
                        placeholder="e.g. Sani Family Farms"
                        className={simpleInputClass}
                      />
                    </div>

                    <div>
                      <FieldLabel required>Farm location</FieldLabel>

                      <input
                        type="text"
                        required
                        value={formData.farmLocation}
                        onChange={(event) =>
                          updateField('farmLocation', event.target.value)
                        }
                        placeholder="e.g. Kadawa Irrigation Site"
                        className={simpleInputClass}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel required>Farm size</FieldLabel>

                        <input
                          type="text"
                          required
                          value={formData.farmSize}
                          onChange={(event) =>
                            updateField('farmSize', event.target.value)
                          }
                          placeholder="e.g. 5 hectares"
                          className={simpleInputClass}
                        />
                      </div>

                      <div>
                        <FieldLabel required>Farm type</FieldLabel>

                        <select
                          required
                          value={formData.farmType}
                          onChange={(event) =>
                            updateField('farmType', event.target.value)
                          }
                          className={simpleInputClass}
                        >
                          <option value="">Select farm type</option>
                          <option value="Crop Farming">
                            Crop Farming
                          </option>
                          <option value="Livestock Farming">
                            Livestock Farming
                          </option>
                          <option value="Mixed Farming">
                            Mixed Farming
                          </option>
                          <option value="Irrigation Farming">
                            Irrigation Farming
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aggregator fields */}
              {formData.role === 'aggregator' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-blue-900">
                    <Building2 size={20} />
                    Aggregator verification details
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <FieldLabel required>Business name</FieldLabel>

                      <input
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(event) =>
                          updateField('businessName', event.target.value)
                        }
                        placeholder="e.g. Kano Grain Aggregators"
                        className={simpleInputClass}
                      />
                    </div>

                    <div>
                      <FieldLabel required>Business address</FieldLabel>

                      <input
                        type="text"
                        required
                        value={formData.businessAddress}
                        onChange={(event) =>
                          updateField('businessAddress', event.target.value)
                        }
                        placeholder="e.g. Singer Market, Shop 12"
                        className={simpleInputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                  <LockKeyhole size={20} className="text-emerald-600" />
                  Account security
                </h3>

                <FieldLabel required>Password</FieldLabel>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(event) =>
                      updateField('password', event.target.value)
                    }
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.className}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {passwordStrength.label}. Use at least 6 characters.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create AgroLink Account'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-black text-emerald-700 transition hover:text-emerald-800"
              >
                Sign in here
              </Link>
            </p>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              By registering, you agree to provide accurate information for
              your AgroLink account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Register;