import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import EmailPreviewModal from './EmailPreviewModal';

const NotificationReview = ({ token }) => {
  const [contracts, setContracts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  useEffect(() => {
    const fetchExpiringContracts = async () => {
      try {
        const response = await api.get('/contracts/expiring-for-notice');
        setContracts(response.data);

        // Pre-select contracts that have not been renewed
        const unrenewedIds = response.data
          .filter(c => !c.renew_code)
          .map(c => c.contract_id);
        setSelectedIds(new Set(unrenewedIds));
      } catch (error) {
        console.error("Failed to fetch expiring contracts", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpiringContracts();
  }, [token]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(contracts.map(c => c.contract_id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (contractId) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(contractId)) {
      newSelectedIds.delete(contractId);
    } else {
      newSelectedIds.add(contractId);
    }
    setSelectedIds(newSelectedIds);
  };

  const selectedContracts = useMemo(() => {
    return contracts.filter(c => selectedIds.has(c.contract_id));
  }, [contracts, selectedIds]);

  const handleSendNotice = async () => {
    if (!emailTo.trim()) {
      alert('Please enter at least one recipient email.');
      return;
    }

    setIsSending(true);
    try {
      await api.post('/notifications/send-renewal-email', {
        contractIds: Array.from(selectedIds),
        to: emailTo.trim()
      });
      alert('Notification sent successfully!');
    } catch (error) {
      console.error("Failed to send notification", error);
      alert(`Error: ${error.response?.data?.error || 'Could not send the email.'}`);
    } finally {
      setIsSending(false);
      setIsPreviewModalOpen(false); // Close the modal
    }
  };

  if (isLoading) {
    return <div>Loading contracts...</div>;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="mb-4">
        <h2>Review Expiration Notice</h2>
        <p className="text-muted">
          Select the contracts to include in the notification email. The list below shows all contracts expiring soon.
        </p>
      </div>

      <div className="card p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <input
              type="checkbox"
              className="form-check-input me-2"
              onChange={handleSelectAll}
              checked={selectedIds.size === contracts.length && contracts.length > 0}
              ref={el => el && (el.indeterminate = selectedIds.size > 0 && selectedIds.size < contracts.length)}
            />
            <label className="form-check-label">
              <strong>Selected: {selectedIds.size} of {contracts.length} contracts</strong>
            </label>
          </div>
          <div>
            <button className="btn btn-outline-primary me-2" onClick={() => setIsPreviewModalOpen(true)}>
              Preview Email
            </button>
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
            <thead>
            <tr>
                <th>{/* Checkbox column */}</th>
                <th>Status</th>
                <th>Contract Name</th>
                <th>Client</th>
                <th>Job Note</th>
                <th>End Date</th>
                <th>Sales</th>
            </tr>
            </thead>
            <tbody>
            {contracts.map(contract => (
                <tr key={contract.contract_id} className={contract.renew_code ? 'table-light text-muted' : ''}>
                <td>
                    <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedIds.has(contract.contract_id)}
                    onChange={() => handleSelectOne(contract.contract_id)}
                    />
                </td>
                <td>
                    <span className={`badge ${contract.renew_code ? 'bg-success' : 'bg-warning'}`}>
                    {contract.renew_code ? 'Renewed' : 'Expiring Soon'}
                    </span>
                </td>
                <td>{contract.contract_name}</td>
                <td>{contract.client_name}</td>
                <td>{contract.jobnote}</td>
                <td>{new Date(contract.end_date).toLocaleDateString()}</td>
                <td>{contract.sales}</td>
                </tr>
            ))}
            </tbody>
        </table>
      </div>

      <EmailPreviewModal
        show={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        contracts={selectedContracts}
        onSend={handleSendNotice}
        isSending={isSending} // Pass the state down
        toEmail={emailTo}
        onToEmailChange={setEmailTo}
      />
    </div>
  );
};

export default NotificationReview;
