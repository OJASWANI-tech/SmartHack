import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { 
  getAssignmentDetail, 
  submitScore, 
  getBiasCalibration, 
  getDevilsAdvocate, 
  getGithubHeatmap, 
  getConsensus,
  structureFeedback 
} from '../../services/evaluator'
import RubricScoreSlider from '../../components/evaluator/RubricScoreSlider'
import AIInsightPanel from '../../components/evaluator/AIInsightPanel'

export default function EvaluatorWorkspace() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [scores, setScores] = useState({
    Innovation: 0,
    Execution: 0,
    Presentation: 0,
    Scalability: 0,
    'Technical Depth': 0,
    'Tech Stack Quality': 0,
    'Problem Relevance': 0,
    'UI/UX': 0
  })
  const [feedback, setFeedback] = useState('')
  
  // Advanced features states
  const [biasData, setBiasData] = useState(null)
  const [githubData, setGithubData] = useState(null)
  const [consensus, setConsensus] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [res, bias, git, cons] = await Promise.all([
          getAssignmentDetail(teamId),
          getBiasCalibration(),
          getGithubHeatmap(teamId),
          getConsensus(teamId)
        ])
        
        setData(res)
        setBiasData(bias)
        setGithubData(git)
        setConsensus(cons)
        
        if (res.score_card && res.score_card.criteria_breakdown) {
          setScores(prev => ({
            ...prev,
            ...res.score_card.criteria_breakdown
          }))
        }
        if (res.score_card && res.score_card.notes) {
          setFeedback(res.score_card.notes)
        }
      } catch (e) {
     
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [teamId])

  const [polishing, setPolishing] = useState(false)
  const [aiStructuredFeedback, setAiStructuredFeedback] = useState(null)

  const handleAIPolish = async () => {
    setPolishing(true)
    try {
      const res = await structureFeedback(feedback, scores)
      setAiStructuredFeedback(res.structured || res)
    } catch (e) {
    
    } finally {
      setPolishing(false)
    }
  }

  const applyAIFeedbackToNotes = () => {
    if (aiStructuredFeedback) {
      let polishedText = ""
      Object.entries(aiStructuredFeedback).forEach(([category, text]) => {
        polishedText += `### ${category}\n${text}\n\n`
      })
      setFeedback(polishedText.trim())
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const weightedScore = (
        (scores.Innovation || 0) * 0.25 +
        (scores.Execution || 0) * 0.25 +
        (scores.Presentation || 0) * 0.15 +
        (scores.Scalability || 0) * 0.10 +
        (scores['Technical Depth'] || 0) * 0.10 +
        (scores['Tech Stack Quality'] || 0) * 0.05 +
        (scores['Problem Relevance'] || 0) * 0.05 +
        (scores['UI/UX'] || 0) * 0.05
      )
      await submitScore({
        team_id: teamId,
        score_value: weightedScore,
        criteria_breakdown: scores,
        notes: feedback,
        feedback_structured: aiStructuredFeedback || {},
        evaluation_duration_mins: 15
      })
      navigate('/evaluator/assignments')
    } catch (e) {
      console.error("Evaluation submission failed:", e)
      alert(e.message || "Failed to submit evaluation. Please review your scores and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <EvaluatorLayout pageTitle="Evaluation Workspace" pageSubtitle="Grade the team based on the criteria rubrics, pitch deck, code repository, and assistant analysis.">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <div className="spinner" style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
            animation: 'shimmer 1.4s infinite'
          }}></div>
        </div>
      </EvaluatorLayout>
    )
  }

  if (!data || !data.team) {
    return (
      <EvaluatorLayout pageTitle="Evaluation Workspace" pageSubtitle="Grade the team based on the criteria rubrics, pitch deck, code repository, and assistant analysis.">
        <div className="committee-reference-dashboard">
          <div style={{ padding: '24px', border: '1px dashed var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', textAlign: 'center' }}>
            Assignment not found.
          </div>
        </div>
      </EvaluatorLayout>
    )
  }

  const { team, submission, ai_summary, rubric } = data

  const rubricCriteriaList = [
    { id: 'Innovation', name: 'Innovation', max: 10, weight: 2.5, hint: rubric?.Innovation || 'Novelty and unique approach' },
    { id: 'Execution', name: 'Execution', max: 10, weight: 2.5, hint: rubric?.Execution || 'Code quality and robustness' },
    { id: 'Presentation', name: 'Presentation', max: 10, weight: 1.5, hint: rubric?.Presentation || 'Delivery and deck clarity' },
    { id: 'Scalability', name: 'Scalability', max: 10, weight: 1.0, hint: rubric?.Scalability || 'Database design & scaling' },
    { id: 'Technical Depth', name: 'Technical Depth', max: 10, weight: 1.0, hint: rubric?.['Technical Depth'] || 'Algorithmic complexity' },
    { id: 'Tech Stack Quality', name: 'Tech Stack Quality', max: 10, weight: 0.5, hint: rubric?.['Tech Stack Quality'] || 'Modern stack usage' },
    { id: 'Problem Relevance', name: 'Problem Relevance', max: 10, weight: 0.5, hint: rubric?.['Problem Relevance'] || 'Customer needs' },
    { id: 'UI/UX', name: 'UI/UX', max: 10, weight: 0.5, hint: rubric?.['UI/UX'] || 'Visual design consistency' },
  ]

  const weightedScore = (
    (scores.Innovation || 0) * 0.25 +
    (scores.Execution || 0) * 0.25 +
    (scores.Presentation || 0) * 0.15 +
    (scores.Scalability || 0) * 0.10 +
    (scores['Technical Depth'] || 0) * 0.10 +
    (scores['Tech Stack Quality'] || 0) * 0.05 +
    (scores['Problem Relevance'] || 0) * 0.05 +
    (scores['UI/UX'] || 0) * 0.05
  )

  const parseInlineMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: '750' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatSubmissionNotes = (notes) => {
    if (!notes) return <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided by the team.</span>;

    const lines = notes.split('\n');
    return lines.map((line, index) => {
      let text = line.trim();
      if (!text) return <div key={index} style={{ height: '8px' }} />;

      const headerMatch = text.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        const fontSize = level === 1 ? '16px' : level === 2 ? '14px' : '13px';
        return (
          <h5 
            key={index} 
            style={{ 
              margin: '12px 0 6px 0', 
              fontSize, 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              borderBottom: level <= 2 ? '1px solid var(--border-color)' : 'none',
              paddingBottom: level <= 2 ? '4px' : '0'
            }}
          >
            {parseInlineMarkdown(content)}
          </h5>
        );
      }

      if (text.startsWith('- ') || text.startsWith('* ')) {
        return (
          <ul key={index} style={{ margin: '4px 0', paddingLeft: '16px', listStyleType: 'disc' }}>
            <li style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              {parseInlineMarkdown(text.substring(2))}
            </li>
          </ul>
        );
      }

      return (
        <p key={index} style={{ margin: '0 0 6px 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
          {parseInlineMarkdown(text)}
        </p>
      );
    });
  };

  return (
    <EvaluatorLayout pageTitle="Evaluation Workspace" pageSubtitle="Grade the team based on the criteria rubrics, pitch deck, code repository, and assistant analysis." statusItems={[{ label: 'Team', value: team?.name }, { label: 'Stage', value: submission?.stage || 'N/A' }]}>
      <div className="committee-reference-dashboard">

        {/* Blind Consensus warning banner */}
        {consensus?.has_deviation && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#FCA5A5',
            padding: '14px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
            lineHeight: '1.4'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong>Blind Calibration Alert:</strong> {consensus.message}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Left Column: Team Details, Deliverables, AI Questions, Git Heatmap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Team Info Card */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title" style={{ marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-primary)' }}>{team.name}</h3>
                <span className="badge" style={{ background: 'rgba(184, 153, 235, 0.2)', color: '#b899eb', border: '1px solid rgba(184, 153, 235, 0.3)' }}>
                  {team.challenge}
                </span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Team Members</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {team.members?.map((m, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {m.name} <span style={{ opacity: 0.85 }}>({m.institution} • {m.domain})</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Submission Notes</h4>
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '14px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    {formatSubmissionNotes(submission?.notes)}
                  </div>
                </div>
              </div>
            </section>

            {/* Submission Deliverables */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title">
                <h3>Submission Deliverables</h3>
              </div>
              {!submission || (!submission.ppt_url && !submission.github_url && !submission.demo_video_url) ? (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  marginTop: '12px'
                }}>
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>⚠️</span>
                  No deliverables submitted yet by the team.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {submission?.ppt_url && (
                    <a href={submission.ppt_url} target="_blank" rel="noreferrer" className="quick-action-card"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left', transition: 'all 160ms ease', textDecoration: 'none' }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)' }}>Pitch Deck</strong>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Open Slides</small>
                      </div>
                    </a>
                  )}
                  {submission?.github_url && (
                    <a href={submission.github_url} target="_blank" rel="noreferrer" className="quick-action-card"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left', transition: 'all 160ms ease', textDecoration: 'none' }}>
                      <span style={{ fontSize: '20px' }}>💻</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)' }}>GitHub Repo</strong>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>View Code</small>
                      </div>
                    </a>
                  )}
                  {submission?.demo_video_url && (
                    <a href={submission.demo_video_url} target="_blank" rel="noreferrer" className="quick-action-card"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left', transition: 'all 160ms ease', textDecoration: 'none' }}>
                      <span style={{ fontSize: '20px' }}>🎥</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)' }}>Demo Video</strong>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Watch Video</small>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </section>

            {/* GitHub Footprint Heatmap */}
            {githubData && (
              <section className="ref-card" style={{ padding: '20px' }}>
                <div className="ref-section-title" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>💻 GitHub Footprint Heatmap</h3>
                  <span className="status-pill purple" style={{ fontSize: '10px' }}>Future Scope</span>
                </div>

                {githubData.recycled_repo_warning && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#FBBF24',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⚠️</span>
                    <strong>Recycled Repository Warning:</strong> We detected commit activity predating the official hackathon start.
                  </div>
                )}

                {/* Contribution Equity progress bar */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Workload Contribution Equity</h4>
                  <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', margin: '8px 0', background: 'var(--border-color)' }}>
                    {githubData.author_contributions?.map((contrib, idx) => {
                      const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
                      return (
                        <div 
                          key={idx} 
                          style={{
                            width: `${contrib.percentage}%`,
                            backgroundColor: colors[idx % colors.length],
                            height: '100%'
                          }}
                          title={`${contrib.author}: ${contrib.percentage}%`}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {githubData.author_contributions?.map((contrib, idx) => {
                      const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[idx % colors.length], display: 'inline-block' }}></span>
                          <span style={{ color: 'var(--text-primary)' }}>{contrib.author} ({contrib.percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Commit velocity graph */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Commit Velocity (Last 7 Days)</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '70px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {githubData.commit_velocity?.map((vel, idx) => {
                      const maxCommits = Math.max(...githubData.commit_velocity.map(c => c.commits)) || 10;
                      const heightPercent = (vel.commits / maxCommits) * 80 + 20;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-color)', fontWeight: 'bold', marginBottom: '2px' }}>{vel.commits}</span>
                          <div style={{
                            width: '14px',
                            height: `${heightPercent}%`,
                            backgroundColor: 'var(--accent-color)',
                            borderRadius: '3px 3px 0 0',
                            opacity: 0.85
                          }}></div>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>{vel.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ 
                  borderTop: '1px dashed var(--border-color)', 
                  paddingTop: '10px', 
                  marginTop: '14px', 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }}>
                  <span>ℹ️</span>
                  <span>This integration will pull live contribution grids via the GitHub GraphQL API once Team Member OAuth is authenticated.</span>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: grading Rubric */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Evaluation Rubric</h3>
                {data.score_card?.status === 'completed' ? (
                  <span className="badge" style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.25)', fontSize: '12px', fontWeight: 'bold' }}>
                    Total: {weightedScore.toFixed(2)}/10
                  </span>
                ) : data.score_card?.status === 'rescore_requested' ? (
                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '12px', fontWeight: 'bold' }}>
                    Rescore Requested
                  </span>
                ) : (
                  <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '12px', fontWeight: 'bold' }}>
                    Grading in Progress
                  </span>
                )}
              </div>

              {/* Grading Bias Calibration Gauge */}
              {biasData && biasData.has_graded !== false && (
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bias Calibration Gauge:</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: biasData.deviation > 0.5 ? '#F59E0B' : biasData.deviation < -0.5 ? '#3B82F6' : '#10B981' 
                    }}>
                      {biasData.deviation > 0 ? `+${biasData.deviation}` : biasData.deviation} ({biasData.deviation > 0.5 ? 'Lenient' : biasData.deviation < -0.5 ? 'Critical' : 'Balanced'})
                    </span>
                  </div>
                  
                  {/* Gauge slider track */}
                  <div style={{ position: 'relative', height: '6px', background: 'var(--border-color)', borderRadius: '3px', margin: '10px 0' }}>
                    {/* Mid line */}
                    <div style={{ position: 'absolute', left: '50%', top: '-2px', width: '2px', height: '10px', backgroundColor: 'var(--text-secondary)', opacity: 0.5 }}></div>
                    {/* Pointer */}
                    <div style={{
                      position: 'absolute',
                      left: `${Math.min(100, Math.max(0, 50 + (biasData.deviation / 2.0) * 50))}%`,
                      top: '-4px',
                      width: '10px',
                      height: '14px',
                      borderRadius: '2px',
                      background: 'var(--accent-color)',
                      transform: 'translateX(-50%)',
                      transition: 'left 0.3s ease-in-out'
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
                    <span>Critical (-2.0)</span>
                    <span>Balanced</span>
                    <span>Lenient (+2.0)</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rubricCriteriaList.map(criteria => (
                  <RubricScoreSlider
                    key={criteria.id}
                    criteria={criteria}
                    value={scores[criteria.id] || 0}
                    onChange={(val) => setScores(s => ({ ...s, [criteria.id]: val }))}
                  />
                ))}
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Final Feedback Remarks</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                  rows="4"
                  placeholder="Provide constructive feedback remarks for this team..."
                ></textarea>
                
                {/* AI Feedback Copilot Integration */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleAIPolish}
                    disabled={polishing || !feedback.trim()}
                    className="ref-primary-button"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--accent-color)',
                      color: 'var(--accent-color)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: polishing || !feedback.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'bold',
                      boxShadow: 'none'
                    }}
                  >
                    {polishing ? (
                      <>
                        <div className="spinner" style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite', display: 'inline-block' }}></div>
                        <span>Polishing Notes...</span>
                      </>
                    ) : (
                      <span>✨ Polish & Structure with AI Co-Pilot</span>
                    )}
                  </button>

                  {aiStructuredFeedback && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>AI Structured Feedback Preview</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(aiStructuredFeedback).map(([category, text]) => (
                          <div key={category} style={{ fontSize: '12px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{category}: </strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={applyAIFeedbackToNotes}
                        className="ref-primary-button"
                        style={{
                          marginTop: '10px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid #10B981',
                          color: '#10B981',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Apply to Remarks Box
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ref-primary-button"
                style={{
                  width: '100%',
                  marginTop: '16px',
                  background: 'var(--accent-color)',
                  color: '#101927',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {submitting ? (
                  <div className="spinner" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                  'Submit Evaluation'
                )}
              </button>
            </section>
          </div>
        </div>
      </div>
    </EvaluatorLayout>
  )
}
