import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

export const CheckoutModal = ({ isOpen, onClose, produceItem, selectedUnit, quantity, totalPrice }) => {
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lga, setLga] = useState('Kano Municipal');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  if (!isOpen || !produceItem) return null;

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderPayload = {
        buyer_name: buyerName,
        phone: phone,
        delivery_address: address,
        lga: lga,
        items: [{
          id: produceItem.id,
          title: produceItem.title || produceItem.name,
          unit: selectedUnit || produceItem.unit_type || 'Bag',
          quantity: Number(quantity) || 1,
          price: produceItem.price_per_unit || produceItem.price
        }],
        total_amount: totalPrice,
        payment_method: paymentMethod,
        status: 'Pending'
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      setOrderSuccess(data.id);
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to submit order. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition"
        >
          <X className="h-5 w-5" />
        </button>

        {orderSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Order Placed Successfully!</h3>
            <p className="text-slate-600 text-sm mt-2">
              Your transaction has been logged and assigned to local aggregators. Track your order status using your phone number.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <p className="text-slate-400 font-bold uppercase">Order Tracking ID</p>
              <p className="font-mono font-bold text-emerald-600 text-sm">{orderSuccess}</p>
            </div>
            <button
              onClick={onClose}
              className="mt-8 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
            >
              Close & Return to Marketplace
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                Secure Agritech Checkout
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Complete Your Purchase</h2>
              <p className="text-slate-500 text-xs mt-0.5">Direct trade pricing with zero middleman markup.</p>
            </div>

            {/* Order Summary Box */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{produceItem.title || produceItem.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Qty: {quantity} {selectedUnit || produceItem.unit_type}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Total Amount</span>
                <span className="text-base font-black text-emerald-600">₦{totalPrice?.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (For Tracking)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 08030000000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kano LGA</label>
                  <select
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                  >
                    <option value="Kano Municipal">Kano Municipal</option>
                    <option value="Fagge">Fagge</option>
                    <option value="Dala">Dala</option>
                    <option value="Gwale">Gwale</option>
                    <option value="Nassarawa">Nassarawa</option>
                    <option value="Tarauni">Tarauni</option>
                    <option value="Kura">Kura</option>
                    <option value="Bagwai">Bagwai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                  >
                    <option value="Bank Transfer">Direct Bank Transfer</option>
                    <option value="Cash on Delivery">Cash on Delivery / Pickup</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Address / Destination</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., Singer Market, Shop 14 or Street name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/30 hover:bg-emerald-500 transition mt-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing Order...' : `Confirm & Place Order (₦${totalPrice?.toLocaleString()})`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};