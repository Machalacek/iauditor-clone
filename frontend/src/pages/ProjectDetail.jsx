// src/pages/ProjectDetail.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tab } from "@headlessui/react";
import clsx from "clsx";

import { API_BASE as API, api } from "../lib/api";
import { useGearStore } from "../store/gearStore";

import {
  FaArrowLeft,
  FaClipboardList,
  FaCubes,
  FaExclamationTriangle,
  FaClipboardCheck,
  FaToolbox,
  FaPlus,
  FaTrash,
} from "react-icons/fa";

function TabHeader({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      {icon} {children}
    </span>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [materials, setMaterials] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [inspections, setInspections] = useState([]);

  // Editable overview fields
  const [editFields, setEditFields] = useState({
    address: "",
    orientationTime: "",
    csoName: "",
    csoNumber: "",
  });
    // toast handled via NotificationBell

  const gear = useGearStore((s) => s.gear);

  // Derived: gear assigned to this project
  const assignedGear = useMemo(
    () =>
      gear.filter(
        (g) => g.assignedProject === id || g.assignedProject === project?.name
      ),
    [gear, id, project?.name]
  );

  // Save Overview fields via explicit button; Admin/Manager only (PATCH first, then PUT fallback)
  const handleSaveOverview = async () => {
    const r = String(window.localStorage.getItem("role") || "user").toLowerCase();
    if (!(r === "admin" || r === "manager") || !project) return;

    // Only send the 4 overview fields (partial update)
    const outgoing = {
      address: editFields.address ?? project.address ?? "",
      orientationTime: editFields.orientationTime ?? project.orientationTime ?? "",
      csoName: editFields.csoName ?? project.csoName ?? "",
      csoNumber: editFields.csoNumber ?? project.csoNumber ?? "",
    };

    try {
      // Try PATCH (preferred for partial updates)
      let response = null;
      try {
        response = await api.patch(`/projects/${id}`, outgoing);
      } catch {
        // Fallback to PUT if PATCH is not supported
        response = await api.put(`/projects/${id}`, outgoing);
      }

      // response from api.* can be JSON object or string; prefer object
      const serverPatch = response && typeof response === "object" ? response : null;
      const patch = serverPatch ?? outgoing;

      // Merge into current project (do not drop unrelated fields)
      setProject(prev => ({ ...(prev || {}), ...patch }));

      // Keep form inputs in sync so they don't clear
      setEditFields(prev => ({
        address: (patch.address ?? prev.address ?? project.address ?? "") || "",
        orientationTime: (patch.orientationTime ?? prev.orientationTime ?? project.orientationTime ?? "") || "",
        csoName: (patch.csoName ?? prev.csoName ?? project.csoName ?? "") || "",
        csoNumber: (patch.csoNumber ?? prev.csoNumber ?? project.csoNumber ?? "") || "",
      }));

      // Show 3s toast in the global NotificationBell row
      window.dispatchEvent(new CustomEvent("app:toast", { detail: "Changes Saved" }));

    } catch {
      // No-op: keep current values; you can surface a toast if needed
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);

        // 1) Project
        const pRes = await fetch(`${API}/projects/${id}`);
        if (!pRes.ok) {
          if (pRes.status === 404) {
            if (!cancelled) setNotFound(true);
            return;
          }
          const text = await pRes.text().catch(() => "");
          throw new Error(`GET /projects/${id} failed: ${pRes.status} ${text}`);
        }
        const p = await pRes.json();
        if (cancelled) return;

        // 2) Related data (parallel)
        const [mRes, iRes, inspRes] = await Promise.all([
          fetch(`${API}/projects/${id}/materials`),
          fetch(`${API}/projects/${id}/incidents`),
          fetch(`${API}/inspections`),
        ]);

        const m = mRes.ok ? await mRes.json() : [];
        const i = iRes.ok ? await iRes.json() : [];
        const insp = inspRes.ok ? await inspRes.json() : [];

        // Robust matcher for various shapes coming from fill flow
        const isRelatedInspection = (row, project) => {
          if (!row || !project) return false;

          // common top-level fields we may store
          const pid =
            row.projectId ??
            row.project_id ??
            row.projectID ??
            row.project?.id ??
            row.meta?.projectId ??
            null;

          const pname =
            row.projectName ??
            row.project_name ??
            row.project?.name ??
            row.meta?.projectName ??
            null;

          if (pid && pid === project.id) return true;
          if (pname && project.name && String(pname).toLowerCase() === String(project.name).toLowerCase()) return true;

          // fallback: inspect answers blob (legacy)
          const ans = row.answers || {};
          if (ans.projectId && ans.projectId === project.id) return true;
          if (ans.project && project.name && String(ans.project).toLowerCase() === String(project.name).toLowerCase()) return true;

          // last-resort fuzzy match on answers JSON (not ideal, but keeps legacy working)
          const hay = JSON.stringify(ans).toLowerCase();
          return project.name ? hay.includes(String(project.name).toLowerCase()) : false;
        };

        // 3) Filter inspections related to this project
        const relatedInsp = (insp || []).filter((row) => isRelatedInspection(row, p));

        if (!cancelled) {
          setProject(p);
          setMaterials(m);
          setIncidents(i);
          setInspections(relatedInsp);
          setEditFields({
            address: p.address || "",
            orientationTime: p.orientationTime || "",
            csoName: p.csoName || "",
            csoNumber: p.csoNumber || "",
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (notFound) return <div className="p-6">Project not found.</div>;
  if (error)
    return (
      <div className="p-6">
        <div className="mb-2 text-red-600 font-semibold">Error</div>
        <div className="text-sm text-gray-700 mb-4">{String(error)}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );

  if (!project) return null;

  // Use role from localStorage (set in App.js after backend auth)
  const role = String(window.localStorage.getItem("role") || "user").toLowerCase();
  const canManageCosts = role === "admin" || role === "manager";
  const canEditOverview = canManageCosts; // Admin & Manager can edit overview

  return (
    <div className="w-full flex justify-center py-8 px-2">
      <div className="w-full max-w-5xl">
        {/* Header (mirrors Profile header) */}
        <div className="bg-white rounded-2xl shadow-xl px-8 py-6 w-full mb-4">
          <div className="relative flex items-center justify-between mb-6">
            {/* Left: Back */}
            <div className="min-w-[88px]">
              <button
                className="text-blue-600 flex items-center hover:underline font-medium text-base px-0 py-0 bg-transparent border-none shadow-none"
                style={{ outline: "none" }}
                onClick={() =>
                  window.history.length > 1
                    ? window.history.back()
                    : navigate("/projects")
                }
              >
                <FaArrowLeft className="mr-2" /> Back
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-4xl text-white shadow-lg">
              {/* Simple avatar-ish bubble using initials */}
              <span className="font-bold">
                {String(project.name || "P").trim().slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-bold">{project.name}</span>
                {project.archived ? (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border">
                    archived
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    {project.active ? "active" : "inactive"}
                  </span>
                )}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Created:{" "}
                <span className="font-semibold">
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleString()
                    : "—"}
                </span>
                <span className="mx-2">•</span>
                Updated:{" "}
                <span className="font-semibold">
                  {project.updatedAt
                    ? new Date(project.updatedAt).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs (same Headless UI style as Profile) */}
        <div className="bg-white rounded-2xl shadow-xl px-8 py-6 w-full">
          <Tab.Group>
            <Tab.List className="flex flex-wrap gap-2 mt-2 mb-6 border-b">
              <Tab as={React.Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(
                      "px-4 py-2 -mb-px border-b-2 focus:outline-none transition",
                      selected
                        ? "border-blue-600 text-blue-700 font-bold"
                        : "border-transparent text-gray-500 hover:text-blue-600"
                    )}
                  >
                    <TabHeader icon={<FaClipboardList />}>Overview</TabHeader>
                  </button>
                )}
              </Tab>
              <Tab as={React.Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(
                      "px-4 py-2 -mb-px border-b-2 focus:outline-none transition",
                      selected
                        ? "border-blue-600 text-blue-700 font-bold"
                        : "border-transparent text-gray-500 hover:text-blue-600"
                    )}
                  >
                    <TabHeader icon={<FaCubes />}>Materials</TabHeader>
                  </button>
                )}
              </Tab>
              <Tab as={React.Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(
                      "px-4 py-2 -mb-px border-b-2 focus:outline-none transition",
                      selected
                        ? "border-blue-600 text-blue-700 font-bold"
                        : "border-transparent text-gray-500 hover:text-blue-600"
                    )}
                  >
                    <TabHeader icon={<FaExclamationTriangle />}>
                      Incidents
                    </TabHeader>
                  </button>
                )}
              </Tab>
              <Tab as={React.Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(
                      "px-4 py-2 -mb-px border-b-2 focus:outline-none transition",
                      selected
                        ? "border-blue-600 text-blue-700 font-bold"
                        : "border-transparent text-gray-500 hover:text-blue-600"
                    )}
                  >
                    <TabHeader icon={<FaClipboardCheck />}>
                      Inspections
                    </TabHeader>
                  </button>
                )}
              </Tab>
              <Tab as={React.Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(
                      "px-4 py-2 -mb-px border-b-2 focus:outline-none transition",
                      selected
                        ? "border-blue-600 text-blue-700 font-bold"
                        : "border-transparent text-gray-500 hover:text-blue-600"
                    )}
                  >
                    <TabHeader icon={<FaToolbox />}>Assigned Gear</TabHeader>
                  </button>
                )}
              </Tab>
            </Tab.List>

            <Tab.Panels>
              {/* Overview */}
              <Tab.Panel>
                {/* Editable fields */}
                <div className="py-2 grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <label className="block text-gray-600 text-sm font-semibold mb-1">
                      Address
                    </label>
                    <input
                      className="w-full p-2 border rounded bg-white"
                      value={editFields.address}
                      onChange={(e) =>
                        setEditFields((s) => ({ ...s, address: e.target.value }))
                      }
                      disabled={!canEditOverview}
                      placeholder="Enter project address"
                    />
                  </div>

                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <label className="block text-gray-600 text-sm font-semibold mb-1">
                      Orientation time
                    </label>
                    <input
                      className="w-full p-2 border rounded bg-white"
                      value={editFields.orientationTime}
                      onChange={(e) =>
                        setEditFields((s) => ({ ...s, orientationTime: e.target.value }))
                      }
                      disabled={!canEditOverview}
                      placeholder="e.g., 7:30 AM"
                    />
                  </div>

                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <label className="block text-gray-600 text-sm font-semibold mb-1">
                      CSO Name
                    </label>
                    <input
                      className="w-full p-2 border rounded bg-white"
                      value={editFields.csoName}
                      onChange={(e) =>
                        setEditFields((s) => ({ ...s, csoName: e.target.value }))
                      }
                      disabled={!canEditOverview}
                      placeholder="Enter CSO name"
                    />
                  </div>

                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <label className="block text-gray-600 text-sm font-semibold mb-1">
                      CSO number
                    </label>
                    <input
                      className="w-full p-2 border rounded bg-white"
                      value={editFields.csoNumber}
                      onChange={(e) =>
                        setEditFields((s) => ({ ...s, csoNumber: e.target.value }))
                      }
                      disabled={!canEditOverview}
                      placeholder="Enter CSO number"
                    />
                  </div>
                </div>

                {canEditOverview && (
                  <div className="mt-2 flex justify-center">
                    <button
                      onClick={handleSaveOverview}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}

                {/* Map */}
                <div className="mt-4">
                  <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
                    <div className="px-4 py-2 border-b text-sm font-semibold text-gray-700">
                      Map
                    </div>
                    <div className="aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9]">
                      <iframe
                        title="project-map"
                        className="w-full h-full"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                          editFields.address || project.address || ""
                        )}&output=embed`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                </div>

                {/* Counts */}
                <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <div className="text-sm text-gray-600">Materials</div>
                    <div className="text-2xl font-bold">{materials.length}</div>
                  </div>
                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <div className="text-sm text-gray-600">Incidents</div>
                    <div className="text-2xl font-bold">{incidents.length}</div>
                  </div>
                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <div className="text-sm text-gray-600">Inspections</div>
                    <div className="text-2xl font-bold">{inspections.length}</div>
                  </div>
                  <div className="bg-gray-50 border rounded px-4 py-3">
                    <div className="text-sm text-gray-600">Assigned gear</div>
                    <div className="text-2xl font-bold">{assignedGear.length}</div>
                  </div>
                </div>
              </Tab.Panel>

              {/* Materials */}
              <Tab.Panel>
                <MaterialsTab
                  id={id}
                  materials={materials}
                  setMaterials={setMaterials}
                  canManageCosts={canManageCosts}
                />
              </Tab.Panel>

              {/* Incidents */}
              <Tab.Panel>
                <IncidentsTab
                  id={id}
                  incidents={incidents}
                  setIncidents={setIncidents}
                />
              </Tab.Panel>

              {/* Inspections */}
              <Tab.Panel>
                {inspections.length === 0 ? (
                  <span className="text-gray-400 italic">
                    No related inspections.
                  </span>
                ) : (
                  <ul className="space-y-2">
                    {inspections.map((ins) => (
                      <li
                        key={ins.id}
                        className="bg-gray-50 border rounded px-4 py-3 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <div className="font-medium">{ins.templateName}</div>
                          <div className="text-xs text-gray-500">
                            Status: {ins.status} • Created:{" "}
                            {new Date(ins.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Tab.Panel>

              {/* Assigned Gear */}
              <Tab.Panel>
                {assignedGear.length === 0 ? (
                  <span className="text-gray-400 italic">
                    No gear assigned to this project.
                  </span>
                ) : (
                  <ul className="space-y-2">
                    {assignedGear.map((g) => (
                      <li
                        key={g.id}
                        className="bg-gray-50 border rounded px-4 py-3 flex items-center gap-3 shadow-sm"
                      >
                        <span className="font-medium">{g.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {g.category}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                          {g.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{g.serialNumber || "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
      {/* toast rendered in header row now */}
    </div>
  );
}

/* ---------- Materials Tab ---------- */
function MaterialsTab({ id, materials, setMaterials, canManageCosts }) {
  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "",
    cost: "",
    note: "",
    taxType: "gstpst12",   // none | gst5 | gstpst12 (default)
    receiptUrl: "",        // server URL returned after upload
  });

  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState(null);

  // Upload file and return URL (expects backend POST /upload -> { url })
  const uploadReceipt = async (file) => {
    if (!file) return "";
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    if (!res.ok) return "";
    const data = await res.json().catch(() => ({}));
    return data.url || "";
  };

  const add = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: form.quantity ? Number(form.quantity) : null,
      cost: form.cost ? Number(form.cost) : null,
      taxType: form.taxType || "gstpst12",
      receiptUrl: form.receiptUrl || "",
    };
    const res = await fetch(`${API}/projects/${id}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await res.json();
    setMaterials((arr) => [created, ...arr]);
    setForm({
      name: "",
      quantity: "",
      unit: "",
      cost: "",
      note: "",
      taxType: "gstpst12",
      receiptUrl: "",
    });
  };


  const remove = async (mid) => {
    if (!canManageCosts) return;
    await fetch(`${API}/projects/${id}/materials/${mid}`, { method: "DELETE" });
    setMaterials((arr) => arr.filter((m) => m.id !== mid));
  };

  const startEdit = (row) => {
    if (!canManageCosts) return;
    setEditingId(row.id);
    setEditRow({
      id: row.id,
      name: row.name || "",
      quantity: row.quantity ?? "",
      unit: row.unit ?? "",
      cost: row.cost ?? "",
      note: row.note ?? "",
      taxType: row.taxType || "gstpst12",
      receiptUrl: row.receiptUrl || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow(null);
  };

const saveEdit = async (e) => {
    e?.preventDefault?.();
    if (!canManageCosts) return;
    if (!editingId || !editRow) return;
    const payload = {
      ...editRow,
      id: editingId,
      quantity: editRow.quantity ? Number(editRow.quantity) : null,
      cost: editRow.cost ? Number(editRow.cost) : null,
      taxType: editRow.taxType || "gstpst12",
      receiptUrl: editRow.receiptUrl || "",
    };

    let updated = null;
    try {
      const res = await fetch(`${API}/projects/${id}/materials/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Handle 200 with JSON OR 204 No Content
        const text = await res.text();
        updated = text ? JSON.parse(text) : null;
      }
      // no early return on non-OK; still do optimistic UI update
    } catch {
      // ignore parse/network errors; we'll fall back to optimistic update
    }

    const merged = updated || payload;
    setMaterials((arr) => arr.map((m) => (m.id === editingId ? { ...m, ...merged } : m)));
    cancelEdit();
  };

  return (
    <div className="py-2">
      <form
        onSubmit={add}
        className="w-full bg-gradient-to-tr from-blue-50 to-white rounded-2xl shadow-lg border px-8 py-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-gray-600 font-semibold mb-1">
            Name
          </label>
          <input
            className="w-full p-2 border rounded bg-white"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-gray-600 font-semibold mb-1">
            Qty
          </label>
          <input
            type="number"
            step="any"
            className="w-full p-2 border rounded bg-white"
            value={form.quantity}
            onChange={(e) =>
              setForm((s) => ({ ...s, quantity: e.target.value }))
            }
          />
        </div>
        {canManageCosts && (
          <div>
            <label className="block text-gray-600 font-semibold mb-1">
              Cost
            </label>
            <input
              className="w-full p-2 border rounded bg-white"
              value={form.unit}
              onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
            />
          </div>
        )}
        {canManageCosts && (
          <div>
            <label className="block text-gray-600 font-semibold mb-1">
              Tax
            </label>
            <select
              className="w-full p-2 border rounded bg-white"
              value={form.taxType}
              onChange={(e) => setForm((s) => ({ ...s, taxType: e.target.value }))}
            >
              <option value="none">No tax</option>
              <option value="gst5">GST 5%</option>
              <option value="gstpst12">GST/PST 12%</option>
            </select>
          </div>
        )}
        <div className="md:col-span-5">
          <label className="block text-gray-600 font-semibold mb-1">
            Note
          </label>
          <input
            className="w-full p-2 border rounded bg-white"
            value={form.note}
            onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          />
        </div>

        {/* moved Receipt input to the footer row next to Add button */}

        <div className="md:col-span-5 flex flex-col md:flex-row md:items-end gap-3 justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Receipt</label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="border rounded bg-white text-sm p-1 w-56"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const url = await uploadReceipt(file);
                if (url) setForm((s) => ({ ...s, receiptUrl: url }));
              }}
            />
            {form.receiptUrl && (
              <a
                href={form.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 underline max-w-[200px] truncate"
                title={form.receiptUrl}
              >
                view
              </a>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition font-semibold inline-flex items-center gap-2 self-end md:self-auto"
          >
            <FaPlus /> Add Material
          </button>
        </div>
      </form>

      <div className="divide-y border rounded">
        {materials.length === 0 ? (
          <div className="text-gray-400 p-4 italic">No materials yet.</div>
        ) : (
          materials.map((m) => {
            const qty = Number(m.quantity) || 0;
            const unitCost = Number(m.unit) || 0; // "COST" (renamed from Unit)
            const costTotal = qty * unitCost;     // Qty × COST
            const taxMul =
              m.taxType === "none" ? 1 :
              m.taxType === "gst5" ? 1.05 : 1.12; // default 12%
            const costWithTax = costTotal * taxMul;

            const isImage = (m.receiptUrl || "").match(/\.(png|jpe?g|gif|webp)$/i);

            return (
              <div key={m.id} className="flex items-center justify-between p-4">
                {/* Thumb */}
                <div className="w-12 h-12 rounded overflow-hidden border mr-3 flex-shrink-0">
                  {m.receiptUrl ? (
                    <a href={m.receiptUrl} target="_blank" rel="noreferrer" title="Open attachment">
                      {isImage ? (
                        <img src={m.receiptUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-blue-700 underline">
                          File
                        </div>
                      )}
                    </a>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                      No file
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  {editingId === m.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input
                        className="p-2 border rounded bg-white md:col-span-2"
                        value={editRow.name}
                        onChange={(e) => setEditRow((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Name"
                      />
                      <input
                        type="number"
                        step="any"
                        className="p-2 border rounded bg-white"
                        value={editRow.quantity}
                        onChange={(e) => setEditRow((s) => ({ ...s, quantity: e.target.value }))}
                        placeholder="Qty"
                      />
                      <input
                        className="p-2 border rounded bg-white"
                        value={editRow.unit}
                        onChange={(e) => setEditRow((s) => ({ ...s, unit: e.target.value }))}
                        placeholder="COST"
                      />
                      <select
                        className="p-2 border rounded bg-white"
                        value={editRow.taxType}
                        onChange={(e) => setEditRow((s) => ({ ...s, taxType: e.target.value }))}
                      >
                        <option value="none">No tax</option>
                        <option value="gst5">GST 5%</option>
                        <option value="gstpst12">GST/PST 12%</option>
                      </select>
                      <input
                        className="p-2 border rounded bg-white md:col-span-5"
                        value={editRow.note}
                        onChange={(e) => setEditRow((s) => ({ ...s, note: e.target.value }))}
                        placeholder="Note"
                      />
                      <div className="md:col-span-5">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="p-2 border rounded bg-white w-full"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            const url = await uploadReceipt(file);
                            if (url) setEditRow((s) => ({ ...s, receiptUrl: url }));
                          }}
                        />
                        {editRow.receiptUrl && (
                          <div className="mt-1 text-xs text-blue-700 truncate">
                            Uploaded: <a href={editRow.receiptUrl} target="_blank" rel="noreferrer" className="underline">{editRow.receiptUrl}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{m.name}</div>
                      {m.note && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {m.note}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Totals */}
                <div
                  className={clsx(
                    "grid gap-4 items-end text-right mr-3",
                    canManageCosts ? "grid-cols-3" : "grid-cols-1"
                  )}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Qty</div>
                    <div className="font-semibold">{qty || "—"}</div>
                  </div>
                  {canManageCosts && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">COST</div>
                      <div className="font-semibold">
                        {costTotal || costTotal === 0 ? `$${costTotal.toFixed(2)}` : "—"}
                      </div>
                    </div>
                  )}
                  {canManageCosts && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">COST including TAX</div>
                      <div className="font-semibold">
                        {costWithTax || costWithTax === 0 ? `$${costWithTax.toFixed(2)}` : "—"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canManageCosts && (
                  <div className="flex items-center gap-2">
                    {editingId === m.id ? (
                      <>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(m)}
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => remove(m.id)}
                      className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---------- Incidents Tab ---------- */
function IncidentsTab({ id, incidents, setIncidents }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "Low",
    date: new Date().toISOString().slice(0, 10),
  });

  const add = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/projects/${id}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json();
    setIncidents((arr) => [created, ...arr]);
    setForm({
      title: "",
      description: "",
      severity: "Low",
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const remove = async (iid) => {
    await fetch(`${API}/projects/${id}/incidents/${iid}`, { method: "DELETE" });
    setIncidents((arr) => arr.filter((m) => m.id !== iid));
  };

  return (
    <div className="py-2">
      <form
        onSubmit={add}
        className="w-full bg-gradient-to-tr from-blue-50 to-white rounded-2xl shadow-lg border px-8 py-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-gray-600 font-semibold mb-1">
            Title
          </label>
          <input
            className="w-full p-2 border rounded bg-white"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-gray-600 font-semibold mb-1">
            Severity
          </label>
          <select
            className="w-full p-2 border rounded bg-white"
            value={form.severity}
            onChange={(e) =>
              setForm((s) => ({ ...s, severity: e.target.value }))
            }
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 font-semibold mb-1">
            Date
          </label>
          <input
            type="date"
            className="w-full p-2 border rounded bg-white"
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          />
        </div>
        <div className="md:col-span-4">
          <label className="block text-gray-600 font-semibold mb-1">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full p-2 border rounded bg-white"
            value={form.description}
            onChange={(e) =>
              setForm((s) => ({ ...s, description: e.target.value }))
            }
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition font-semibold inline-flex items-center gap-2"
          >
            <FaPlus /> Add Incident
          </button>
        </div>
      </form>

      <div className="divide-y border rounded">
        {incidents.length === 0 ? (
          <div className="text-gray-400 p-4 italic">No incidents yet.</div>
        ) : (
          incidents.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {m.title}{" "}
                  <span className="text-xs text-gray-500">({m.severity})</span>
                </div>
                <div className="text-xs text-gray-500">
                  {m.date || "—"} {m.description ? `| ${m.description}` : ""}
                </div>
              </div>
              <button
                onClick={() => remove(m.id)}
                className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100"
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
