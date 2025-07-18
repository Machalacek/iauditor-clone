import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGearStore, defaultFields } from "../store/gearStore";
import { useTeamStore } from "../store/teamStore";
import { useProjectStore } from "../store/projectStore";
import {
  MoreVertical,
  Plus,
  X,
  Filter,
  Pencil,
  Trash2,
  Settings,
  Download,
  Upload,
  FileText
} from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


// --- Helper: Auto-generate field names in camelCase
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s(.)/g, function(match, group1) {
      return group1.toUpperCase();
    })
    .replace(/\s/g, '')
    .replace(/^(.)/, function(match, group1) {
      return group1.toLowerCase();
    });
}

// Utility: Detect outside clicks for menus/popups
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// --- CSV EXPORT (with names instead of IDs) ---
function exportGearAsCSV(fields, data, { team, projects }) {
  const csv = Papa.unparse(
    data.map((row) => {
      const mapped = {};
      fields.forEach((f) => {
        let val = row[f.name] ?? "";
        if (f.name === "assignedTo" && val) {
          const user = team.find((u) => u.id === val);
          val = user ? user.name || user.email || val : "";
        }
        if (f.name === "assignedProject" && val) {
          const project = projects.find((p) => p.id === val);
          val = project ? project.name || val : "";
        }
        mapped[f.label] = val;
      });
      return mapped;
    })
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "gear-export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- PDF EXPORT (with names instead of IDs) ---
function exportGearAsPDF(fields, data, { team, projects }) {
  const doc = new jsPDF();
  doc.text("Gear Inventory", 14, 18);
  autoTable(doc, {
    head: [fields.map((f) => f.label)],
    body: data.map((row) =>
      fields.map((f) => {
        let val = row[f.name] ?? "";
        if (f.name === "assignedTo" && val) {
          const user = team.find((u) => u.id === val);
          val = user ? user.name || user.email || val : "";
        }
        if (f.name === "assignedProject" && val) {
          const project = projects.find((p) => p.id === val);
          val = project ? project.name || val : "";
        }
        return val;
      })
    ),
    startY: 24,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 }
  });
  doc.save("gear-export.pdf");
}

// --- CSV IMPORT ---
function importCSVtoGear({ fields, setShowImportError, onImport }) {
  return (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (!Array.isArray(results.data)) {
          setShowImportError("Failed to read CSV rows.");
          return;
        }
        // Map CSV columns to field names using label
        const csvRows = results.data;
        const mappedRows = csvRows
          .filter((row) => Object.values(row).some((val) => val && val.trim() !== ""))
          .map((csvRow) => {
            const newRow = {};
            fields.forEach((f) => {
              newRow[f.name] = csvRow[f.label] || "";
            });
            return newRow;
          });
        if (mappedRows.length === 0) {
          setShowImportError("No valid rows found in CSV.");
        } else {
          setShowImportError("");
          onImport(mappedRows);
        }
      },
      error: (err) => {
        setShowImportError("Failed to parse CSV: " + err.message);
      }
    });
    // Reset file input so onChange fires even with same file
    e.target.value = "";
  };
}

