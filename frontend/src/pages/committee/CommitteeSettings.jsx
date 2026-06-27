import CommitteeLayout from '../../components/layout/CommitteeLayout'

function CommitteeSettings() {
  return (
    <CommitteeLayout statusItems={[{ label: 'Mode', value: 'Simulation' }]} pageTitle="Settings" pageSubtitle="Configure event defaults, notification behavior, simulation mode, and role-based access settings.">
      <section className="card">
        <h3>Operational Settings</h3>
        <form className="config-form">
          <label>
            Event name
            <input defaultValue="TI Hackathon 2026" />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Email simulation</strong>
              <small>Keep SendGrid disabled until production credentials are configured.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label>
            Frontend URL
            <input defaultValue="http://localhost:3000" />
          </label>
          <button className="button" type="button">Save Settings</button>
        </form>
      </section>
    </CommitteeLayout>
  )
}

export default CommitteeSettings
