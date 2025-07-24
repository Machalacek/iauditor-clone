// src/components/GearTable.jsx

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
  FileText,
  Repeat,
} from "lucide-react";
import { db, auth, storage } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import TransferEquipmentModal from "./TransferEquipmentModal";
import { useUIStore } from "../store/uiStore";

// ----------- Modal close on click-outside + ESC handler -----------
function useOnClickOutsideAndEsc(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) handler();
    }
    function handleEsc(e) {
      if (e.key === "Escape") handler();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [ref, handler, active]);
}

// ----------- Helper: Auto-generate field names in camelCase -----------
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s(.)/g, function (match, group1) {
      return group1.toUpperCase();
    })
    .replace(/\s/g, "")
    .replace(/^(.)/, function (match, group1) {
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

// ----------- CSV EXPORT (with names instead of IDs) -----------
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

// ----------- PDF EXPORT (with names instead of IDs) -----------
function exportGearAsPDF(fields, data, { team, projects }) {
  const docu = new jsPDF();
  docu.text("Gear Inventory", 14, 18);
  autoTable(docu, {
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
    margin: { left: 14, right: 14 },
  });
  docu.save("gear-export.pdf");
}

// ----------- CSV IMPORT -----------
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
      },
    });
    e.target.value = "";
  };
}