export function GearTable() {
  const {
    gear,
    categories,
    statuses,
    setCategories,
    setGear,
    fields,
    setFields
  } = useGearStore();
  const { team, setTeam } = useTeamStore();
  const { projects } = useProjectStore();

  // Auth & role logic
  const [currentUserRole, setCurrentUserRole] = useState("user");
  useEffect(() => {
    const fetchRole = async () => {
      const u = auth.currentUser;
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setCurrentUserRole(snap.data()?.role || "user");
      }
    };
    fetchRole();
  }, []);
  const isAdminOrManager = ["admin", "manager"].includes(currentUserRole);

  // Fetch Firestore gear, team, and live sync
  useEffect(() => {
    // Gear
    const unsub = onSnapshot(collection(db, "gear"), (snap) => {
      setGear(
        snap.docs.map((d) => ({
          ...d.data(),
          id: d.id
        }))
      );
    });
    // Team
    getDocs(collection(db, "users")).then((snap) =>
      setTeam(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [setGear, setTeam]);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ category: "All", status: "All" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalGear, setModalGear] = useState(null);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [showImportError, setShowImportError] = useState("");
  const [showImportSuccess, setShowImportSuccess] = useState("");

  // For smart menu positioning
  const [menuPosition, setMenuPosition] = useState({});
  const btnRefs = useRef({});
  const filterRef = useRef();

  // Gear icon dropdown
  const [gearMenuOpen, setGearMenuOpen] = useState(false);
  const gearMenuRef = useRef();
  useOnClickOutside(gearMenuRef, () => setGearMenuOpen(false));

  // For closing filter menu on outside click or filter icon click
  useOnClickOutside(filterRef, () => setFilterOpen(false));

  // For closing Add/Edit modal on outside click or ESC
  const modalRef = useRef();
  const escCloseModal = useCallback((e) => {
    if (e.key === "Escape") setShowModal(false);
  }, []);
  useEffect(() => {
    if (showModal) {
      document.addEventListener("keydown", escCloseModal);
      return () => document.removeEventListener("keydown", escCloseModal);
    }
  }, [showModal, escCloseModal]);

  // Close modal on outside click
  useOnClickOutside(modalRef, () => setShowModal(false));

  // Menu placement
  const menuRef = useRef();
  useOnClickOutside(menuRef, () => setMenuOpenFor(null));

  const filtered = gear.filter((g) => {
    const matchesSearch =
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      (g.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filter.category === "All" || g.category === filter.category;
    const matchesStatus =
      filter.status === "All" || g.status === filter.status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleMenuOpen = (id) => {
    setMenuOpenFor((prev) => (prev === id ? null : id));
    setTimeout(() => {
      if (btnRefs.current[id]) {
        const btnRect = btnRefs.current[id].getBoundingClientRect();
        const menuHeight = 90;
        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;
        setMenuPosition({
          top:
            spaceBelow < menuHeight && spaceAbove > menuHeight
              ? btnRect.top - menuHeight
              : btnRect.bottom,
          left: btnRect.left,
          dropUp: spaceBelow < menuHeight && spaceAbove > menuHeight
        });
      }
    }, 0);
  };

  const handleSaveGear = async (data, id = null) => {
    if (id) {
      await updateDoc(doc(db, "gear", id), data);
    } else {
      await addDoc(collection(db, "gear"), data);
    }
    setShowModal(false);
  };
  const handleDeleteGear = async (id) => {
    await deleteDoc(doc(db, "gear", id));
    setMenuOpenFor(null);
  };

  // --- Custom Fields CRUD (DnD, edit, remove, scroll) ---
  function handleAddField() {
    setFields([...fields, { name: "", label: "", type: "text", required: false }]);
  }
  function handleEditField(idx, key, value) {
    const updated = [...fields];
    updated[idx][key] = value;
    setFields(updated);
  }
  function handleDeleteField(idx) {
    const updated = [...fields];
    updated.splice(idx, 1);
    setFields(updated);
  }
  function handleResetFields() {
    setFields(defaultFields);
  }
  function handleDnD(result) {
    if (!result.destination) return;
    const reordered = Array.from(fields);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setFields(reordered);
  }

  // Category modal handlers
  const [catInput, setCatInput] = useState("");
  const [editCatIdx, setEditCatIdx] = useState(null);
  const [editCatValue, setEditCatValue] = useState("");

  // --- UI ---
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      {/* Row 1: Gear title + buttons (right) */}
      <div className="flex flex-row items-center justify-between gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Gear</h2>
        <div className="flex gap-2 items-center">
          {isAdminOrManager && (
            <>
              <button
                onClick={() => setShowCatModal(true)}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
              >
                <Plus size={16} className="mr-1" />
                Manage Categories
              </button>
              <button
                onClick={() => setShowFieldsModal(true)}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
              >
                <Plus size={16} className="mr-1" />
                Manage Fields
              </button>
            </>
          )}
          <button
            onClick={() => {
              setModalGear(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            + Add Equipment
          </button>
          {/* Gear icon with menu */}
          <div className="relative">
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => setGearMenuOpen(v => !v)}
              aria-label="Gear Options"
            >
              <Settings size={22} />
            </button>
            {gearMenuOpen && (
              <div
                ref={gearMenuRef}
                className="absolute right-0 mt-2 z-50 w-64 bg-white border rounded-lg shadow-xl py-2"
              >
                <button
                  className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => {
                    setGearMenuOpen(false);
                    exportGearAsCSV(fields, filtered, { team, projects });
                  }}
                >
                  <Download size={17} className="mr-2" /> Export Gear – CSV
                </button>
                <button
                  className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => {
                    setGearMenuOpen(false);
                    exportGearAsPDF(fields, filtered, { team, projects });
                  }}
                >
                  <FileText size={17} className="mr-2" /> Export Gear – PDF
                </button>
                <label className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-sm cursor-pointer">
                  <Upload size={17} className="mr-2" /> Upload Gear in Bulk – CSV
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={importCSVtoGear({
                      fields,
                      setShowImportError,
                      onImport: async (rows) => {
                        for (let row of rows) {
                          await addDoc(collection(db, "gear"), row);
                        }
                        setGearMenuOpen(false);
                        setShowImportSuccess("Successfully uploaded " + rows.length + " items!");
                        setTimeout(() => setShowImportSuccess(""), 3500);
                      }
                    })}
                  />
                </label>
                {showImportError && (
                  <div className="text-xs text-red-600 px-4 py-2">{showImportError}</div>
                )}
                {showImportSuccess && (
                  <div className="text-xs text-green-600 px-4 py-2">{showImportSuccess}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Search bar */}
      <div className="flex flex-row items-center mb-2 gap-2">
        <input
          type="text"
          placeholder="Search gear…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-grow"
        />
        {/* Row 3: Filter icon (right under search bar) */}
        <div className="relative">
          <button
            className={`p-2 rounded hover:bg-gray-100 ${filterOpen ? "bg-gray-100" : ""}`}
            ref={filterRef}
            aria-label="Filter"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter size={20} />
          </button>
          {filterOpen && (
            <div
              className="absolute right-0 mt-2 z-40 bg-white border rounded shadow p-4 w-64"
              ref={filterRef}
            >
              <div>
                <label className="block text-xs mb-1">Category:</label>
                <select
                  value={filter.category}
                  onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                  className="border rounded px-3 py-2 w-full mb-2"
                >
                  <option value="All">All Categories</option>
                  {categories.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Status:</label>
                <select
                  value={filter.status}
                  onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="All">All Statuses</option>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button
                className="mt-4 text-xs text-blue-700 underline"
                onClick={() => {
                  setSearch("");
                  setFilter({ category: "All", status: "All" });
                  setFilterOpen(false);
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-visible">
        <table className="min-w-full overflow-visible">
          <thead>
            <tr className="bg-blue-50 text-blue-800">
              {fields.map((f) => (
                <th
                  key={f.name}
                  className="py-2 px-2 text-left font-bold"
                >
                  {f.label}
                </th>
              ))}
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody className="overflow-visible">
            {filtered.map((g, idx) => (
              <tr key={g.id} className="border-t hover:bg-gray-50 overflow-visible">
                {fields.map((f) => (
                  <td key={f.name} className="py-2 px-2">
                    {f.name === "category" && g[f.name]}
                    {f.name === "status" && g[f.name]}
                    {f.name === "assignedTo" && (
                      g.assignedTo
                        ? team.find((u) => u.id === g.assignedTo)?.name || <span className="text-gray-400">Not found</span>
                        : <span className="text-gray-400">Unassigned</span>
                    )}
                    {f.name === "assignedProject" && (
                      g.assignedProject
                        ? projects.find((p) => p.id === g.assignedProject)?.name || <span className="text-gray-400">Not found</span>
                        : <span className="text-gray-400">Unassigned</span>
                    )}
                    {["name", "serialNumber", "notes"].includes(f.name) && g[f.name]}
                    {f.name === "dateAdded" &&
                      (g.dateAdded ? new Date(g.dateAdded).toLocaleDateString() : "")
                    }
                    {["text", "select", "textarea", "date", "number", "checkbox"].includes(f.type) && !["category", "status", "assignedTo", "assignedProject", "name", "serialNumber", "notes", "dateAdded"].includes(f.name) && String(g[f.name] ?? "")}
                  </td>
                ))}
                <td className="py-2 px-2 flex gap-2 relative overflow-visible">
                  <span>
                    <button
                      ref={el => btnRefs.current[g.id] = el}
                      onClick={() => handleMenuOpen(g.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpenFor === g.id && (
                      <MenuDropdown
                        ref={menuRef}
                        position={menuPosition}
                        onEdit={() => {
                          setModalGear(g);
                          setShowModal(true);
                          setMenuOpenFor(null);
                        }}
                        onDelete={() => handleDeleteGear(g.id)}
                      />
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="py-4 text-center text-gray-400">
                  No gear found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <GearModal
          modalRef={modalRef}
          gear={modalGear}
          onClose={() => setShowModal(false)}
          onSave={handleSaveGear}
          team={team.filter(u => u.active)}
          projects={projects.filter(p => p.active)}
          categories={categories}
          statuses={statuses}
          fields={fields}
          isAdminOrManager={isAdminOrManager}
        />
      )}

      {/* --- Category Manager Modal --- */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-xl">Manage Categories</h3>
              <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <ul className="mb-4">
              {categories.map((cat, i) => (
                <li key={cat} className="flex items-center gap-2 mb-2">
                  {editCatIdx === i ? (
                    <>
                      <input
                        value={editCatValue}
                        onChange={e => setEditCatValue(e.target.value)}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <button
                        className="text-blue-600 text-sm px-2"
                        onClick={() => {
                          const updated = [...categories];
                          updated[i] = editCatValue;
                          setCategories(updated);
                          setEditCatIdx(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="text-gray-500 px-2"
                        onClick={() => setEditCatIdx(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{cat}</span>
                      <button
                        className="text-blue-600 px-2 text-sm"
                        onClick={() => {
                          setEditCatIdx(i);
                          setEditCatValue(cat);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 px-2 text-sm"
                        onClick={() => {
                          const updated = categories.filter((_, idx) => idx !== i);
                          setCategories(updated);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!catInput.trim()) return;
                setCategories([...categories, catInput.trim()]);
                setCatInput("");
              }}
              className="flex gap-2"
            >
              <input
                value={catInput}
                onChange={e => setCatInput(e.target.value)}
                placeholder="Add category"
                className="border rounded px-2 py-1 flex-1"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Fields Manager Modal (DnD, scrollable, editable, auto-naming) --- */}
      {showFieldsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-xl">Manage Fields</h3>
              <button onClick={() => setShowFieldsModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1" style={{ maxHeight: "50vh" }}>
              <DragDropContext onDragEnd={handleDnD}>
                <Droppable droppableId="fields">
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-2"
                    >
                      {fields.map((f, i) => (
                        <Draggable key={i} draggableId={String(i)} index={i}>
                          {(provided, snapshot) => (
                            <li
                              className={`flex items-center gap-2 bg-gray-50 p-1 rounded w-full flex-wrap ${snapshot.isDragging ? "shadow-lg" : ""}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <span
                                {...provided.dragHandleProps}
                                className="cursor-grab p-1 mr-2"
                                title="Drag to reorder"
                              >
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                  <circle cx="6" cy="6" r="1.5" fill="#888" />
                                  <circle cx="6" cy="10" r="1.5" fill="#888" />
                                  <circle cx="6" cy="14" r="1.5" fill="#888" />
                                  <circle cx="14" cy="6" r="1.5" fill="#888" />
                                  <circle cx="14" cy="10" r="1.5" fill="#888" />
                                  <circle cx="14" cy="14" r="1.5" fill="#888" />
                                </svg>
                              </span>
                              {/* Field label */}
                              <input
                                value={f.label}
                                onChange={e => {
                                  handleEditField(i, "label", e.target.value);
                                  // Auto-generate name when label changes
                                  handleEditField(i, "name", toCamelCase(e.target.value));
                                }}
                                placeholder="Label"
                                className="border rounded px-2 py-1 w-36"
                              />
                              {/* Field type */}
                              <select
                                value={f.type}
                                onChange={e => handleEditField(i, "type", e.target.value)}
                                className="border rounded px-2 py-1 w-36"
                              >
                                <option value="text">Text</option>
                                <option value="select">Dropdown</option>
                                <option value="textarea">Paragraph</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                                <option value="checkbox">Checkmark</option>
                              </select>
                              {/* Required */}
                              <label className="flex items-center text-xs ml-1">
                                <input
                                  type="checkbox"
                                  checked={f.required}
                                  onChange={e => handleEditField(i, "required", e.target.checked)}
                                  className="mr-1"
                                />
                                Required
                              </label>
                              <button
                                className="text-red-600 px-2 text-sm"
                                onClick={() => handleDeleteField(i)}
                                tabIndex={-1}
                                title="Delete field"
                              >
                                <Trash2 size={18} />
                              </button>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
                onClick={handleAddField}
              >
                + Add Field
              </button>
              <button
                className="bg-gray-300 rounded px-3 py-1 text-sm"
                onClick={handleResetFields}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Submenu Dropdown (Edit/Delete)
const MenuDropdown = React.forwardRef(function MenuDropdown({ position, onEdit, onDelete }, ref) {
  const style = {
    position: "fixed",
    left: position.left,
    top: position.top,
    minWidth: 120,
    zIndex: 9999,
    background: "white",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  };
  return (
    <div ref={ref} style={style} className="shadow z-[9999]">
      <button
        onClick={onEdit}
        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
      >
        <Pencil size={16} className="mr-2 text-blue-600" />
        Edit
      </button>
      <button
        onClick={onDelete}
        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 size={16} className="mr-2 text-red-600" />
        Delete
      </button>
    </div>
  );
});

// --- Gear Modal Component (with scroll support and outside click/ESC close)
function GearModal({ modalRef, gear, onClose, onSave, team, projects, categories, statuses, fields }) {
  const [values, setValues] = useState(() => {
    const obj = {};
    fields.forEach(f => {
      obj[f.name] = gear?.[f.name] ?? "";
    });
    return obj;
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({
      ...v,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const final = {
      ...values,
      dateAdded: gear?.dateAdded || new Date().toISOString()
    };
    onSave(final, gear?.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
      <div ref={modalRef} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 className="font-semibold text-xl mb-4">{gear ? "Edit Gear" : "Add Equipment"}</h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto"
          style={{ maxHeight: "65vh" }}
        >
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block mb-1 font-medium">
                {f.label}
                {f.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {f.type === "text" && (
                <input
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "textarea" && (
                <textarea
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "select" && (
                <select
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                >
                  <option value="">Select...</option>
                  {f.name === "category" &&
                    categories.map((cat) => <option key={cat}>{cat}</option>)}
                  {f.name === "status" &&
                    statuses.map((s) => <option key={s}>{s}</option>)}
                  {f.name === "assignedTo" &&
                    team.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  {f.name === "assignedProject" &&
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
              {f.type === "date" && (
                <input
                  name={f.name}
                  type="date"
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "number" && (
                <input
                  name={f.name}
                  type="number"
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "checkbox" && (
                <input
                  name={f.name}
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={handleChange}
                  className="mr-2"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {gear ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
