import React from 'react';
import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { label: 'Templates', count: 12 },
    { label: 'Completed Inspections', count: 34 },
    { label: 'Projects', count: 6 },
    { label: 'Team Members', count: 9 },
  ];

  const recentActivity = [
    { id: 1, action: 'Inspection completed by John Doe', time: 'Today at 9:32 AM' },
    { id: 2, action: 'Template "Roof Safety" updated', time: 'Yesterday at 4:15 PM' },
    { id: 3, action: 'Project "West Tower" added', time: '2 days ago' },
    { id: 4, action: 'New team member added: Alice Smith', time: '2 days ago' },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Welcome to your Dashboard</h1>

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-number">{stat.count}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <ul className="activity-list">
          {recentActivity.map((activity) => (
            <li key={activity.id} className="activity-item">
              <span className="activity-action">{activity.action}</span>
              <span className="activity-time">{activity.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
