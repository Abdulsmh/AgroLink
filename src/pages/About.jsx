
import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  MapPin,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
  Wheat,
  ShoppingBasket,
  PackageCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const values = [
  {
    icon: ShieldCheck,
    title: 'Trust and Verification',
    description:
      'Verification helps build confidence in participating farmers and the products listed on the marketplace.',
  },
  {
    icon: Handshake,
    title: 'Stronger Connections',
    description:
      'We connect producers, trusted community aggregators, and buyers through one agricultural marketplace.',
  },
  {
    icon: TrendingUp,
    title: 'Transparent Pricing',
    description:
      'Clear product quantities and prices help users make more informed buying and selling decisions.',
  },
  {
    icon: Sprout,
    title: 'Support for Farmers',
    description:
      'We aim to make agricultural market access easier, including for farmers who need assistance using digital tools.',
  },
];

const steps = [
  {
    number: '01',
    icon: Users,
    title: 'Producers Join',
    description:
      'Farmers register and list available produce or upcoming harvests for potential buyers.',
  },
  {
    number: '02',
    icon: ShieldCheck,
    title: 'Build Trust',
    description:
      'The platform supports account verification and clearer information about listed produce.',
  },
  {
    number: '03',
    icon: ShoppingBasket,
    title: 'Buyers Discover',
    description:
      'Buyers explore available produce, review quantities and prices, and place suitable orders.',
  },
  {
    number: '04',
    icon: PackageCheck,
    title: 'Coordinate Collection',
    description:
      'Buyers and producers can coordinate orders for collection, with trusted aggregators supporting participating farmers where needed.',
  },
];

const AgroLinkLogo = ({ className = 'h-8 w-8' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="130 85 250 250"
    className={className}
    fill="currentColor"
    role="img"
    aria-label="AgroLink logo"
  >
    <path d="M170 150C195 112 275 98 347 148C300 188 215 192 170 150Z" />
    <path d="M160 165C148 232 185 300 240 324C256 272 246 230 214 192C196 177 178 169 160 165Z" />
    <path d="M358 172C372 240 330 306 268 324C258 272 270 230 300 196C320 185 340 178 358 172Z" />
  </svg>
);

export const About = () => {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-emerald-700/20 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              <AgroLinkLogo className="h-4 w-4" />
              About AgroLink
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Connecting farms
              <span className="block text-emerald-400">
                to opportunities.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              AgroLink is an agricultural marketplace designed to connect
              producers, trusted community aggregators, and buyers. Our goal
              is to make agricultural trade more accessible, transparent, and
              convenient across Kano State.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
              >
                Explore Products
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/10"
              >
                Join AgroLink
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Farmer-focused
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Transparent listings
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 rounded-[2rem] bg-emerald-400/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950">
                    <AgroLinkLogo className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white">AgroLink</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Agricultural Marketplace
                    </p>
                  </div>
                </div>
                <Sprout className="h-6 w-6 text-emerald-400" />
              </div>

              <div className="py-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Our purpose
                </p>
                <h2 className="mt-3 text-2xl font-black leading-snug text-white sm:text-3xl">
                  Better connections.
                  <span className="block text-emerald-400">
                    Stronger agriculture.
                  </span>
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Bringing product discovery, harvest opportunities, and
                  agricultural relationships into one accessible platform.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <Wheat className="h-5 w-5 text-emerald-400" />
                  <p className="mt-3 text-sm font-bold text-white">
                    Local Produce
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Discover available crops and harvest opportunities.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <Users className="h-5 w-5 text-emerald-400" />
                  <p className="mt-3 text-sm font-bold text-white">
                    Connected People
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Bring farmers and buyers closer together.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Rooted in Kano State
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Designed around local agricultural trade and community
                    connections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and vision */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Sprout className="h-6 w-6" />
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              Our Mission
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Making agricultural trade more accessible.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Our mission is to provide a practical digital platform where
              farmers can showcase their produce, buyers can discover
              agricultural products, and trusted aggregators can help connect
              farmers with market opportunities.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              Our Vision
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              A more connected agricultural value chain.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              We envision an agricultural marketplace where access to product
              information and potential buyers is easier, relationships are
              built on trust, and digital tools help create more opportunities
              for local agricultural communities.
            </p>
          </article>
        </div>
      </section>

      {/* Core values */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              What Guides Us
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Built around trust and opportunity
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Our approach focuses on the needs of the people who grow,
              connect, and buy agricultural produce.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.title}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-extrabold text-slate-900">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
            How AgroLink Works
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            From product discovery to collection
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            AgroLink brings key parts of the agricultural buying and selling
            journey together in a single platform.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-widest text-emerald-700">
                    {step.number}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Kano focus */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">
                <MapPin className="h-4 w-4" />
                Our Local Focus
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                Rooted in Kano. Focused on agricultural opportunity.
              </h2>
              <p className="mt-5 text-sm leading-7 text-emerald-50/80 sm:text-base">
                Kano has important farming communities and agricultural
                trading markets. AgroLink aims to help connect local producers
                and buyers, including communities around areas such as Kura
                and Kadawa and commercial markets such as Dawanau and Singer.
                Our focus is on improving access to product information and
                making agricultural connections easier.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
