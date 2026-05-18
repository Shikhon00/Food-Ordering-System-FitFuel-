import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './DeliveryPartners.css';

// Admin page for rider approval, rejection, availability, warnings, and reports.
const DeliveryPartners = ({ url }) => {
  const [partners, setPartners] = useState([]);

  // Loads every delivery partner with their current status and counts.
  const fetchPartners = async () => {
    const response = await axios.get(`${url}/api/delivery/admin/list`);

    if (response.data.success) {
      setPartners(response.data.data || []);
    } else {
      toast.error(response.data.message || 'Failed to load delivery partners');
    }
  };

  // Refresh periodically so rider availability changes appear without reload.
  useEffect(() => {
    fetchPartners();
    const intervalId = window.setInterval(fetchPartners, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Admin approval/rejection action.
  const updatePartnerStatus = async (partnerId, status) => {
    const response = await axios.post(`${url}/api/delivery/admin/approve`, { partnerId, status });

    if (response.data.success) {
      toast.success(response.data.message);
      fetchPartners();
    } else {
      toast.error(response.data.message || 'Unable to update delivery partner');
    }
  };

  // Summary counters shown above rider cards.
  const summary = useMemo(() => {
    return partners.reduce(
      (totals, partner) => ({
        pending: totals.pending + (partner.status === 'Pending Approval' ? 1 : 0),
        approved: totals.approved + (partner.status === 'Approved' ? 1 : 0),
        free: totals.free + (partner.availability === 'Free' ? 1 : 0),
        busy: totals.busy + (partner.availability === 'Busy' ? 1 : 0),
      }),
      { pending: 0, approved: 0, free: 0, busy: 0 }
    );
  }, [partners]);

  return (
    <div className="delivery-partners-page">
      <div className="delivery-partners-header">
        <div>
          <h3>Delivery Partners</h3>
          <p>Approve riders, reject unsafe accounts, check who is free, and monitor active delivery workload.</p>
        </div>
        <button type="button" onClick={fetchPartners}>Refresh</button>
      </div>

      <div className="delivery-summary-grid">
        <div><span>Pending</span><strong>{summary.pending}</strong></div>
        <div><span>Approved</span><strong>{summary.approved}</strong></div>
        <div><span>Free</span><strong>{summary.free}</strong></div>
        <div><span>Busy</span><strong>{summary.busy}</strong></div>
      </div>

      <div className="delivery-partner-list">
        {partners.map((partner) => (
          <div key={partner._id} className="delivery-partner-card">
            <div>
              <strong>{partner.name}</strong>
              <p>{partner.email} | {partner.phone}</p>
              <p>{partner.vehicleType} | Location: {partner.lastKnownLocation}</p>
              <p>Delivered: {partner.deliveredCount || 0} | Reports: {partner.reportCount || 0}</p>
              <p>Warnings: {partner.warningCount || 0}</p>
              {partner.lastWarningReason ? (
                <p className="partner-warning-note">{partner.lastWarningReason}</p>
              ) : null}
              {partner.status === "Rejected" ? (
                <p className="partner-rejected-note">Rejected riders stay here as admin history, but they are offline and cannot work.</p>
              ) : null}
            </div>
            <div className="partner-status-group">
              <span className={`partner-status ${partner.status.replaceAll(' ', '-').toLowerCase()}`}>
                {partner.status}
              </span>
              <span className={`partner-availability ${partner.availability.toLowerCase()}`}>
                {partner.availability}
              </span>
            </div>
            <div className="partner-actions">
              {partner.status !== 'Approved' ? (
                <button type="button" onClick={() => updatePartnerStatus(partner._id, 'Approved')}>
                  Approve
                </button>
              ) : null}
              {partner.status !== 'Rejected' ? (
                <button type="button" className="danger" onClick={() => updatePartnerStatus(partner._id, 'Rejected')}>
                  Reject
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryPartners;
