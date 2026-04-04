import { ChevronDown } from "lucide-react";
import { useState } from "react";

function FAQPage() {
  const [openId, setOpenId] = useState(null);

  const faqs = [
    {
      id: "delivery-time",
      question: "How long does delivery take?",
      answer: "Delivery typically takes 3–7 working days from the order confirmation date. This depends on your location within Sri Lanka. Colombo and suburbs may receive deliveries within 1–2 days, while upcountry areas may take 5–7 working days. You'll receive a tracking number via email once your order is handed over to our courier partner, Pronto Lanka."
    },
    {
      id: "track-order",
      question: "How do I track my order?",
      answer: "Once your order is shipped, you'll receive an email with a tracking number. You can enter this number on our Track Order page (/order-tracking) or visit Pronto Lanka's website directly at www.prontolanka.lk. You can also contact our support team with your order number if you haven't received a tracking number."
    },
    {
      id: "return-policy",
      question: "What is your return policy?",
      answer: "We offer a 7-day return window from the date of delivery. Items must be in unused condition with original packaging and tags attached. Once we receive and inspect your returned item, we'll process a full refund within 3–5 business days. Contact our support team at support@woodmart.lk to initiate a return."
    },
    {
      id: "custom-products",
      question: "Can I order custom or made-to-order products?",
      answer: "Yes! We offer custom design and made-to-order services for many products. Please visit our Custom Projects page or contact us at support@woodmart.lk with your specifications. Custom orders typically take 10–15 working days for production before shipment. These items are generally non-returnable unless defective."
    },
    {
      id: "payment-methods",
      question: "What payment methods do you accept?",
      answer: "We accept credit/debit cards (Visa, Mastercard), online banking transfers, and digital wallets. All payments are processed securely through our trusted payment gateway. You can select your preferred payment method at checkout. If you have issues with payment, please contact our support team."
    },
    {
      id: "damaged-item",
      question: "What if my item arrives damaged?",
      answer: "If you receive a damaged item, please report it within 24 hours of delivery with photos of the damage. Contact support@woodmart.lk with your order number and photos. We'll arrange a free replacement shipment and provide a prepaid return label for the damaged item. Most damage claims are processed within 2–3 business days."
    },
    {
      id: "shipping-charges",
      question: "How much are shipping charges?",
      answer: "Shipping charges depend on your delivery location and start from ₨250 for Colombo and suburbs. Upcountry areas range from ₨350 to ₨1,000 depending on province. Orders above ₨5,000 may qualify for free island-wide shipping. Exact charges are calculated at checkout based on your delivery address."
    },
    {
      id: "free-shipping",
      question: "Do you offer free shipping?",
      answer: "Yes! Orders over ₨5,000 qualify for free island-wide shipping (excluding certain remote areas). Free shipping applies automatically at checkout if your order meets the minimum amount. Check the shipping section for more details."
    },
    {
      id: "out-of-stock",
      question: "What if an item is out of stock?",
      answer: "If an item is out of stock but you'd like to purchase it, you can email us at support@woodmart.lk to inquire about restock dates. We can add you to a notification list. For urgent orders, we may have similar alternative items in stock that we can suggest."
    },
    {
      id: "account-login",
      question: "Do I need an account to place an order?",
      answer: "Yes, you'll need to create an account or log in before checking out. This helps us keep track of your orders, manage returns, and provide personalized recommendations. Creating an account is quick and free. Visit the My Account page to register."
    },
    {
      id: "password-reset",
      question: "I forgot my password. How do I reset it?",
      answer: "On the login page, click 'Forgot Password?' and enter your email address. You'll receive a password reset link via email. Click the link to set a new password. If you don't receive the email within 10 minutes, check your spam folder or contact support@woodmart.lk."
    },
    {
      id: "wishlist",
      question: "Can I save items for later?",
      answer: "Yes! You can add items to your Wishlist by clicking the heart icon on any product page. Your wishlist is saved to your account and you can access it anytime by logging in. You can also share your wishlist with friends via email (if available)."
    },
    {
      id: "bulk-orders",
      question: "Do you offer bulk or wholesale pricing?",
      answer: "For bulk orders or corporate inquiries, please contact our support team at support@woodmart.lk. We may be able to offer special pricing for large quantities. Provide details about your requirements and we'll send you a customized quote."
    },
    {
      id: "corporate-gifting",
      question: "Do you offer corporate gifting or gift wrapping?",
      answer: "Yes, we can arrange corporate gifting and custom packaging for bulk orders. Please contact our support team at support@woodmart.lk to discuss your requirements. We offer personalized messages, custom branding, and bulk shipping to multiple addresses."
    },
    {
      id: "contact-support",
      question: "How can I contact customer support?",
      answer: "You can reach our support team in the following ways: Email: support@woodmart.lk, Phone: +1 (212) 555-0193 (during business hours), Contact Form: Visit the Contact page on our website. Our team typically responds within 24 business hours."
    }
  ];

  const toggleFaq = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="container-pad py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Questions?</p>
        <h1 className="font-display text-4xl font-bold mt-2">Frequently Asked Questions</h1>
        <p className="mt-3 text-sm text-muted max-w-2xl mx-auto">
          Can't find the answer you're looking for? Please contact our support team.
        </p>
      </div>

      {/* Search/Filter could be added here in future */}

      {/* FAQ List */}
      <div className="max-w-3xl mx-auto">
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {faq.question}
                </span>
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 text-slate-400 transition ${
                    openId === faq.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openId === faq.id && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 rounded-lg border border-slate-200 bg-white p-8 sm:p-12 text-center">
        <h2 className="font-display text-2xl font-bold mb-3">Still have questions?</h2>
        <p className="text-sm text-slate-700 mb-6 max-w-md mx-auto">
          Our support team is ready to help you with any inquiries. Reach out anytime!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/contact" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Contact Support
          </a>
          <a href="mailto:support@woodmart.lk" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Email Us
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <a href="/shipping-policy" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:shadow-sm transition">
          <p className="font-semibold text-slate-900 text-sm">Shipping Info</p>
          <p className="text-xs text-muted mt-1">Delivery times and rates</p>
        </a>
        <a href="/returns-refunds" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:shadow-sm transition">
          <p className="font-semibold text-slate-900 text-sm">Returns & Refunds</p>
          <p className="text-xs text-muted mt-1">7-day return policy</p>
        </a>
        <a href="/order-tracking" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:shadow-sm transition">
          <p className="font-semibold text-slate-900 text-sm">Track Order</p>
          <p className="text-xs text-muted mt-1">Real-time tracking</p>
        </a>
        <a href="/contact" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:shadow-sm transition">
          <p className="font-semibold text-slate-900 text-sm">Contact Us</p>
          <p className="text-xs text-muted mt-1">24-hour response time</p>
        </a>
      </div>
    </section>
  );
}

export default FAQPage;
