import { useEffect, useState } from 'react'
import ParticipantIntakePanel from '../../components/participants/ParticipantIntakePanel'
import ParticipantRoster from '../../components/participants/ParticipantRoster'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import Skeleton from '../../components/common/Skeleton'
import { getParticipantRoster } from '../../services/committee'

function CommitteeParticipants() {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getParticipantRoster().then(setParticipants).finally(() => setLoading(false))
  }, [])

  return (
    <CommitteeLayout statusItems={[{ label: 'Participants', value: participants.length || 'loading' }]} pageTitle="Participant Intake" pageSubtitle="Upload CSVs, add participants manually, search by profile, and filter the roster before team generation.">
      <ParticipantIntakePanel />
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Skeleton rows={4} />
        ) : (
          <ParticipantRoster
            participants={participants}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
      </div>
    </CommitteeLayout>
  )
}

export default CommitteeParticipants

