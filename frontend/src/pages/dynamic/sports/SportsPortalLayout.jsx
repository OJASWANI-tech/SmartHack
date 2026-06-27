import PortalLayout from '../../../components/layout/PortalLayout'
import { sportsParticipantNavItems, sportsEvaluatorNavItems } from '../../../navigation'

/*
 * SportsPortalLayout — the sports track's own shell, built on the same shared
 * PortalLayout (sidebar + theme + CSS-variable theming) the MVP /participant and
 * /evaluator portals use, so it inherits their look-and-feel without importing
 * anything from those folders directly.
 */
export default function SportsPortalLayout({ role = 'participant', eventName, pageTitle, pageSubtitle, headerActions, children }) {
  const isEvaluator = role === 'evaluator'
  return (
    <PortalLayout
      title={eventName || 'Sports Tournament'}
      eyebrow={isEvaluator ? 'Referee Console' : 'Sports Participant Portal'}
      navItems={isEvaluator ? sportsEvaluatorNavItems : sportsParticipantNavItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      headerActions={headerActions}
    >
      {children}
    </PortalLayout>
  )
}
