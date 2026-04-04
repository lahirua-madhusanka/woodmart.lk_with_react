import { Truck, MapPin, Clock, DollarSign } from "lucide-react";

function ShippingPolicyPage() {
  return (
    <section className="container-pad py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Delivery Information</p>
        <h1 className="font-display text-4xl font-bold">Shipping Policy</h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          We're committed to delivering your orders quickly and safely. Here's everything you need to know about our shipping process.
        </p>
      </div>

      {/* Key Stats */}
      <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Truck size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Delivery Time</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">3–7 Days</p>
          <p className="mt-1 text-xs text-muted">Working days from order confirmation</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <MapPin size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Coverage</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">Island-Wide</p>
          <p className="mt-1 text-xs text-muted">All provinces across Sri Lanka</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Clock size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Processing</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">24–48 hrs</p>
          <p className="mt-1 text-xs text-muted">Before handover to courier</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <DollarSign size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Charges</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">Starting ₨250</p>
          <p className="mt-1 text-xs text-muted">Varies by location</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-8">
        {/* Delivery Timeline */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Delivery Timeline</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-brand bg-white p-4">
              <p className="font-semibold text-slate-900">Order Confirmation</p>
              <p className="text-sm text-muted mt-1">Instant upon successful payment</p>
            </div>
            <div className="border-l-4 border-brand bg-white p-4">
              <p className="font-semibold text-slate-900">Processing (24–48 hours)</p>
              <p className="text-sm text-muted mt-1">We carefully prepare and pack your order</p>
            </div>
            <div className="border-l-4 border-brand bg-white p-4">
              <p className="font-semibold text-slate-900">Courier Handover</p>
              <p className="text-sm text-muted mt-1">Shipped with Pronto Lanka tracking enabled</p>
            </div>
            <div className="border-l-4 border-brand bg-white p-4">
              <p className="font-semibold text-slate-900">Delivery (3–7 working days)</p>
              <p className="text-sm text-muted mt-1">Varies based on destination and current workload</p>
            </div>
          </div>
        </div>

        {/* Shipping Areas & Charges */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Shipping Areas & Charges</h2>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">We deliver island-wide across Sri Lanka:</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-brand mt-1">✓</span>
                <span><strong>Colombo & Suburbs:</strong> ₨250 (next day)</span>
              </li>
              <li className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-brand mt-1">✓</span>
                <span><strong>Western province:</strong> ₨350–500</span>
              </li>
              <li className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-brand mt-1">✓</span>
                <span><strong>Central & Hill Country:</strong> ₨500–750</span>
              </li>
              <li className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-brand mt-1">✓</span>
                <span><strong>Northern & Eastern:</strong> ₨750–1000</span>
              </li>
              <li className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-brand mt-1">✓</span>
                <span><strong>Southern & Uva:</strong> ₨600–850</span>
              </li>
            </ul>
            <p className="text-xs text-muted mt-4 italic">*Shipping charges are calculated at checkout based on your delivery address</p>
          </div>
        </div>

        {/* Courier Partner */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Our Courier Partner</h2>
          <div className="bg-white p-6 rounded-lg">
            <p className="font-semibold text-slate-900 mb-2">Pronto Lanka</p>
            <p className="text-sm text-slate-700 mb-4">
              We partner with Pronto Lanka, Sri Lanka's leading express courier service, to ensure reliable and timely delivery of your orders.
            </p>
            <p className="text-sm text-slate-700 mb-4">
              Every shipment comes with a tracking number so you can monitor your delivery in real-time. You'll receive tracking details via email once your order is handed over to the courier.
            </p>
            <p className="text-sm text-slate-700">
              <a href="/order-tracking" className="text-brand font-semibold hover:underline">
                Track your order →
              </a>
            </p>
          </div>
        </div>

        {/* Handling & Care */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Handling & Care</h2>
          <ul className="space-y-3">
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">1.</span>
              <span><strong>Packaging:</strong> All items are carefully wrapped and packaged to prevent damage during transit</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">2.</span>
              <span><strong>Inspection:</strong> Please inspect your package immediately upon delivery for any visible damage</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">3.</span>
              <span><strong>Damage Claims:</strong> Report any damage within 24 hours with photos for a full refund or replacement</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">4.</span>
              <span><strong>Signature:</strong> Keep your signed receipt as proof of delivery</span>
            </li>
          </ul>
        </div>

        {/* Free Shipping */}
        <div className="rounded-lg border-2 border-brand bg-brand-light p-8">
          <h3 className="font-display text-xl font-bold text-brand-dark mb-2">Free Shipping Available</h3>
          <p className="text-sm text-slate-700">
            Orders above ₨5,000 qualify for free island-wide shipping (excludes certain remote areas). Free shipping will be applied at checkout.
          </p>
        </div>

        {/* Contact Support */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Have Shipping Questions?</h3>
          <p className="text-sm text-slate-700 mb-4">
            Our support team is here to help.
          </p>
          <a href="/contact" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}

export default ShippingPolicyPage;
