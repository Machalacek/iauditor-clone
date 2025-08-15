// src/components/ProjectDetailModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useGearStore } from "../store/gearStore";

const API = "http://localhost:4000";

export default function ProjectDetailModal({ project, onClose }) {
  const modalRef = useRef(null);
  const [tab, setTab] = useState("Overview");
  const [materials, setMaterials] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    quantity: "",
    unit: "",
    cost: "",
    note: "",
  });

  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "Low",
    date: new Date().toISOString().slice(0,10),
  });

  const gear = useGearStore((s) => s.gear);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [mRes, iRes, inspRes] = await Promise.all([
          fetch(`${API}/projects/${project.id}/materials`),
          fetch(`${API}/projects/${project.id}/incidents`),
          fetch(`${API}/inspections`),
        ]);
        const [m, i, insp] = await Promise.all([mRes.json(), iRes.json(), inspRes.json()]);
        setMaterials(m);
        setIncidents(i);
        // naive link: match project name text or explicit projectId
        const related = insp.filter((row) => {
          const ans = row.answers || {};
          const hay = JSON.stringify(ans).toLowerCase();
          return hay.includes((project.name || "").toLowerCase()) ||
                 ans.projectId === project.id ||
                 ans.project === project.name;
        });
        setInspections(related);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id, project.name]);

  useEffect(() => {
    function listener(e) {
      if (!modalRef.current || modalRef.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [onClose]);

  const assignedGear = gear.filter((g) =>
    g.assignedProject === project.id || g.assignedProject === project.name
  );

  async function addMaterial(e) {
    e.preventDefault();
    const payload = {
      ...newMaterial,
      quantity: newMaterial.quantity ? Number(newMaterial.quantity) : null,
      cost: newMaterial.cost ? Number(newMaterial.cost) : null,
    };
    const res = await fetch(`${API}/projects/${project.id}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await res.json();
    setMaterials((arr) => [created, ...arr]);
    setNewMaterial({ name: "", quantity: "", unit: "", cost: "", note: "" });
  }

  async function deleteMaterial(id) {
    await fetch(`${API}/projects/${project.id}/materials/${id}`, { method: "DELETE" });
    setMaterials((arr) => arr.filter((m) => m.id !== id));
  }

  async function addIncident(e) {
    e.preventDefault();
    const res = await fetch(`${API}/projects/${project.id}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newIncident),
    });
    const created = await res.json();
    setIncidents((arr) => [created, ...arr]);
    setNewIncident({ title: "", description: "", severity: "Low", date: new Date().toISOString().slice(0,10) });
  }

  async function deleteIncident(id) {
    await fetch(`${API}/projects/${project.id}/incidents/${id}`, { method: "DELETE" });
    setIncidents((arr) => arr.filter((m) => m.id !== id));
  }

  const tabs = ["Overview", "Materials", "Incidents", "Inspections", "Assigned Gear"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
            <p className="text-sm text-gray-500">Project details</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b mb-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm rounded-t ${
                tab === t ? "bg-white border border-b-white border-gray-300 font-semibold" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[260px]">
          {tab === "Overview" && (
            <div className="space-y-3">
              <div><span className="font-semibold text-slate-700">Archived:</span> {project.archived ? "Yes" : "No"}</div>
              <div><span className="font-semibold text-slate-700">Active:</span> {project.active ? "Yes" : "No"}</div>
              {project.createdAt && <div><span className="font-semibold text-slate-700">Created:</span> {new Date(project.createdAt).toLocaleString()}</div>}
              {project.updatedAt && <div><span className="font-semibold text-slate-700">Updated:</span> {new Date(project.updatedAt).toLocaleString()}</div>}
              {loading && <div className="text-gray-500">Loading…</div>}
            </div>
          )}

          {tab === "Materials" && (
            <div className="space-y-4">
              <form onSubmit={addMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Name</label>
                  <input value={newMaterial.name} onChange={(e)=>setNewMaterial(s=>({...s,name:e.target.value}))} className="w-full border rounded px-2 py-1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Qty</label>
                  <input type="number" step="any" value={newMaterial.quantity} onChange={(e)=>setNewMaterial(s=>({...s,quantity:e.target.value}))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Unit</label>
                  <input value={newMaterial.unit} onChange={(e)=>setNewMaterial(s=>({...s,unit:e.target.value}))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Cost</label>
                  <input type="number" step="any" value={newMaterial.cost} onChange={(e)=>setNewMaterial(s=>({...s,cost:e.target.value}))} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium">Note</label>
                  <input value={newMaterial.note} onChange={(e)=>setNewMaterial(s=>({...s,note:e.target.value}))} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                    <Plus size={16}/> Add Material
                  </button>
                </div>
              </form>

              <div className="divide-y border rounded">
                {materials.length === 0 ? (
                  <div className="text-gray-500 p-3">No materials yet.</div>
                ) : materials.map((m)=>(
                  <div key={m.id} className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">
                        {m.quantity ?? "—"} {m.unit || ""} {m.cost ? `| $${m.cost}` : ""} {m.note ? `| ${m.note}` : ""}
                      </div>
                    </div>
                    <button onClick={()=>deleteMaterial(m.id)} className="p-2 rounded hover:bg-red-50">
                      <Trash2 size={16} className="text-red-600"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Incidents" && (
            <div className="space-y-4">
              <form onSubmit={addIncident} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Title</label>
                  <input value={newIncident.title} onChange={(e)=>setNewIncident(s=>({...s,title:e.target.value}))} className="w-full border rounded px-2 py-1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Severity</label>
                  <select value={newIncident.severity} onChange={(e)=>setNewIncident(s=>({...s,severity:e.target.value}))} className="w-full border rounded px-2 py-1">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Date</label>
                  <input type="date" value={newIncident.date} onChange={(e)=>setNewIncident(s=>({...s,date:e.target.value}))} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium">Description</label>
                  <textarea value={newIncident.description} onChange={(e)=>setNewIncident(s=>({...s,description:e.target.value}))} className="w-full border rounded px-2 py-1" rows={3} />
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                    <Plus size={16}/> Add Incident
                  </button>
                </div>
              </form>

              <div className="divide-y border rounded">
                {incidents.length === 0 ? (
                  <div className="text-gray-500 p-3">No incidents yet.</div>
                ) : incidents.map((m)=>(
                  <div key={m.id} className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="font-medium">{m.title} <span className="text-xs text-gray-500">({m.severity})</span></div>
                      <div className="text-xs text-gray-500">{m.date || "—"} {m.description ? `| ${m.description}` : ""}</div>
                    </div>
                    <button onClick={()=>deleteIncident(m.id)} className="p-2 rounded hover:bg-red-50">
                      <Trash2 size={16} className="text-red-600"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Inspections" && (
            <div className="space-y-2">
              {inspections.length === 0 ? (
                <div className="text-gray-500">No related inspections found.</div>
              ) : inspections.map((ins)=>(
                <div key={ins.id} className="border rounded p-3">
                  <div className="font-medium">{ins.templateName}</div>
                  <div className="text-xs text-gray-500">Status: {ins.status} • Created: {new Date(ins.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "Assigned Gear" && (
            <div className="space-y-2">
              {assignedGear.length === 0 ? (
                <div className="text-gray-500">No gear assigned to this project.</div>
              ) : assignedGear.map((g)=>(
                <div key={g.id} className="border rounded p-3">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">{g.category} • {g.status} • Serial: {g.serialNumber || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
