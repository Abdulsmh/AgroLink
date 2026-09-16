import React from 'react';
import { FileCheck, ShieldCheck, Sparkles, BellRing } from 'lucide-react';

export const ProducerCertificates = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-600">
          Producer Workspace
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Certificates & Vault
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Keep your important farming achievements and documents organised.
        </p>
      </div>

      <div className="relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-emerald-100 bg-white px-6 py-10 text-center shadow-sm">
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="relative mb-5 rounded-2xl bg-blue-50 p-4 text-blue-600">
          <FileCheck className="h-10 w-10" />
        </div>

        <div className="relative w-full max-w-2xl">
          <svg
            viewBox="0 0 620 220"
            role="img"
            aria-label="Coming soon handwritten message"
            className="mx-auto h-auto w-full overflow-visible"
          >
            <rect
              x="174"
              y="28"
              width="272"
              height="142"
              rx="14"
              fill="#eff6ff"
              stroke="#bfdbfe"
              strokeWidth="2"
              transform="rotate(-3 310 99)"
            />

            <path
              d="M220 140 C280 152 350 145 402 136"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-pulse"
            />

            <text
              x="310"
              y="92"
              textAnchor="middle"
              fill="#1d4ed8"
              fontSize="53"
              fontFamily="'Comic Sans MS', 'Segoe Print', cursive"
              fontWeight="700"
              transform="rotate(-3 310 92)"
            >
              Coming Soon
            </text>

            <path
              d="M170 174 C250 190 365 184 455 168"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="520"
              strokeDashoffset="520"
              className="animate-[writeCertificateLine_2.5s_ease-in-out_forwards]"
            />

            <g fill="#f59e0b">
              <path d="M115 70 L120 82 L133 83 L123 92 L126 105 L115 98 L104 105 L107 92 L97 83 L110 82 Z" />
              <path d="M505 116 L509 126 L520 127 L512 135 L514 146 L505 140 L496 146 L498 135 L490 127 L501 126 Z" />
            </g>
          </svg>
        </div>

        <h2 className="relative mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
          Your achievements deserve a special place
        </h2>

        <p className="relative mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
          In the next upgrade, this space will help you keep certificates,
          recognise your farming achievements, and present important documents
          with confidence.
        </p>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            A place for your achievements
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
            <BellRing className="h-4 w-4" />
            Coming in the next upgrade
          </div>

          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-4 w-4" />
            Stay tuned
          </div>
        </div>
      </div>

      <style>{`
        @keyframes writeCertificateLine {
          from {
            stroke-dashoffset: 520;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          .animate-\\[writeCertificateLine_2\\.5s_ease-in-out_forwards\\] {
            animation: none !important;
          }

          path[stroke-dasharray] {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};
