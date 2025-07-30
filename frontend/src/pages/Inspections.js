// src/pages/Inspections.js
import React, { useEffect, useState } from "react";

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInspections() {
      setLoading(true);
      const res = await fetch("http://localhost:4000/inspections");
      const data = await res.json();
      setInspections(data);
      setLoading(false);
    }
    fetchInspections();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Inspections</h2>
      {loading ? (
        <p>Loading inspections...</p>
      ) : inspections.length === 0 ? (
        <p>No inspections found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Template</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Date</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp) => (
              <tr key={insp.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{insp.templateName || "Untitled"}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{insp.createdAt ? new Date(insp.createdAt).toLocaleString() : ""}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  <span style={{
                    color: insp.status === "complete" ? "#28a745" : "#ff9800",
                    fontWeight: 600,
                    textTransform: "capitalize"
                  }}>
                    {insp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
