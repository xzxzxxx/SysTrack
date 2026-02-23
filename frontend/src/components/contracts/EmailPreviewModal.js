import React from 'react';

const EmailPreviewModal = ({ show, onClose, contracts, onSend, isSending, toEmail, onToEmailChange }) => {
  if (!show) {
    return null;
  }
  const currentDate = new Date();
  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g., "June 2025"
  const subjectLine = `Maintenance contract reminder (${monthYear})`;

  // Read expiring months from sessionStorage
  const readExpiringMonths = () => {
    const raw = sessionStorage.getItem('expiringMonthsOverride');
    const m = raw ? parseInt(raw, 10) : 3;
    return Number.isFinite(m) && m > 0 ? m : 3;
  };
  const months = readExpiringMonths();

  // Define the columns for the email table as specified
  const columns = [
    { key: 'contract_id', label: 'Contract ID' },
    { key: 'client_code', label: 'Client Code' },
    { key: 'renew_code', label: 'Renew Code' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'client_name', label: 'Client' },
    { key: 'alias', label: 'Alias' },
    { key: 'jobnote', label: 'Job Note' },
    { key: 'sales', label: 'Sales' },
    { key: 'contract_name', label: 'Contract Name' },
    { key: 'location', label: 'Location' },
    { key: 'category', label: 'Category' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'project_name', label: 'Project Name' },
  ];

  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Email Preview</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label><strong>To:</strong></label>
              <input
                type="email"
                className="form-control"
                value={toEmail}
                onChange={(e) => onToEmailChange(e.target.value)}
                placeholder="Enter recipient email"
              />
            </div>
            <p><strong>Subject:</strong> {subjectLine}</p>
            <hr />
            <p>Dear Sales,</p>
            <p>Here is a list of maintenance contracts which will expire in the coming {months} month(s). Thank you!</p>

            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.contract_id}>
                      {columns.map(col => {
                        let cellData = c[col.key] || '-';
                        if (col.key === 'start_date' || col.key === 'end_date') {
                          cellData = new Date(c[col.key]).toLocaleDateString();
                        }
                        return <td key={col.key}>{cellData}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <p>Best regards,</p>
              <p>SysTrack App</p>
            </div>

          </div>
          <div className="modal-footer d-flex justify-content-between">
            {/* Left button */}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            {/* Right button */}
            <button type="button" className="btn btn-primary" onClick={onSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Notice to Sales Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;