import EmptyState from '../../components/common/EmptyState'
import CommitteeLayout from '../../components/layout/CommitteeLayout'

function CommitteeSection({ title, description, rows = [], emptyTitle = 'Nothing here yet', emptyMessage = 'Data will appear here when the backend workflow is connected.' }) {
  return (
    <CommitteeLayout statusItems={[{ label: 'Module', value: title }]} pageTitle={title} pageSubtitle={description}>
      <section className="card">
        <h3>{title}</h3>
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          rows.map((row) => (
            <div className="team-row" key={row.label}>
              <div className="team-copy">
                <strong>{row.label}</strong>
                <span>{row.detail}</span>
              </div>
              <span className={row.tone === 'warn' ? 'badge warn' : 'badge'}>{row.status}</span>
            </div>
          ))
        )}
      </section>
    </CommitteeLayout>
  )
}

export default CommitteeSection