export function GearTable({ setSelectedGear, setCurrentPage }) {
  const {
    gear,
    categories,
    statuses,
    setCategories,
    setGear,
    fields,
    setFields,
  } = useGearStore();
  const { team, setTeam } = useTeamStore();
  const { projects } = useProjectStore();

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gear"), (snap) => {
      setGear(
        snap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }))
      );
    });
    getDocs(collection(db, "users")).then((snap) =>
      setTeam(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [setGear, setTeam]);

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
  const showTransferModal = useUIStore((s) => s.showTransferModal);
  const setShowTransferModal = useUIStore((s) => s.setShowTransferModal);

  const [menuPosition, setMenuPosition] = useState({});
  const btnRefs = useRef({});
  const filterRef = useRef();

  const [gearMenuOpen, setGearMenuOpen] = useState(false);
  const gearMenuRef = useRef();
  useOnClickOutside(gearMenuRef, () => setGearMenuOpen(false));
  useOnClickOutside(filterRef, () => setFilterOpen(false));

  // Add ESC for filter/gear menu
  useEffect(() => {
    const escHandler = (e) => {
      if (e.key === "Escape") {
        setFilterOpen(false);
        setGearMenuOpen(false);
      }
    };
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, []);

  // Modal refs and click-outside/ESC handlers
  const catModalRef = useRef();
  const fieldsModalRef = useRef();
  const transferModalRef = useRef();
  useOnClickOutsideAndEsc(catModalRef, () => setShowCatModal(false), showCatModal);
  useOnClickOutsideAndEsc(fieldsModalRef, () => setShowFieldsModal(false), showFieldsModal);
  useOnClickOutsideAndEsc(transferModalRef, () => setShowTransferModal(false), showTransferModal);

  const modalRef = useRef();
  const escCloseModal = useCallback(
    (e) => {
      if (e.key === "Escape") setShowModal(false);
    },
    []
  );
  useEffect(() => {
    if (showModal) {
      document.addEventListener("keydown", escCloseModal);
      return () => document.removeEventListener("keydown", escCloseModal);
    }
  }, [showModal, escCloseModal]);
  useOnClickOutside(modalRef, () => setShowModal(false));

  const menuRef = useRef();
  useOnClickOutsideAndEsc(menuRef, () => setMenuOpenFor(null), !!menuOpenFor);

  const filtered = gear.filter((g) => {
    const matchesSearch =
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      (g.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filter.category === "All" || g.category === filter.category;
    const matchesStatus = filter.status === "All" || g.status === filter.status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // ----------- 3-dot menu position/edge logic -----------
  const handleMenuOpen = (id) => {
    setMenuOpenFor(prev => prev === id ? null : id);
    setTimeout(() => {
      if (btnRefs.current[id]) {
        const btnRect = btnRefs.current[id].getBoundingClientRect();
        const menuWidth = 170; // px
        // Center the menu on the button, or open to left if would overflow right
        let left = btnRect.left + btnRect.width / 2 - menuWidth / 2;
        if (left + menuWidth > window.innerWidth - 16) {
          left = window.innerWidth - menuWidth - 16; // 16px padding from edge
        }
        if (left < 16) {
          left = 16; // Don't bleed out on left
        }
        setMenuPosition({
          top: btnRect.bottom + 8,
          left,
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

  const [catInput, setCatInput] = useState("");
  const [editCatIdx, setEditCatIdx] = useState(null);
  const [editCatValue, setEditCatValue] = useState("");

  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ----------- HEADER AND BUTTONS -----------
  const renderHeader = () => (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Gear</h2>
        <div className="flex gap-2 flex-wrap">
          {isAdminOrManager && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setShowCatModal(true); }}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
              >
                <Plus size={16} className="mr-1" />
                Manage Categories
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowFieldsModal(true); }}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
              >
                <Plus size={16} className="mr-1" />
                Manage Fields
              </button>
            </>
          )}
          {/* --- Transfer Equipment Button --- */}
          <button
            onClick={e => { e.stopPropagation(); setShowTransferModal(true); }}
            className="bg-green-600 text-white hover:bg-green-700 rounded-lg px-4 py-2 text-sm font-semibold transition flex items-center"
          >
            <Repeat size={16} className="mr-1" /> Transfer Equipment
          </button>
          <button
            onClick={e => { e.stopPropagation(); setModalGear(null); setShowModal(true); }}
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            + Add Equipment
          </button>
          {/* Gear icon with menu */}
          <div className="relative">
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={e => { e.stopPropagation(); setGearMenuOpen(v => !v); }}
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
                  onClick={e => {
                    e.stopPropagation();
                    setGearMenuOpen(false);
                    exportGearAsCSV(fields, filtered, { team, projects });
                  }}
                >
                  <Download size={17} className="mr-2" /> Export Gear – CSV
                </button>
                <button
                  className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={e => {
                    e.stopPropagation();
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
      {/* Search and filter */}
      <div className="flex flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Search gear…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-grow"
        />
        <div className="relative">
          <button
            className={`p-2 rounded hover:bg-gray-100 ${filterOpen ? "bg-gray-100" : ""}`}
            ref={filterRef}
            aria-label="Filter"
            onClick={e => { e.stopPropagation(); setFilterOpen((v) => !v); }}
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
                onClick={e => {
                  e.stopPropagation();
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
    </div>
  );

  // ----------- TABLES & CARDS -----------
  const renderTable = () => (
    <div className="overflow-visible">
      <table className="min-w-full overflow-visible">
        <thead>
          <tr className="bg-blue-50 text-blue-800">
            <th className="py-2 px-2"></th>
            {fields.map((f) => (
              <th key={f.name} className="py-2 px-2 text-left font-bold">
                {f.label}
              </th>
            ))}
            <th className="py-2 px-2"></th>
          </tr>
        </thead>
        <tbody className="overflow-visible">
          {filtered.map((g) => (
            <tr
              key={g.id}
              className="border-t hover:bg-blue-50 overflow-visible cursor-pointer"
              onClick={(e) => {
                if (
                  e.target.closest(
                    "button,svg,path,label,input,select"
                  )
                )
                  return;
                setSelectedGear(g);
                setCurrentPage('gearDetail');
              }}
            >
              <td className="py-2 px-2">
                <img
                  src={g.imageUrl || "/gear-placeholder.png"}
                  alt={g.name}
                  className="w-10 h-10 object-cover rounded-full bg-gray-100 border"
                />
              </td>
              {fields.map((f) => (
                <td key={f.name} className="py-2 px-2">
                  {f.name === "category" && g[f.name]}
                  {f.name === "status" && g[f.name]}
                  {f.name === "assignedTo" &&
                    (g.assignedTo
                      ? team.find((u) => u.id === g.assignedTo)?.name || (
                          <span className="text-gray-400">Not found</span>
                        )
                      : <span className="text-gray-400">Unassigned</span>)}
                  {f.name === "assignedProject" &&
                    (g.assignedProject
                      ? projects.find((p) => p.id === g.assignedProject)?.name || (
                          <span className="text-gray-400">Not found</span>
                        )
                      : <span className="text-gray-400">Unassigned</span>)}
                  {["name", "serialNumber", "notes"].includes(f.name) &&
                    g[f.name]}
                  {f.name === "dateAdded" &&
                    (g.dateAdded
                      ? new Date(g.dateAdded).toLocaleDateString()
                      : "")}
                  {["text", "select", "textarea", "date", "number", "checkbox"].includes(
                    f.type
                  ) &&
                    ![
                      "category",
                      "status",
                      "assignedTo",
                      "assignedProject",
                      "name",
                      "serialNumber",
                      "notes",
                      "dateAdded",
                    ].includes(f.name) &&
                    String(g[f.name] ?? "")}
                </td>
              ))}
              <td className="py-2 px-2 flex gap-2 relative overflow-visible">
                <span>
                  <button
                    ref={(el) => (btnRefs.current[g.id] = el)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(g.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpenFor === g.id && (
                    <MenuDropdown
                      ref={menuRef}
                      position={menuPosition}
                      onEdit={(e) => {
                        e.stopPropagation();
                        setModalGear(g);
                        setShowModal(true);
                        setMenuOpenFor(null);
                      }}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeleteGear(g.id);
                      }}
                    />
                  )}
                </span>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={fields.length + 2} className="py-4 text-center text-gray-400">
                No gear found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ----------- MOBILE CARD VIEW -----------
  const renderMobileCards = () => (
    <div className="flex flex-col gap-3">
      {filtered.map((g) => (
        <div
          key={g.id}
          tabIndex={-1}
          className="flex items-start bg-white rounded-xl shadow p-3 relative cursor-pointer"
          onClick={(e) => {
            if (
              e.target.closest(
                "button,svg,path,label,input,select"
              )
            )
              return;
            setSelectedGear(g);
            setCurrentPage('gearDetail');
          }}
        >
          <img
            src={g.imageUrl || "/gear-placeholder.png"}
            alt={g.name}
            className="w-12 h-12 object-cover rounded-full bg-gray-100 border mr-3 mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg truncate">{g.name}</div>
            <div className="text-slate-400 text-sm truncate">
              {g.serialNumber || <span>&mdash;</span>}
            </div>
            <div className="text-slate-600 text-base truncate">{g.category}</div>
            <div className="text-slate-500 text-xs mt-1 truncate">
              Assigned to:{" "}
              {g.assignedTo
                ? team.find((u) => u.id === g.assignedTo)?.name || (
                    <span className="text-gray-400">Not found</span>
                  )
                : <span className="text-gray-400">—</span>}
              <br />
              Project:{" "}
              {g.assignedProject
                ? projects.find((p) => p.id === g.assignedProject)?.name || (
                    <span className="text-gray-400">Not found</span>
                  )
                : <span className="text-gray-400">—</span>}
            </div>
          </div>
          {/* Three-dot menu */}
          <button
            ref={(el) => (btnRefs.current[g.id] = el)}
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(g.id);
            }}
            className="p-1 hover:bg-gray-100 rounded absolute right-2 top-2"
          >
            <MoreVertical size={20} />
          </button>
          {menuOpenFor === g.id && (
            <MenuDropdown
              ref={menuRef}
              position={menuPosition}
              onEdit={(e) => {
                e.stopPropagation();
                setModalGear(g);
                setShowModal(true);
                setMenuOpenFor(null);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                handleDeleteGear(g.id);
              }}
            />
          )}
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-8">No gear found</div>
      )}
    </div>
  );

  // ----------- FINAL RETURN -----------
  return (
    <>
      <div className="bg-white rounded-2xl shadow p-6">
        {renderHeader()}
        {isMobile ? renderMobileCards() : renderTable()}
      </div>

      {/* --- Transfer Equipment Modal --- */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
         <div ref={transferModalRef} className="relative z-50">
            <TransferEquipmentModal
              gearList={gear}
              team={team}
              projects={projects}
              onClose={() => setShowTransferModal(false)}
              onTransfer={async (itemId, newAssignedTo, newProject, fromSig, toSig) => {
                const gearDocRef = doc(db, "gear", itemId);
                const gearDoc = await getDoc(gearDocRef);
                const prev = gearDoc.data();
                await updateDoc(gearDocRef, {
                  pendingTransfer: {
                    to: { userId: newAssignedTo, projectId: newProject },
                    from: {
                      userId: prev.assignedTo || "",
                      projectId: prev.assignedProject || "",
                    },
                    date: new Date().toISOString(),
                    fromSig,
                    toSig,
                  }
                });
                setShowTransferModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* --- Add/Edit, Category, Fields Modals --- */}
      {showModal && (
        <GearModal
          modalRef={modalRef}
          gear={modalGear}
          onClose={() => setShowModal(false)}
          onSave={handleSaveGear}
          team={team.filter((u) => u.active)}
          projects={projects.filter((p) => p.active)}
          categories={categories}
          statuses={statuses}
          fields={fields}
          isAdminOrManager={isAdminOrManager}
        />
      )}
      {/* --- Category Modal --- */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div ref={catModalRef} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-xl">Manage Categories</h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
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
                        onChange={(e) => setEditCatValue(e.target.value)}
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
              onSubmit={(e) => {
                e.preventDefault();
                if (!catInput.trim()) return;
                setCategories([...categories, catInput.trim()]);
                setCatInput("");
              }}
              className="flex gap-2"
            >
              <input
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)}
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
      {/* --- Fields Modal --- */}
      {showFieldsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div ref={fieldsModalRef} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-xl">Manage Fields</h3>
              <button
                onClick={() => setShowFieldsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
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
                              className={`flex items-center gap-2 bg-gray-50 p-1 rounded w-full flex-wrap ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
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
                              <input
                                value={f.label}
                                onChange={(e) => {
                                  handleEditField(i, "label", e.target.value);
                                  handleEditField(i, "name", toCamelCase(e.target.value));
                                }}
                                placeholder="Label"
                                className="border rounded px-2 py-1 w-36"
                              />
                              <select
                                value={f.type}
                                onChange={(e) =>
                                  handleEditField(i, "type", e.target.value)
                                }
                                className="border rounded px-2 py-1 w-36"
                              >
                                <option value="text">Text</option>
                                <option value="select">Dropdown</option>
                                <option value="textarea">Paragraph</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                                <option value="checkbox">Checkmark</option>
                              </select>
                              <label className="flex items-center text-xs ml-1">
                                <input
                                  type="checkbox"
                                  checked={f.required}
                                  onChange={(e) =>
                                    handleEditField(i, "required", e.target.checked)
                                  }
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
    </>
  );
}

// --- MenuDropdown: all buttons use e.stopPropagation() ---
const MenuDropdown = React.forwardRef(function MenuDropdown(
  { position, onEdit, onDelete },
  ref
) {
  const style = {
    position: "fixed",
    left: position.left,
    top: position.top,
    minWidth: 170,
    zIndex: 9999,
    background: "white",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
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

// --- GearModal (Add/Edit) ---
function GearModal({
  modalRef,
  gear,
  onClose,
  onSave,
  team,
  projects,
  categories,
  statuses,
  fields,
}) {
  const [values, setValues] = useState(() => {
    const obj = {};
    fields.forEach((f) => {
      obj[f.name] = gear?.[f.name] ?? "";
    });
    return obj;
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  // For click-outside and ESC close
  const localRef = useRef();
  useOnClickOutsideAndEsc(localRef, onClose, true);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({
      ...v,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = async (e) => {
    setImageError("");
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("File must be an image");
      return;
    }
    setImageUploading(true);
    try {
      const fileName = gear?.id
        ? `gear/${gear.id}/${Date.now()}_${file.name}`
        : `gear/temp/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setValues((v) => ({ ...v, imageUrl: url }));
    } catch (err) {
      setImageError("Upload failed");
    }
    setImageUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const final = {
      ...values,
      dateAdded: gear?.dateAdded || new Date().toISOString(),
    };
    onSave(final, gear?.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
      <div
        ref={localRef}
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
      >
        <h3 className="font-semibold text-xl mb-4">
          {gear ? "Edit Gear" : "Add Equipment"}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto"
          style={{ maxHeight: "65vh" }}
        >
          {/* IMAGE UPLOAD */}
          <div className="mb-2 flex items-center gap-4">
            <img
              src={values.imageUrl || "/gear-placeholder.png"}
              alt="Gear preview"
              className="w-16 h-16 object-cover rounded-full bg-gray-100 border"
            />
            <div className="flex flex-col">
              <label className="text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={imageUploading}
                className="mt-1"
              />
              {imageUploading && (
                <div className="text-xs text-blue-500">Uploading...</div>
              )}
              {imageError && (
                <div className="text-xs text-red-600">{imageError}</div>
              )}
            </div>
          </div>
          {/* FIELDS */}
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
              disabled={imageUploading}
            >
              {gear ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GearTable;
