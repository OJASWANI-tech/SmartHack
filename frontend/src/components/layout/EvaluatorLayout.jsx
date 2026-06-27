import PortalLayout from './PortalLayout'
import { evaluatorNavItems } from '../../navigation'

function EvaluatorLayout({ children, notifications = [], statusItems = [], pageTitle, pageSubtitle, headerActions }) {
  return (
    <PortalLayout
      title="Judge Console"
      eyebrow="Evaluator Portal"
      navItems={evaluatorNavItems}
      notifications={notifications}
      statusItems={statusItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      headerActions={headerActions}
    >
      {children}
    </PortalLayout>
  )
}

export default EvaluatorLayout

