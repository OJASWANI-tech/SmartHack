import React, { useState, useRef } from 'react';
import {
  Send, ChevronDown, Eye, Search, X, Loader2, Bell, AlertCircle,
  CheckCircle, Clock, Zap
} from 'lucide-react';

const STATUS_BADGES = {
  Sent: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  'Pending Approval': { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: Clock },
  Draft: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: AlertCircle },
  Skipped: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: AlertCircle }
};

export default function Communications() {
  const [announcement, setAnnouncement] = useState('');
  const [recipientType, setRecipientType] = useState('All Participants');
  const [toastMessage, setToastMessage] = useState('');
  const [expandedRecent, setExpandedRecent] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchLogs, setSearchLogs] = useState('');

  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Welcome & Registration Confirmation',
      status: 'Sent',
      date: 'May 21, 10:10 AM',
      preview: 'Welcome to Case Competition 2026! Your registration has been confirmed.',
      recipients: 150
    },
    {
      id: 2,
      name: 'Team Assignment Announcement',
      status: 'Pending Approval',
      date: 'May 20, 3:45 PM',
      preview: 'Your team assignments have been finalized. Check your dashboard for details.',
      recipients: 150
    },
    {
      id: 3,
      name: 'Challenge Briefing',
      status: 'Draft',
      date: 'May 19, 9:20 AM',
      preview: 'Here is your case challenge briefing for the competition. Read carefully and prepare.',
      recipients: 150
    },
    {
      id: 4,
      name: 'Evaluation Reminder (to Judges)',
      status: 'Draft',
      date: 'May 18, 2:15 PM',
      preview: 'As a judge, please complete your evaluations by the deadline.',
      recipients: 25
    },
    {
      id: 5,
      name: 'Results Publication',
      status: 'Skipped',
      date: 'May 17, 11:30 AM',
      preview: 'The results are now available. Congratulations to all winners!',
      recipients: 0
    }
  ]);

  const [deliveryLogs, setDeliveryLogs] = useState([
    { id: 1, recipient: 'Aditya Kumar', email: 'aditya@example.com', template: 'Welcome & Registration Confirmation', status: 'Delivered', time: '10:15 AM' },
    { id: 2, recipient: 'Priya Singh', email: 'priya@example.com', template: 'Welcome & Registration Confirmation', status: 'Delivered', time: '10:15 AM' },
    { id: 3, recipient: 'Rajesh Patel', email: 'rajesh@example.com', template: 'Welcome & Registration Confirmation', status: 'Failed', time: '10:16 AM' },
    { id: 4, recipient: 'Neha Verma', email: 'neha@example.com', template: 'Welcome & Registration Confirmation', status: 'Delivered', time: '10:15 AM' },
    { id: 5, recipient: 'Dr. Mrutyunjay Rout', email: 'judge1@example.com', template: 'Evaluation Reminder (to Judges)', status: 'Pending', time: '2:16 PM' }
  ]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const handleBroadcast = () => {
    if (!announcement.trim()) {
      triggerToast('Please enter an announcement before broadcasting.');
      return;
    }
    triggerToast(`Announcement broadcast to ${recipientType}.`);
    setAnnouncement('');
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleApproveTemplate = (templateId) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, status: 'Sent' } : t))
    );
    setSelectedTemplate(null);
    triggerToast('Template approved and sent successfully.');
  };

  const handleSaveTemplate = (templateId) => {
    setSelectedTemplate(null);
    triggerToast('Template saved as draft.');
  };

  const filteredLogs = deliveryLogs.filter(
    (log) =>
      log.recipient.toLowerCase().includes(searchLogs.toLowerCase()) ||
      log.email.toLowerCase().includes(searchLogs.toLowerCase())
  );

  const RECIPIENT_OPTIONS = ['All Participants', 'Team Leads', 'Judges', 'Mentors', 'Organizers'];

  return (
    <div className="min-h-screen bg-[#0a1428]">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-[#0d1b2a] px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Communications</h1>
            <p className="text-sm text-slate-400">Broadcast announcements, manage email templates, and monitor delivery activity.</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <span className="text-xl">☀️</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8 max-w-6xl mx-auto">
        {/* Announcement Composer */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Type a dashboard announcement…"
              className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-200 text-sm font-medium hover:border-white/[0.15] transition-colors focus:outline-none focus:border-blue-500/40"
            >
              {RECIPIENT_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>

            <button
              onClick={handleBroadcast}
              className="ml-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Broadcast
            </button>
          </div>
        </div>

        {/* Recent Broadcasts */}
        <div className="mb-8">
          <button
            onClick={() => setExpandedRecent(!expandedRecent)}
            className="flex items-center gap-2 mb-4 text-slate-300 hover:text-white transition-colors font-semibold"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${expandedRecent ? 'rotate-180' : ''}`}
            />
            Recent Broadcasts
          </button>

          {expandedRecent && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 mb-6">
              <p className="text-sm text-slate-400">Latest announcements will appear here after broadcasting.</p>
            </div>
          )}
        </div>

        {/* Email Templates */}
        <div className="space-y-4 mb-8">
          {templates.map((template) => {
            const StatusIcon = STATUS_BADGES[template.status]?.icon || AlertCircle;
            return (
              <div
                key={template.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-white">{template.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          STATUS_BADGES[template.status]?.color
                        }`}
                      >
                        <StatusIcon className="w-3 h-3" /> {template.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{template.preview}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{template.date}</span>
                      {template.recipients > 0 && <span>·</span>}
                      {template.recipients > 0 && <span>{template.recipients} recipients</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-medium text-sm transition-colors flex-shrink-0"
                  >
                    Preview Draft
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery Logs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setExpandedLogs(!expandedLogs)}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-semibold"
            >
              <span>Delivery Logs</span>
              {expandedLogs && <span className="text-blue-400 text-xs font-medium">Collapse Logs</span>}
            </button>
          </div>

          {expandedLogs && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchLogs}
                    onChange={(e) => setSearchLogs(e.target.value)}
                    placeholder="Filter logs by recipient name or email lookup…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/40"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No matching delivery logs found.</p>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{log.recipient}</p>
                        <p className="text-xs text-slate-500 truncate">{log.email}</p>
                        <p className="text-xs text-slate-500 mt-1">{log.template}</p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{log.time}</p>
                          <span
                            className={`inline-block text-xs font-semibold mt-1 px-2 py-1 rounded ${
                              log.status === 'Delivered'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.status === 'Failed'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1b2a] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/[0.08] bg-[#0a1428]">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                <p className={`text-xs mt-1 font-semibold ${
                  STATUS_BADGES[selectedTemplate.status]?.color
                }`}>
                  Status: {selectedTemplate.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Email Preview</h3>
                <div className="space-y-3 text-slate-300 text-sm">
                  <p><strong>Subject:</strong> {selectedTemplate.name}</p>
                  <p><strong>Recipients:</strong> {selectedTemplate.recipients}</p>
                  <div className="mt-4 p-4 bg-slate-900/50 rounded border border-white/[0.06]">
                    <p>{selectedTemplate.preview}</p>
                  </div>
                </div>
              </div>

              {selectedTemplate.status === 'Draft' && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleApproveTemplate(selectedTemplate.id)}
                    className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                  >
                    Approve & Send
                  </button>
                  <button
                    onClick={() => handleSaveTemplate(selectedTemplate.id)}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold text-sm transition-colors"
                  >
                    Save as Draft
                  </button>
                </div>
              )}

              {selectedTemplate.status === 'Pending Approval' && (
                <button
                  onClick={() => handleApproveTemplate(selectedTemplate.id)}
                  className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                >
                  Approve & Send
                </button>
              )}

              <button
                onClick={() => setSelectedTemplate(null)}
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-blue-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-blue-300 shadow-lg transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
