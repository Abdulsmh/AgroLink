import React from 'react';
import { MessageSquare, BellRing, Sparkles } from 'lucide-react';

export const ProducerMessages = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-600">
          Producer Workspace
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Messages & Inquiries
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Stay connected with buyers and keep track of important inquiries.
        </p>
      </div>

      <div className="relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-emerald-100 bg-white px-6 py-10 text-center shadow-sm">
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-lime-100/60 blur-3xl" />

        <div className="relative mb-5 rounded-2xl bg-emerald-50 p-4 text-emerald-600">
          <MessageSquare className="h-10 w-10" />
        </div>

        <div className="relative w-full max-w-2xl">
          <svg
            viewBox="0 0 620 220"
            role="img"
            aria-label="Coming soon handwritten message"
            className="mx-auto h-auto w-full overflow-visible"
          >
            <path
              d="M85 168 C180 188 270 178 365 168 S510 150 555 164"
              fill="none"
              stroke="#a7f3d0"
              strokeWidth="5"
              strokeLinecap="round"
              className="animate-pulse"
            />

            <text
              x="310"
              y="92"
              textAnchor="middle"
              fill="#0f766e"
              fontSize="58"
              fontFamily="'Comic Sans MS', 'Segoe Print', cursive"
              fontWeight="700"
              transform="rotate(-3 310 92)"
            >
              Coming Soon
            </text>

            <path
              d="M150 112 C205 126 260 119 310 114 S420 105 475 118"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="520"
              strokeDashoffset="520"
              className="animate-[writeLine_2.5s_ease-in-out_forwards]"
            />

            <g
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M110 55 L110 72" />
              <path d="M101 63 L119 63" />
              <path d="M515 55 L515 72" />
              <path d="M506 63 L524 63" />
              <path d="M555 108 L555 122" />
              <path d="M548 115 L562 115" />
            </g>

            <g fill="#10b981">
              <circle cx="135" cy="135" r="4" className="animate-ping" />
              <circle cx="490" cy="142" r="4" className="animate-ping" />
            </g>
          </svg>
        </div>

        <h2 className="relative mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
          Better conversations are on the way
        </h2>

        <p className="relative mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
          In the next upgrade, you will be able to communicate more easily
          with buyers, answer questions, and discuss your farm products in one
          convenient place.
        </p>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <BellRing className="h-4 w-4" />
            Coming in the next upgrade
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
            <Sparkles className="h-4 w-4" />
            Stay tuned
          </div>
        </div>
      </div>

      <style>{`
        @keyframes writeLine {
          from {
            stroke-dashoffset: 520;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          .animate-ping,
          .animate-\\[writeLine_2\\.5s_ease-in-out_forwards\\] {
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