import React from 'react';
import { ShieldCheck, Users, TrendingUp, MapPin } from 'lucide-react';

export const About = () => {
  return (
    <div className="bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            About FarmConnect
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Bridging Kano’s Agricultural Value Chain
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Empowering local farmers, trusted field aggregators, and wholesale buyers with direct market access, transparency, and secure transactions.
          </p>
        </div>

        {/* Mission Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Our Mission & Vision</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            FarmConnect is engineered to streamline agricultural commerce across Kano State's major production hubs and markets. By eliminating unnecessary middlemen, we ensure that producers receive fair value for their hard work while buyers gain direct access to verified pre-harvest yields and fresh post-harvest inventory.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Verified Quality</h4>
                <p className="text-xs text-slate-500 mt-0.5">Admin-vetted farmers and secure listings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Direct Network</h4>
                <p className="text-xs text-slate-500 mt-0.5">Connecting producers, agents, and retailers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Fair Pricing</h4>
                <p className="text-xs text-slate-500 mt-0.5">Transparent market pricing for all volumes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Local Footprint */}
        <div className="bg-emerald-900 text-white rounded-3xl p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <MapPin className="h-4 w-4" /> Rooted in Kano State
          </div>
          <h3 className="text-2xl font-black">Serving Dawanau, Singer, and Irrigation Hubs</h3>
          <p className="text-sm text-emerald-100 leading-relaxed">
            From the massive grain trade networks at Dawanau market to irrigation clusters in Kadawa and surrounding local government areas, FarmConnect brings digital efficiency to traditional agricultural trade.
          </p>
        </div>
      </div>
    </div>
  );
};