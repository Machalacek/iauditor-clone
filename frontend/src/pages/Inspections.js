// src/pages/Inspections.js
import React, { useEffect, useState } from "react";
import "./Templates.css";
import { api } from "../lib/api";

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchInspections() {
      setLoading(true);
      try {
        const data = await api.get("/inspections");
        setInspections(data);
      } finally {
        setLoading(false);
      }
    }
    fetchInspections();
  }, []);

  const filteredInspections = inspections.filter((insp) =>
    (insp.templateName || "").toLowerCase().includes(search.toLowerCase())
  );

  function statusBadge(status) {
    if (status === "complete")
      return (
        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
          Complete
        </span>
      );
    if (status === "in_progress")
      return (
        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          In Progress
        </span>
      );
    return (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
        {status}
      </span>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Inspections
          </h1>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            className="border rounded px-3 py-2 w-full md:w-1/2"
            placeholder="Search by template name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-md">
        {loading ? (
          <div className="p-6 text-gray-500">Loading inspections…</div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-6 text-gray-400">No inspections found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-blue-50 text-blue-800">
                  <th className="py-3 px-5 text-left font-bold">Template</th>
                  <th className="py-3 px-5 text-left font-bold">Date</th>
                  <th className="py-3 px-5 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp) => (
                  <tr key={insp.id} className="border-b hover:bg-blue-50 transition">
                    <td className="py-3 px-5 font-medium text-gray-800">
                      {insp.templateName || "Untitled"}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {insp.createdAt
                        ? new Date(insp.createdAt).toLocaleString()
                        : ""}
                    </td>
                    <td className="py-3 px-5">
                      {statusBadge(insp.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
