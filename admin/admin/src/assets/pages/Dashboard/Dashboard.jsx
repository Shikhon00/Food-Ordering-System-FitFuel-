import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Dashboard.css';
import axios from 'axios';
import { toast } from 'react-toastify';

const currency = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 0,
});

// Formats timestamps in a short dashboard-friendly style.
const formatTime = (value) => {
  if (!value) {
    return 'Just now';
  }

  return new Date(value).toLocaleString('en-BD', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Payment-cancelled/expired orders stay out of the active pipeline; customer
// cancellations remain visible because admin needs their refund amount.
const HIDDEN_PIPELINE_STATUSES = new Set(['Payment Cancelled', 'Refunded', 'Expired']);

// Main admin dashboard: metrics, assignment queue, order pipeline, stock alerts, recent orders.
const Dashboard = ({ url }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [downloadingType, setDownloadingType] = useState('');
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [queueNotice, setQueueNotice] = useState('');
  const previousQueueIdsRef = useRef(null);
  const ASSIGNMENT_PAGE_SIZE = 5;

  // Loads all dashboard data from one backend endpoint.
  const fetchDashboardData = async () => {
    const response = await axios.get(`${url}/api/order/dashboard`);

    if (response.data.success) {
      const nextQueue = response.data.data?.unassignedPaidOrders || [];
      const nextQueueIds = nextQueue.map((order) => order._id);

      // If new unassigned paid orders appear, show a live notice/toast.
      if (previousQueueIdsRef.current) {
        const newOrders = nextQueue.filter((order) => !previousQueueIdsRef.current.has(order._id));

        if (newOrders.length) {
          const message = `${newOrders.length} new paid order${newOrders.length > 1 ? 's' : ''} waiting for rider assignment`;
          setQueueNotice(message);
          toast.info(message);
        }
      }

      previousQueueIdsRef.current = new Set(nextQueueIds);
      setDashboardData(response.data.data);
    } else {
      toast.error(response.data.message || 'Failed to load dashboard');
    }
  };

  // Dashboard auto-refreshes every 5 seconds for live operations.
  useEffect(() => {
    fetchDashboardData();

    const intervalId = window.setInterval(fetchDashboardData, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!queueNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setQueueNotice(''), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [queueNotice]);

  // Downloads daily/monthly CSV report from backend.
  const handleDownloadReport = async (type) => {
    try {
      setDownloadingType(type);
      const response = await axios.get(`${url}/api/order/report?type=${type}`, {
        responseType: 'blob',
      });

      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      link.href = fileUrl;
      link.setAttribute('download', filenameMatch?.[1] || `${type}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      toast.error(`Failed to download ${type} report`);
    } finally {
      setDownloadingType('');
    }
  };

  // Small operational cards below sales metrics.
  const dashboardHealth = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    const { metrics } = dashboardData;

    return [
      {
        label: 'Needs rider',
        value: metrics.awaitingAssignmentOrders,
        tone: metrics.awaitingAssignmentOrders > 0 ? 'danger' : 'good',
      },
      {
        label: 'Cancelled',
        value: metrics.cancelledOrders,
        tone: metrics.cancelledOrders > 0 ? 'warning' : 'muted',
      },
      {
        label: 'Active delivery',
        value: metrics.activeDeliveryOrders,
        tone: 'active',
      },
    ];
  }, [dashboardData]);

  // Assignment queue pagination.
  const unassignedPaidOrders = dashboardData?.unassignedPaidOrders || [];
  const assignmentTotalPages = Math.max(1, Math.ceil(unassignedPaidOrders.length / ASSIGNMENT_PAGE_SIZE));
  const assignmentStartIndex = (assignmentPage - 1) * ASSIGNMENT_PAGE_SIZE;
  const paginatedAssignmentOrders = unassignedPaidOrders.slice(assignmentStartIndex, assignmentStartIndex + ASSIGNMENT_PAGE_SIZE);

  useEffect(() => {
    if (assignmentPage > assignmentTotalPages) {
      setAssignmentPage(assignmentTotalPages);
    }
  }, [assignmentPage, assignmentTotalPages]);

  if (!dashboardData) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  const { metrics, statusBreakdown, lowStockProducts, recentOrders } = dashboardData;

  // Top sales/food metrics.
  const metricCards = [
    { label: 'Today Sales', value: currency.format(metrics.todaySales), hint: 'Collected from paid orders', accent: 'green' },
    { label: 'Monthly Sales', value: currency.format(metrics.monthlySales), hint: 'This month revenue', accent: 'blue' },
    { label: 'Total Orders', value: metrics.totalOrders, hint: `${metrics.paidOrders} paid orders`, accent: 'orange' },
    { label: 'Food Items Sold', value: metrics.totalItemsSold, hint: `${metrics.totalProducts} foods in inventory`, accent: 'purple' },
  ];

  // Pipeline excludes cancelled/payment cancelled/expired to keep focus on active operations.
  const visibleStatusBreakdown = statusBreakdown.filter((item) => !HIDDEN_PIPELINE_STATUSES.has(item.status));
  const highestStatusCount = Math.max(...visibleStatusBreakdown.map((item) => item.count), 1);

  return (
    <main className="dashboard">
      <section className="dashboard-topbar">
        <div>
          <p className="dashboard-eyebrow">Live operations</p>
          <h1>Admin Command Center</h1>
          <p className="dashboard-subtitle">
            Monitor payments, food orders, rider assignment, delivery pressure, inventory alerts, and recent customer activity.
          </p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={fetchDashboardData}>Refresh</button>
          <button
            type="button"
            onClick={() => handleDownloadReport('daily')}
            disabled={downloadingType !== ''}
          >
            {downloadingType === 'daily' ? 'Downloading...' : 'Daily CSV'}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadReport('monthly')}
            disabled={downloadingType !== ''}
            className="secondary"
          >
            {downloadingType === 'monthly' ? 'Downloading...' : 'Monthly CSV'}
          </button>
        </div>
      </section>

      {queueNotice ? (
        <div className="dashboard-live-notice">
          <strong>New order alert</strong>
          <span>{queueNotice}</span>
        </div>
      ) : null}

      <section className="metrics-grid">
        {metricCards.map((card) => (
          <article key={card.label} className={`metric-card ${card.accent}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="ops-strip">
        {dashboardHealth.map((item) => (
          <div key={item.label} className={`ops-card ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="dashboard-layout">
        <article className="dashboard-panel order-queue-panel">
          <div className="panel-heading">
            <div>
              <h2>Assignment Queue</h2>
              <p>Paid orders waiting for a delivery partner</p>
            </div>
            <span>{unassignedPaidOrders.length} waiting</span>
          </div>

          {unassignedPaidOrders.length ? (
            <div className="queue-list">
              {paginatedAssignmentOrders.map((order) => (
                <div key={order._id} className="queue-row">
                  <div>
                    <strong>{order.customerName || 'Customer'}</strong>
                    <p>{order.area} | {order.itemsCount} items | {formatTime(order.date)}</p>
                  </div>
                  <span>{currency.format(order.amount)}</span>
                </div>
              ))}
              <div className="queue-pagination">
                <button
                  type="button"
                  onClick={() => setAssignmentPage((page) => Math.max(1, page - 1))}
                  disabled={assignmentPage === 1}
                >
                  Previous
                </button>
                <span>Page {assignmentPage} of {assignmentTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setAssignmentPage((page) => Math.min(assignmentTotalPages, page + 1))}
                  disabled={assignmentPage === assignmentTotalPages}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-state">No paid orders are waiting for rider assignment.</p>
          )}
        </article>

        <article className="dashboard-panel order-pipeline-panel">
          <div className="panel-heading">
            <div>
              <h2>Order Pipeline</h2>
              <p>Current order status distribution</p>
            </div>
            <span>{visibleStatusBreakdown.reduce((total, item) => total + item.count, 0)} orders</span>
          </div>
          <div className="pipeline-cancel-total">
            <span>Cancelled refund amount</span>
            <strong>{currency.format(metrics.cancelledOrdersAmount || 0)}</strong>
          </div>
          <div className="status-list">
            {visibleStatusBreakdown.map((item) => (
              <div key={item.status} className="status-row">
                <div className="status-meta">
                  <strong>{item.status}</strong>
                  <span>{item.count} orders | {currency.format(item.amount || 0)}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{ width: `${(item.count / highestStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Inventory Watch</h2>
              <p>Food items with 5 or fewer left</p>
            </div>
          </div>
          {lowStockProducts.length ? (
            <div className="stock-list">
              {lowStockProducts.map((product) => (
                <div key={product._id} className="stock-row">
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.category}</p>
                  </div>
                  <span>{product.quantity} left</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Inventory looks healthy right now.</p>
          )}
        </article>

        <article className="dashboard-panel recent-orders-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>Latest customer activity</p>
            </div>
          </div>
          <div className="recent-orders-table">
            <div className="recent-orders-head">
              <span>Customer</span>
              <span>Time</span>
              <span>Amount</span>
              <span>Payment</span>
              <span>Status</span>
            </div>
            {recentOrders.map((order) => (
              <div key={order._id} className="recent-orders-row">
                <span>{order.customerName || 'Customer'}</span>
                <span>{formatTime(order.date)}</span>
                <span>{currency.format(order.amount)}</span>
                <span className={order.payment ? 'paid' : 'pending'}>{order.payment ? 'Paid' : 'Pending'}</span>
                <span>{order.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
};

export default Dashboard;
