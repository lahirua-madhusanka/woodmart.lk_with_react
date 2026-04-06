import { Search, ExternalLink, Truck, Info } from "lucide-react";
import { useState } from "react";

function OrderTrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      return;
    }
    
    // Open Pronto Lanka tracking site in new tab
    // User will need to enter tracking number in their form
    setIsSearching(true);
    window.open("https://www.prontolanka.lk/", "_blank");
    setTimeout(() => setIsSearching(false), 1000);
  };

  return (
    <section className="container-pad py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Real-Time Updates</p>
        <h1 className="font-display text-4xl font-bold">Track Your Order</h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Enter your tracking number to see real-time updates on your delivery status.
        </p>
      </div>

      {/* Main Tracking Section */}
      <div className="mb-12">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold mb-6">Enter Tracking Number</h2>
          
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="tracking" className="block text-sm font-semibold text-slate-900 mb-2">
                Tracking Number
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    id="tracking"
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., PL0123456789"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
                </div>
                <button
                  type="submit"
                  disabled={!trackingNumber.trim() || isSearching}
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? "Opening..." : "Track Order"}
                  <ExternalLink size={16} />
                </button>
              </div>
              <p className="text-xs text-muted mt-2">
                You'll find your tracking number in your order confirmation email. Click "Track Order" to open Pronto Lanka's site, then enter your number there.
              </p>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Tracking opens Pronto Lanka's tracking page</p>
              <p>Click the button above to open Pronto Lanka's website. Then enter your tracking number in their search form to view real-time delivery updates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="space-y-8">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-6">How Order Tracking Works</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand text-white font-bold text-lg">
                  1
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Get Your Tracking Number</h3>
                <p className="text-sm text-slate-700 mt-1">
                  After we confirm your order and process it (24–48 hours), we'll email you a tracking number from Pronto Lanka.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand text-white font-bold text-lg">
                  2
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Enter Tracking Number Above</h3>
                <p className="text-sm text-slate-700 mt-1">
                  Paste the tracking number into the field above and click "Track Order" to view real-time status.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand text-white font-bold text-lg">
                  3
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Follow Your Shipment</h3>
                <p className="text-sm text-slate-700 mt-1">
                  You'll see detailed updates including pickup, in-transit, and delivery status with estimated arrival times.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand text-white font-bold text-lg">
                  4
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Receive Your Order</h3>
                <p className="text-sm text-slate-700 mt-1">
                  Once delivered, you'll see a delivery confirmation with photo proof and the recipient's name.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Statuses */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-6">Understanding Tracking Statuses</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="font-semibold text-slate-900">Order Confirmed</p>
              <p className="text-sm text-slate-700 mt-1">Your order has been confirmed and is being prepared for shipment.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500">
              <p className="font-semibold text-slate-900">In Transit</p>
              <p className="text-sm text-slate-700 mt-1">Your package is on its way to you with the courier.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <p className="font-semibold text-slate-900">Out for Delivery</p>
              <p className="text-sm text-slate-700 mt-1">Your package is on the delivery truck and will arrive today.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="font-semibold text-slate-900">Delivered</p>
              <p className="text-sm text-slate-700 mt-1">Your package has been delivered to your address.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="font-semibold text-slate-900">Delivery Issue</p>
              <p className="text-sm text-slate-700 mt-1">There's been a delay or issue. Check tracking details or contact us.</p>
            </div>
          </div>
        </div>

        {/* Common Questions */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-6">Common Tracking Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Why don't I have a tracking number yet?</p>
              <p className="text-sm text-slate-700">
                We process orders within 24–48 hours after confirmation. Once handed over to Pronto Lanka, you'll receive a tracking number via email.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Can I change my delivery address?</p>
              <p className="text-sm text-slate-700">
                Once your order is in transit, we cannot change the address. Contact Pronto Lanka directly using your tracking number to discuss options.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Why is my delivery delayed?</p>
              <p className="text-sm text-slate-700">
                Delays can happen due to weather, traffic, or high order volume. Check your tracking status for the latest update. We recommend contacting Pronto Lanka if the delay exceeds the estimated time.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Is it safe to check tracking?</p>
              <p className="text-sm text-slate-700">
                Yes, tracking is completely safe and secure. Pronto Lanka requires your tracking number only, which doesn't contain sensitive payment or personal data.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">What if I didn't receive my order?</p>
              <p className="text-sm text-slate-700">
                Check your tracking status first. If it shows "Delivered" but you didn't receive it, check with neighbors or building security. If genuinely missing, <a href="/contact" className="text-brand font-semibold hover:underline">contact support</a> immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Our Courier Partner */}
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <div className="flex items-start gap-4 mb-6">
            <Truck size={32} className="text-brand mt-1" />
            <div>
              <h3 className="font-display text-xl font-bold">Pronto Lanka</h3>
              <p className="text-sm text-slate-700 mt-1">
                Sri Lanka's leading express courier service providing fast, reliable, and transparent deliveries across the island.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-700 mb-3">
              <strong>About Pronto Lanka:</strong> With over 15 years of experience, Pronto Lanka delivers thousands of packages daily with real-time tracking, photo proof of delivery, and professional service.
            </p>
            <a 
              href="https://www.prontolanka.lk/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand font-semibold hover:underline text-sm"
            >
              Visit Pronto Lanka <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Contact Support */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Can't Find Your Tracking Info?</h3>
          <p className="text-sm text-slate-700 mb-4">
            If you haven't received a tracking number or have questions about your order, we're here to help.
          </p>
          <a href="/contact" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}

export default OrderTrackingPage;
