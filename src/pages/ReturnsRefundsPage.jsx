import { RotateCcw, Shield, Clock, DollarSign } from "lucide-react";

function ReturnsRefundsPage() {
  return (
    <section className="container-pad py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Hassle-Free Returns</p>
        <h1 className="font-display text-4xl font-bold">Returns & Refunds Policy</h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          We want you to be completely satisfied with your purchase. If you're not happy, we make returns and refunds easy.
        </p>
      </div>

      {/* Key Points */}
      <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Clock size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Return Window</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">7 Days</p>
          <p className="mt-1 text-xs text-muted">From date of delivery</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Shield size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Condition</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">Unused</p>
          <p className="mt-1 text-xs text-muted">Original packaging & tags</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <RotateCcw size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Process</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">Simple</p>
          <p className="mt-1 text-xs text-muted">Quick return authorization</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <DollarSign size={28} className="text-brand mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Refund</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">Full Amount</p>
          <p className="mt-1 text-xs text-muted">3–5 business days</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-8">
        {/* Return Window */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">7-Day Return Window</h2>
          <p className="text-sm text-slate-700 mb-4">
            You have <strong>7 calendar days from the date of delivery</strong> to initiate a return. For items delivered on a weekend, the count starts from the next business day.
          </p>
          <div className="bg-white p-4 rounded-lg border-l-4 border-brand">
            <p className="text-sm text-slate-700">
              <strong>Example:</strong> If your order arrives on Friday, you have until the following Friday to start a return.
            </p>
          </div>
        </div>

        {/* Return Conditions */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Condition Requirements</h2>
          <p className="text-sm text-slate-700 mb-4">
            To qualify for a return, items must meet the following conditions:
          </p>
          <ul className="space-y-3">
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">✓</span>
              <span><strong>Unused & Unworn:</strong> Item must be in original, unused condition (no signs of wear, use, or damage)</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">✓</span>
              <span><strong>Original Packaging:</strong> All original packaging, boxes, and tags must be included</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">✓</span>
              <span><strong>Documentation:</strong> Original invoice and proof of purchase must be included</span>
            </li>
            <li className="text-sm text-slate-700 flex items-start gap-3">
              <span className="font-bold text-brand">✓</span>
              <span><strong>Complete Items:</strong> All components and accessories (if any) must be included</span>
            </li>
          </ul>
          <p className="text-xs text-muted mt-6">
            Items that don't meet these conditions may be rejected or a restocking fee may apply.
          </p>
        </div>

        {/* Return Process */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">How to Return an Item</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Step 1: Contact Support</p>
              <p className="text-sm text-slate-700">
                Email us at <strong>support@woodmart.lk</strong> with your order number and reason for return within 7 days of delivery.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Step 2: Return Authorization</p>
              <p className="text-sm text-slate-700">
                We'll review your request and send you a return shipping label and authorization number via email.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Step 3: Ship Back</p>
              <p className="text-sm text-slate-700">
                Pack your item securely with all original packaging and drop it off using the provided shipping label. Keep a receipt as proof.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Step 4: Processing</p>
              <p className="text-sm text-slate-700">
                Once we receive and inspect your item, we'll process your refund. This typically takes 3–5 business days.
              </p>
            </div>
          </div>
        </div>

        {/* Refund Timeline */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Refund Timeline</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-4 font-semibold text-slate-900">Step</td>
                <td className="py-3 px-4 font-semibold text-slate-900">Timeframe</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-4 text-slate-700">Return authorization issued</td>
                <td className="py-3 px-4 text-slate-700">Within 24 hours</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-4 text-slate-700">Shipment delivery to us</td>
                <td className="py-3 px-4 text-slate-700">3–7 days (based on courier)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-4 text-slate-700">Inspection & processing</td>
                <td className="py-3 px-4 text-slate-700">1–2 business days</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-700">Refund to original payment method</td>
                <td className="py-3 px-4 text-slate-700">3–5 business days</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-4">*Timeframes may vary based on your bank or payment provider</p>
        </div>

        {/* Special Cases */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4">Special Cases</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Damaged or Defective Items</p>
              <p className="text-sm text-slate-700">
                If you receive a damaged or defective item, report it <strong>within 24 hours of delivery</strong> with clear photos. We'll provide a prepaid return label and issue a full refund or replacement immediately upon inspection.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Wrong Item Received</p>
              <p className="text-sm text-slate-700">
                If you received the wrong item, contact us immediately. We'll arrange a free replacement shipment and provide a prepaid return label for the incorrect item.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Original Receipt Lost</p>
              <p className="text-sm text-slate-700">
                We can verify your order using your email address and order number. Just provide these when you contact us.
              </p>
            </div>
          </div>
        </div>

        {/* Non-Returnable Items */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <h2 className="font-display text-2xl font-bold mb-4 text-red-900">Non-Returnable Items</h2>
          <p className="text-sm text-red-800 mb-4">
            The following items cannot be returned:
          </p>
          <ul className="space-y-2">
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span>•</span>
              <span>Custom or made-to-order items (unless defective)</span>
            </li>
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span>•</span>
              <span>Items showing signs of use or significant wear</span>
            </li>
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span>•</span>
              <span>Final sale or clearance items (clearly marked at time of purchase)</span>
            </li>
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span>•</span>
              <span>Items returned outside the 7-day window</span>
            </li>
          </ul>
        </div>

        {/* Contact Support */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Ready to Return?</h3>
          <p className="text-sm text-slate-700 mb-4">
            We're here to help make the process smooth.
          </p>
          <a href="/contact" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Contact Our Team
          </a>
        </div>
      </div>
    </section>
  );
}

export default ReturnsRefundsPage;
