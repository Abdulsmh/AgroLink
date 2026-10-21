
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Mail,
  MapPin,
} from 'lucide-react';

const AgroLinkLogo = ({ className = 'h-9 w-9' }) => (
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

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 font-sans text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">

        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">

          {/* Brand */}
          <div className="lg:col-span-4">
            <Link
              to="/"
              aria-label="AgroLink home"
              className="group inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-emerald-500">
                <AgroLinkLogo />
              </span>

              <span className="text-2xl font-black tracking-tight text-white">
                Agro
                <span className="text-emerald-400">Link</span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Connecting farmers, producers, aggregators, and buyers through
              a transparent agricultural marketplace built for Kano and
              beyond.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/70" />
              Building better agricultural trade
            </div>
          </div>

          {/* Footer navigation */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">

            {/* Marketplace */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                Marketplace
              </h3>

              <ul className="mt-5 space-y-3.5 text-sm">
                <li>
                  <FooterLink to="/catalog">
                    Marketplace
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/pre-harvest">
                    Pre-Harvest
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/post-harvest">
                    Post-Harvest
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/cart">
                    Cart
                  </FooterLink>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                AgroLink
              </h3>

              <ul className="mt-5 space-y-3.5 text-sm">
                <li>
                  <FooterLink to="/">
                    Home
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/about">
                    About Us
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/contact">
                    Contact
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/register">
                    Join AgroLink
                  </FooterLink>
                </li>
              </ul>
            </div>

            {/* Portals */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                Portals
              </h3>

              <ul className="mt-5 space-y-3.5 text-sm">
                <li>
                  <FooterLink to="/login">
                    Sign In
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/register">
                    Become a Buyer
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/register">
                    Become a Producer
                  </FooterLink>
                </li>

                <li>
                  <FooterLink to="/register">
                    Join as Aggregator
                  </FooterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="mt-12 grid grid-cols-1 gap-4 border-y border-slate-800 py-6 sm:grid-cols-2">

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Location
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Bayero University Kano, Nigeria
              </p>
            </div>
          </div>

          <a
            href="mailto:support@agrilink.ng"
            className="group flex items-start gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-emerald-400 transition-colors group-hover:bg-emerald-950">
              <Mail className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Email
              </p>

              <p className="mt-1 text-sm text-slate-300 transition-colors group-hover:text-emerald-400">
                support@agrilink.ng
              </p>
            </div>
          </a>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-5 pt-7 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs leading-5 text-slate-500">
            © {currentYear} AgroLink Agritech Platform. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold text-slate-400">
              Final Year Project
            </span>

            <span className="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
              BUK • Level 400
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* Reusable footer navigation link */
const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    className="group inline-flex items-center gap-1 text-slate-400 transition-colors duration-200 hover:text-emerald-400"
  >
    <span>{children}</span>

    <ArrowUpRight className="h-3.5 w-3.5 -translate-x-0.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
  </Link>
);

export default Footer;
