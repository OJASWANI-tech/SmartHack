import { useState } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'

export default function CommitteeBilling() {
  const [billingPeriod, setBillingPeriod] = useState('monthly') // 'monthly' | 'annual'
  const [activePlan, setActivePlan] = useState('free') // simulated plan: 'free' | 'pro' | 'enterprise'
  const [upgradingTo, setUpgradingTo] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const handleUpgrade = (planId) => {
    if (planId === activePlan) return
    setUpgradingTo(planId)
    setTimeout(() => {
      setActivePlan(planId)
      setUpgradingTo(null)
      showToast(`Successfully upgraded to the ${planId.toUpperCase()} Plan!`, 'success')
    }, 1500)
  }

  // Simulated metrics
  const tokenUsage = 6500 // out of 10000 free tokens
  const tokenPercentage = (tokenUsage / 10000) * 100

  // Plan Details
  const plans = [
    {
      id: 'free',
      name: 'Community',
      price: 0,
      description: 'Perfect for small university clubs and local community hackathons.',
      features: [
        'Up to 100 participants',
        'Basic random/manual team matching',
        'Standard evaluations leaderboard',
        'Basic support ticket submission',
        'Standard email notifications',
        'EventFlow branding in portals'
      ],
      actionText: 'Your Current Plan',
      color: '#9ca3af',
      glow: 'rgba(156, 163, 175, 0.1)'
    },
    {
      id: 'pro',
      name: 'Scale (Pro)',
      price: billingPeriod === 'monthly' ? 49 : 39,
      popular: true,
      description: 'Designed for high-performance regional competitions and bootcamps.',
      features: [
        'Up to 500 participants',
        'AI Smart Matchmaker (domain & skills balance)',
        'Smart Timetable Scheduler & Judge Allocator',
        'AI Copilot Grievance Response Drafter',
        'Ask AI Chatbot helper for participants',
        'Priority 24/48 hr email support',
        'No platform branding advertisements'
      ],
      actionText: 'Upgrade to Pro',
      color: '#a78bfa',
      glow: 'rgba(139, 92, 246, 0.2)'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'For corporate innovation challenges, accelerators, and institutions.',
      features: [
        'Unlimited participants & teams',
        'Customized AI matching weights & formulas',
        'Custom-tuned LLM knowledge bases',
        'Automated mentor-swap safety triggers',
        'Full White-Labeling (custom domains & logos)',
        'SSO integration (SAML, Okta)',
        'Dedicated Slack channel & 2 hr SLA support'
      ],
      actionText: 'Contact Sales',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.2)'
    }
  ]

  return (
    <CommitteeLayout pageTitle="Plans & Billing" pageSubtitle="Scale EventFlow with constraint-solving matches, judge scheduling, and AI-assisted workflows.">
      <div className="committee-reference-dashboard" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {toast.show && (
          <div className="pipeline-toast" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 'bold',
            fontSize: '13px',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            {toast.message}
          </div>
        )}

        {/* ─── Top Usage Quota Alert Strip ─── */}
        {activePlan === 'free' && (
          <section className="committee-card" style={{
            padding: '20px',
            marginBottom: '28px',
            background: 'rgba(251, 191, 36, 0.04)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>
                  AI Token Credits Running Low
                </h4>
                <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '9px' }}>
                  {tokenUsage} / 10,000 used
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                You have consumed <strong>{tokenPercentage}%</strong> of your free AI token credits. Upgrade to the **Pro** plan to unlock unlimited coordinator assistance, participant chatbots, and solver engines.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '320px', flex: '0 0 auto' }}>
              {/* Progress bar */}
              <div style={{ flex: 1, background: 'var(--bg-primary)', height: '8px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{ width: `${tokenPercentage}%`, height: '100%', background: '#fbbf24', borderRadius: '4px' }}></div>
              </div>
              <button
                onClick={() => handleUpgrade('pro')}
                className="committee-btn"
                style={{
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)' }}
              >
                ⚡ Fast Upgrade
              </button>
            </div>
          </section>
        )}

        {/* ─── Billing Period Switcher ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px', gap: '12px' }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            padding: '4px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                background: billingPeriod === 'monthly' ? 'var(--bg-primary)' : 'none',
                color: billingPeriod === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Bill Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              style={{
                background: billingPeriod === 'annual' ? 'var(--bg-primary)' : 'none',
                color: billingPeriod === 'annual' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Bill Annually
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '9px', padding: '2px 6px' }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* ─── Pricing Card Grid ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'stretch' }}>
          {plans.map((plan) => {
            const isCurrent = activePlan === plan.id
            const isUpgrading = upgradingTo === plan.id

            return (
              <article
                key={plan.id}
                className="committee-card"
                style={{
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  background: 'var(--bg-secondary)',
                  border: isCurrent 
                    ? `1px solid ${plan.color}` 
                    : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: isCurrent ? `0 8px 32px ${plan.glow}` : 'var(--card-shadow)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)',
                    color: '#101927',
                    fontWeight: '900',
                    fontSize: '9px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                  }}>
                    ✨ Recommended
                  </div>
                )}

                {/* Header */}
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '850', color: plan.color }}>
                    {plan.name}
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                    {plan.description}
                  </p>
                </div>

                {/* Pricing block */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {typeof plan.price === 'number' ? (
                    <>
                      <span style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)' }}>
                        ${plan.price}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        / month {billingPeriod === 'annual' && 'billed annually'}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-primary)' }}>
                      {plan.price}
                    </span>
                  )}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  disabled={isCurrent || isUpgrading}
                  onClick={() => handleUpgrade(plan.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: isCurrent ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    background: isCurrent 
                      ? 'rgba(255,255,255,0.03)' 
                      : isCurrent 
                        ? 'none' 
                        : plan.popular 
                          ? plan.color 
                          : 'rgba(255,255,255,0.05)',
                    color: isCurrent 
                      ? 'var(--text-secondary)' 
                      : plan.popular 
                        ? '#101927' 
                        : 'var(--text-primary)',
                    borderColor: isCurrent ? 'var(--border-color)' : plan.popular ? 'transparent' : 'var(--border-color)'
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrent) return
                    e.currentTarget.style.filter = 'brightness(1.15)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    if (plan.popular) {
                      e.currentTarget.style.boxShadow = `0 4px 14px ${plan.glow}`
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrent) return
                    e.currentTarget.style.filter = 'none'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {isUpgrading ? 'Upgrading Plan...' : isCurrent ? '✓ Active Plan' : plan.actionText}
                </button>

                {/* Divider */}
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                {/* Features checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What's included:
                  </span>
                  
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={plan.color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginTop: '2px', flexShrink: 0 }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )
          })}
        </div>

        {/* ─── Footer Comparison Callout ─── */}
        <section className="committee-card" style={{
          marginTop: '40px',
          padding: '24px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Need custom capabilities for enterprise integration?
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.5' }}>
            We provide customized deployment services, localized hosting parameters (e.g. EU data residency), dedicated hardware solvers, and hands-on integration consultation.
          </p>
          <a
            href="mailto:sales@eventflow.ai"
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: 'var(--accent-color)',
              fontWeight: 'bold',
              textDecoration: 'underline'
            }}
          >
            📧 Reach out to support & sales
          </a>
        </section>

      </div>
    </CommitteeLayout>
  )
}
