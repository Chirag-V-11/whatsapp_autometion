import React, { useState } from 'react';
import { Check, X, Zap, Crown, ShieldCheck, Sparkles, Building2, Globe, DollarSign } from 'lucide-react';

export default function PricingView({ currentUser, onSelectPlan }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [currency, setCurrency] = useState(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('Kolkata') || tz.includes('India')) return 'INR';
    } catch (e) {}
    return 'INR'; // Default for Indian market or user choice
  });

  const plans = [
    {
      id: 'Starter',
      name: 'Starter',
      subtitle: 'Ideal solution for beginners & small shops',
      usd: { original: 39, monthly: 19, annual: 15, renewal: '$39/mo' },
      inr: { original: 2999, monthly: 1499, annual: 1199, renewal: '₹2,999/mo' },
      discount: 'SAVE 50%',
      bonus: null,
      popular: false,
      buttonColor: '#3b82f6',
      features: [
        { text: '500 WhatsApp Contacts', included: true },
        { text: '2,000 Broadcast Messages/mo', included: true },
        { text: 'Basic Auto-Responders (3 Rules)', included: true },
        { text: 'Automated Birthday Wishes', included: true },
        { text: 'Standard Sending Speed', included: true },
        { text: 'Email Campaigns Automation', included: false },
        { text: 'White-Label Branding', included: false },
        { text: 'Dedicated WhatsApp Instance', included: false },
        { text: '24/7 Priority VIP Support', included: false },
      ]
    },
    {
      id: 'Pro',
      name: 'Pro',
      subtitle: 'Everything you need to grow your sales',
      usd: { original: 99, monthly: 39, annual: 29, renewal: '$69/mo' },
      inr: { original: 6999, monthly: 2999, annual: 2399, renewal: '₹4,999/mo' },
      discount: 'SAVE 60%',
      bonus: '+2 months FREE',
      popular: false,
      buttonColor: '#6366f1',
      features: [
        { text: '5,000 WhatsApp Contacts', included: true },
        { text: '25,000 Broadcast Messages/mo', included: true },
        { text: 'Unlimited Auto-Responder Bots', included: true },
        { text: 'Automated Birthday Wishes', included: true },
        { text: 'High Speed Anti-Ban Sending', included: true },
        { text: 'Email Campaigns Automation', included: true },
        { text: 'White-Label Branding', included: false },
        { text: 'Dedicated WhatsApp Instance', included: false },
        { text: '24/7 Priority VIP Support', included: false },
      ]
    },
    {
      id: 'Business',
      name: 'Business',
      subtitle: 'Level-up with more power & unlimited automation',
      usd: { original: 250, monthly: 79, annual: 59, renewal: '$129/mo' },
      inr: { original: 14999, monthly: 5999, annual: 4799, renewal: '₹9,999/mo' },
      discount: 'SAVE 70%',
      bonus: '+3 months FREE',
      popular: true,
      popularBadge: 'Most Popular',
      buttonColor: '#ec4899',
      features: [
        { text: '25,000 WhatsApp Contacts', included: true },
        { text: '100,000 Broadcast Messages/mo', included: true },
        { text: 'Unlimited AI Chatbots & Bots', included: true },
        { text: 'Automated Birthday & Event Wishes', included: true },
        { text: 'Turbo Anti-Ban Safe Dispatcher', included: true },
        { text: 'Email & Multi-channel Campaigns', included: true },
        { text: 'Full White-Label Custom Branding', included: true },
        { text: 'Dedicated WhatsApp Instance', included: true },
        { text: '24/7 Priority VIP Support', included: false },
      ]
    },
    {
      id: 'Enterprise',
      name: 'Enterprise',
      subtitle: 'Maximum performance & dedicated SLA servers',
      usd: { original: 399, monthly: 149, annual: 119, renewal: '$249/mo' },
      inr: { original: 24999, monthly: 11999, annual: 9599, renewal: '₹19,999/mo' },
      discount: 'SAVE 62%',
      bonus: '+4 months FREE',
      popular: false,
      buttonColor: '#8b5cf6',
      features: [
        { text: 'Unlimited WhatsApp Contacts', included: true },
        { text: 'Unlimited Broadcast Messages', included: true },
        { text: 'Custom AI Bot & Workflow Builder', included: true },
        { text: 'Automated Birthday & ERP Webhooks', included: true },
        { text: 'Custom Sending Rate & Proxies', included: true },
        { text: 'Email Automation (Unlimited)', included: true },
        { text: 'Full White-Label & Custom Domain', included: true },
        { text: 'Multi-Tenant Dedicated Cluster', included: true },
        { text: '24/7 Dedicated Account Manager', included: true },
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Page Title & Controls Header */}
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', padding: '0.35rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
          <Sparkles size={16} /> Global SaaS Pricing & Plans
        </div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
          Choose the Perfect Plan for Your Business
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6' }}>
          Localized pricing in Indian Rupees (₹) for Indian clients & US Dollars ($) for international enterprises.
        </p>

        {/* Currency & Billing Cycle Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
          {/* Currency Switcher */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.9)', padding: '0.3rem', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <button
              onClick={() => setCurrency('INR')}
              style={{
                padding: '0.45rem 1.15rem',
                borderRadius: '50px',
                border: 'none',
                background: currency === 'INR' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                color: currency === 'INR' ? '#ffffff' : '#cbd5e1',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              🇮🇳 INR (₹ Rupees)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              style={{
                padding: '0.45rem 1.15rem',
                borderRadius: '50px',
                border: 'none',
                background: currency === 'USD' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                color: currency === 'USD' ? '#ffffff' : '#cbd5e1',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              🌎 USD ($ Dollars)
            </button>
          </div>

          {/* Monthly vs Annual Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.9)', padding: '0.3rem', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '0.45rem 1.15rem',
                borderRadius: '50px',
                border: 'none',
                background: billingCycle === 'monthly' ? '#25D366' : 'transparent',
                color: billingCycle === 'monthly' ? '#0f172a' : '#cbd5e1',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '0.45rem 1.15rem',
                borderRadius: '50px',
                border: 'none',
                background: billingCycle === 'annual' ? '#25D366' : 'transparent',
                color: billingCycle === 'annual' ? '#0f172a' : '#cbd5e1',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              Annual
              <span style={{ background: '#f59e0b', color: '#0f172a', fontSize: '0.625rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '10px' }}>
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        {plans.map((plan) => {
          const isCurrent = currentUser?.plan?.toLowerCase() === plan.id.toLowerCase();
          const currSymbol = currency === 'INR' ? '₹' : '$';
          const priceData = currency === 'INR' ? plan.inr : plan.usd;
          const displayPrice = billingCycle === 'annual' ? priceData.annual : priceData.monthly;
          const formattedDisplayPrice = currency === 'INR' ? displayPrice.toLocaleString('en-IN') : displayPrice;
          const formattedOriginalPrice = currency === 'INR' ? priceData.original.toLocaleString('en-IN') : priceData.original;

          return (
            <div
              key={plan.id}
              className="glass-panel"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                borderRadius: '20px',
                background: plan.popular 
                  ? 'linear-gradient(180deg, rgba(236, 72, 153, 0.12), rgba(15, 23, 42, 0.95))' 
                  : 'rgba(15, 23, 42, 0.75)',
                border: plan.popular 
                  ? '2px solid #ec4899' 
                  : isCurrent 
                  ? '2px solid #25D366' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: plan.popular ? '0 20px 40px rgba(236, 72, 153, 0.2)' : '0 10px 30px rgba(0, 0, 0, 0.3)',
                transform: plan.popular ? 'scale(1.03)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Popular Ribbon / Badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  padding: '0.3rem 1.25rem',
                  borderRadius: '50px',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  🔥 {plan.popularBadge}
                </div>
              )}

              {/* Plan Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.35rem' }}>
                  {plan.name}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', minHeight: '36px', lineHeight: '1.4' }}>
                  {plan.subtitle}
                </p>
              </div>

              {/* Price Section */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>
                    {currSymbol}{formattedOriginalPrice}
                  </span>
                  <span style={{
                    background: plan.popular ? 'rgba(236, 72, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color: plan.popular ? '#f472b6' : '#818cf8',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '50px'
                  }}>
                    {plan.discount}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.2rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{currSymbol}</span>
                  <span style={{ fontSize: currency === 'INR' ? '2.5rem' : '3rem', fontWeight: '900', color: '#ffffff', lineHeight: '1', letterSpacing: '-1px' }}>
                    {formattedDisplayPrice}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>/mo</span>
                </div>

                {plan.bonus && (
                  <div style={{ color: '#ec4899', fontWeight: '700', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                    {plan.bonus}
                  </div>
                )}

                <div style={{ color: '#64748b', fontSize: '0.725rem', marginTop: '0.35rem' }}>
                  {priceData.renewal} when you renew
                </div>
              </div>

              {/* CTA Action Button */}
              <button
                onClick={() => onSelectPlan && onSelectPlan(plan.id, currency)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isCurrent 
                    ? 'rgba(37, 211, 102, 0.2)' 
                    : plan.popular 
                    ? 'linear-gradient(135deg, #ec4899, #d946ef)' 
                    : plan.buttonColor,
                  color: isCurrent ? '#25D366' : '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.925rem',
                  cursor: isCurrent ? 'default' : 'pointer',
                  boxShadow: plan.popular ? '0 8px 20px rgba(236, 72, 153, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
                  marginBottom: '1.75rem',
                  transition: 'transform 0.15s ease'
                }}
              >
                {isCurrent ? '✓ Active Plan' : `Choose ${plan.name}`}
              </button>

              <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', marginBottom: '1.25rem' }} />

              {/* Features List */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Top Features Included:
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {plan.features.map((feat, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.825rem' }}>
                      {feat.included ? (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(37, 211, 102, 0.2)', color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={12} strokeWidth={3} />
                        </div>
                      )}
                      <span style={{ color: feat.included ? '#e2e8f0' : '#64748b', textDecoration: feat.included ? 'none' : 'line-through' }}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* SLA Guarantee & Trust Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <ShieldCheck size={28} style={{ color: '#25D366' }} />
          <div>
            <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>30-Day Money-Back Guarantee</div>
            <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>GST Compliant Invoices & No-Questions Refund</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Zap size={28} style={{ color: '#f59e0b' }} />
          <div>
            <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>Instant Activation</div>
            <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>WhatsApp instance live in 60 seconds</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Building2 size={28} style={{ color: '#3b82f6' }} />
          <div>
            <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>White-Label Multi-Tenant</div>
            <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>Resell to your clients with custom branding</div>
          </div>
        </div>
      </div>
    </div>
  );
}
