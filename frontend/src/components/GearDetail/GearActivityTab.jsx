// src/components/GearDetail/GearActivityTab.jsx
import React from "react";

export default function GearActivityTab({ gear }) {
  // Placeholder: In real app, load activity log from DB
  const sampleActivity = [
    { id: 1, action: "Created", by: "Jan Machala", date: "2024-07-19 11:30" },
    { id: 2, action: "Assigned to Project", by: "John Doe", date: "2024-07-20 09:02" },
    // Add more as needed
  ];

  return (
    <div>
      <ul className="space-y-2">
        {sampleActivity.map((a) => (
          <li key={a.id} className="border-b pb-2">
            <div className="font-medium">{a.action}</div>
            <div className="text-sm text-slate-500">
              by {a.by} &middot; {a.date}
            </div>
          </li>
        ))}
      </ul>
      {/* In real app, fetch from backend */}
    </div>
  );
}
