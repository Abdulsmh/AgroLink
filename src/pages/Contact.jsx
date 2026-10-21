
import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SUPPORT_EMAIL = 'support@AgroLink.kano.ng';

const INITIAL_FORM = {
  name: '',
  email: '',
  subject: 'General Inquiry',
  message: '',
};

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10';

const Contact = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const message = formData.message.trim();

    if (!name || !email || !subject || !message) {
      toast.error('Please complete all fields before continuing.');
      return;
    }

    if (message.length < 10) {
      toast.error('Please provide a little more detail in your message.');
      return;
    }

    setIsSubmitting(true);

    try {
      const emailSubject = `[AgroLink Contact] ${subject}`;

      const emailBody = [
        `Name: ${name}`,
        `Email: ${email}`,
        '',
        'Message:',
        message,
      ].join('\n');

      const mailtoUrl =
        `mailto:${SUPPORT_EMAIL}` +
        `?subject=${encodeURIComponent(emailSubject)}` +
        `&body=${encodeURIComponent(emailBody)}`;

      window.location.href = mailtoUrl;

      toast.success(
        'Your email app should open with your message prepared. Send it there to contact us.'
      );
    } catch (error) {
      console.error('Unable to prepare contact email:', error);

      toast.error(
        'Unable to open your email app. Please contact support directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-700/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">
              <MessageCircle className="h-4 w-4" />
              Contact AgroLink
            </span>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Let's grow
              <span className="block text-emerald-400">
                together.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Have a question about agricultural products, farmer verification,
              pre-harvest bookings, or bulk orders? We're here to help you
              navigate the AgroLink marketplace.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Agricultural marketplace support
              </span>

              <span className="inline-flex items-center gap-2">
                <Sprout className="h-4 w-4 text-emerald-400" />
                Built for Kano and beyond
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact content */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5 lg:gap-10">

          {/* Contact information */}
          <aside className="space-y-6 lg:col-span-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                Get in touch
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                We'd love to hear from you.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Choose the contact option that works best for you, or send us
                a detailed message using the form.
              </p>
            </div>

            <div className="space-y-4">

              {/* Email */}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <Mail className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-slate-900">
                    Email Support
                  </span>

                  <span className="mt-1 block break-all text-sm text-slate-600">
                    {SUPPORT_EMAIL}
                  </span>

                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    Contact us by email
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </span>
              </a>

              {/* Phone */}
              <a
                href="tel:+2348111113205"
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <Phone className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-slate-900">
                    Phone
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    +234 81-1111-3205
                  </span>

                  <span className="mt-2 block text-xs text-slate-500">
                    Tap to call from your device
                  </span>
                </span>
              </a>

              {/* Location */}
              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MapPin className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Location
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Fagge Commercial District,
                    Kano State, Nigeria
                  </p>
                </div>
              </div>
            </div>

            {/* Helpful note */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Need help with an order?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Include your order details and the issue you're
                    experiencing so the support team can understand your
                    request.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Contact form */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
              <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                Send us a message
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete the form below to prepare an email for our support
                team. Your email app will open so you can review and send it.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Full name
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={inputClassName}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email address
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputClassName}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="contact-subject"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  What can we help you with?
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <select
                  id="contact-subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className={inputClassName}
                >
                  <option value="General Inquiry">
                    General inquiry
                  </option>

                  <option value="Account and Verification">
                    Account and verification
                  </option>

                  <option value="Marketplace Order">
                    Marketplace order
                  </option>

                  <option value="Pre-Harvest Booking">
                    Pre-harvest booking
                  </option>

                  <option value="Post-Harvest Products">
                    Post-harvest products
                  </option>

                  <option value="Aggregator Support">
                    Aggregator support
                  </option>

                  <option value="Technical Issue">
                    Technical issue or bug
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* Message */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-bold text-slate-700"
                  >
                    Your message
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <span className="text-xs text-slate-400">
                    {formData.message.length}/2000
                  </span>
                </div>

                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={6}
                  minLength={10}
                  maxLength={2000}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help. Please include relevant order details if applicable."
                  className={`${inputClassName} min-h-36 resize-y`}
                />
              </div>

              {/* Privacy note */}
              <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                <p>
                  Please do not include passwords or other confidential
                  account information in your message.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />

                {isSubmitting
                  ? 'Preparing email...'
                  : 'Prepare & Send Message'}

                {!isSubmitting && (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Your default email app must be configured to send the message.
              </p>
            </form>
          </section>
        </div>

        {/* Bottom reassurance */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center sm:px-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </span>

          <h2 className="mt-4 text-lg font-black text-slate-900">
            Every question matters.
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Whether you're a farmer listing produce, an aggregator supporting
            local farmers, or a buyer sourcing agricultural products, AgroLink
            is designed to make agricultural trade more accessible.
          </p>
        </div>
      </section>
    </main>
  );
};

export { Contact };
export default Contact;
