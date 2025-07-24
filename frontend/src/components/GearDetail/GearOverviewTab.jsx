// src/components/GearDetail/GearOverviewTab.jsx
import React from "react";

export default function GearOverviewTab({ gear }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="font-semibold text-slate-700">Category:</span>{" "}
        {gear.category}
      </div>
      <div>
        <span className="font-semibold text-slate-700">Status:</span>{" "}
        {gear.status}
      </div>
      <div>
        <span className="font-semibold text-slate-700">Serial #:</span>{" "}
        {gear.serialNumber || <span className="text-slate-400">None</span>}
      </div>
      <div>
        <span className="font-semibold text-slate-700">Assigned To:</span>{" "}
        {gear.assignedTo || <span className="text-slate-400">Unassigned</span>}
      </div>
      <div>
        <span className="font-semibold text-slate-700">Project:</span>{" "}
        {gear.assignedProject || <span className="text-slate-400">None</span>}
      </div>
      {gear.notes && (
        <div>
          <span className="font-semibold text-slate-700">Notes:</span>{" "}
          {gear.notes}
        </div>
      )}
    </div>
  );
}
