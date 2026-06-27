import React, { useState } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { Link } from 'react-router-dom'

export default function EvaluatorGuidelines() {
  const [activeAccordion, setActiveAccordion] = useState(null)

  const steps = [
    {
      num: '1',
      title: 'Calibrate Availability',
      desc: 'Set your morning/afternoon blocks and expertise tracks in profile settings. The backend CP-SAT optimizer runs real-time allocations based on these selections.',
      badge: 'Profile Settings',
      link: '/evaluator/profile'
    },
    {
      num: '2',
      title: 'Review Timeline Schedule',
      desc: 'Each team presents in a designated room during specific timeslots. Verify your slots on the dashboard timeline to prevent double-bookings or delays.',
      badge: 'Dashboard',
      link: '/evaluator/dashboard'
    },
    {
      num: '3',
      title: 'Select Queue Assignment',
      desc: 'Access your assigned evaluation list. See matching compatibility percentages and rationales explaining why you were matched with each specific team.',
      badge: 'Evaluation Queue',
      link: '/evaluator/assignments'
    },
    {
      num: '4',
      title: 'Grade inside Workspace',
      desc: 'Analyze submission Git commits, read AI project syntheses, and test live deployment URLs. Score each criterion using the slider controls.',
      badge: 'Workspace',
      link: null
    },
    {
      num: '5',
      title: 'AI Feedback & Consensus',
      desc: 'Use the AI Copilot to refine raw notes into professional category feedback. Submit, and adjust scores if blind deviation warnings trigger.',
      badge: 'Calibrate Scores',
      link: null
    }
  ]

  const criteria = [
    {
      id: 'innovation',
      name: 'Innovation & Originality',
      weight: '25%',
      desc: 'Evaluates the novelty of the solution and how creatively the team addressed the problem statement.',
      anchors: [
        { score: '8-10', text: 'Highly unique solution, novel application of tech, solves a hard problem in an elegant new way.' },
        { score: '4-7', text: 'Good solution but borrows heavily from existing projects or standard paradigms.' },
        { score: '1-3', text: 'Trivial project, duplicate of a basic tutorial, or offers no new concepts.' }
      ]
    },
    {
      id: 'execution',
      name: 'Technical Execution',
      weight: '30%',
      desc: 'Assesses code quality, completeness of the implementation, architecture stability, and database consistency.',
      anchors: [
        { score: '8-10', text: 'Completely working application, production-ready backend/frontend, clean API architecture, database integrity checks enforced.' },
        { score: '4-7', text: 'Working prototype with core features, but has visible UI bugs, missing error handling, or minor crashes.' },
        { score: '1-3', text: 'Mainly mockup/UI screens, broken endpoints, database holds mock arrays, or fails to run locally.' }
      ]
    },
    {
      id: 'presentation',
      name: 'Presentation & Q&A',
      weight: '20%',
      desc: 'Measures communication clarity, pitch quality, demo stability, and performance answering Devil\'s Advocate queries.',
      anchors: [
        { score: '8-10', text: 'Compelling pitch, flawless demo within time constraints, answers deep technical questions accurately and confidently.' },
        { score: '4-7', text: 'Decent slides and speech, but rushed demo or struggled to explain system limits or concurrency checks.' },
        { score: '1-3', text: 'Unprepared presentation, missing demo, or unable to explain basic technical framework choices.' }
      ]
    },
    {
      id: 'techstack',
      name: 'Tech Stack Quality',
      weight: '25%',
      desc: 'Evaluates the sophistication of the engineering tools, database choices, and absence of recycled repository frameworks.',
      anchors: [
        { score: '8-10', text: 'Sophisticated stack (e.g. FastAPI, CP-SAT solver, specialized DBs), high commit velocity, healthy git logs from all members.' },
        { score: '4-7', text: 'Standard framework stack, moderate contribution equity, standard database setups without custom extensions.' },
        { score: '1-3', text: 'Boilerplate project, git footprints indicate pre-existing code reuse or single-author dump without collaboration.' }
      ]
    }
  ]

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id)
  }

  return (
    <EvaluatorLayout pageTitle="Judging Guidelines & Onboarding" pageSubtitle="Welcome to the Judge Console. Below is a comprehensive walkthrough explaining how your allocations work and how to evaluate hackathon submissions.">
      <div className="committee-reference-dashboard">

        {/* Section 1: Standard Evaluation Flow */}
        <section className="ref-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="ref-section-title" style={{ marginBottom: '20px' }}>
            <h3>Your Step-by-Step Evaluation Timeline</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                alignItems: 'flex-start',
                position: 'relative'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--accent-color)',
                  color: 'var(--accent-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  flexShrink: 0
                }}>
                  {step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{step.title}</h4>
                    {step.link ? (
                      <Link to={step.link} className="badge badge-purple" style={{ textDecoration: 'none', fontSize: '11px' }}>
                        Go to {step.badge} ➔
                      </Link>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: '11px' }}>{step.badge}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.45', color: 'var(--text-secondary)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Grading Rubrics Dictionary */}
        <section className="ref-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="ref-section-title" style={{ marginBottom: '16px' }}>
            <h3>Evaluation Criteria Glossary</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click a criterion to expand score definitions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {criteria.map((item) => {
              const isOpen = activeAccordion === item.id
              return (
                <div key={item.id} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'var(--bg-primary)'
                }}>
                  {/* Accordion Trigger */}
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item.name}</strong>
                      <span className="badge badge-purple" style={{ marginLeft: '10px', fontSize: '10px' }}>Weight: {item.weight}</span>
                    </div>
                    <span style={{ color: 'var(--accent-color)', fontSize: '18px', fontWeight: 'bold' }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{item.desc}</p>
                      
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 'bold' }}>Scoring Benchmarks:</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {item.anchors.map((anchor, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)'
                          }}>
                            <span className="badge badge-blue" style={{ flexShrink: 0, height: 'fit-content', minWidth: '45px', textAlign: 'center' }}>
                              {anchor.score}
                            </span>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                              {anchor.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </EvaluatorLayout>
  )
}
