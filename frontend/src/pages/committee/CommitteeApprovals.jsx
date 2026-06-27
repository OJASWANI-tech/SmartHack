import { useEffect, useState } from 'react'
import ApprovalQueue from '../../components/dashboard/ApprovalQueue'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import Skeleton from '../../components/common/Skeleton'
import { getApprovalQueue } from '../../services/committee'

function CommitteeApprovals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getApprovalQueue().then(setApprovals).finally(() => setLoading(false))
  }, [])

  return (
    <CommitteeLayout
      notifications={["Approval decisions unlock communication and progression workflow steps"]}
      pageTitle="Team Approval"
      pageSubtitle="Review queued approval actions for teams, stage changes, communications, and final results."
    >
      {loading ? <Skeleton rows={3} /> : <ApprovalQueue approvals={approvals} />}
    </CommitteeLayout>
  )
}

export default CommitteeApprovals

