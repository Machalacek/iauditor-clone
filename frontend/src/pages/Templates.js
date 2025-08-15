import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Copy, Trash2, Edit2, MoreVertical, Star, StarOff } from "lucide-react";
import "./Templates.css";
import { createPortal } from "react-dom";
import { auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore"; // If you use Firestore for users
import { db } from "../firebase"; // adjust path if needed
import { api } from "../lib/api";

function getInitials(str) {
  if (!str) return "";
  const parts = str.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString();
}

const ACCESS_OPTIONS = [
  { value: "admin", label: "Admin only", badge: "Admin", color: "bg-blue-100 text-blue-800" },
  { value: "manager", label: "Admin & Manager", badge: "Manager", color: "bg-green-100 text-green-700" },
  { value: "all", label: "All users", badge: "All Users", color: "bg-gray-100 text-gray-700" },
];

export default function Templates({ onEditTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [bookmarked, setBookmarked] = useState(() =>
    JSON.parse(localStorage.getItem("templateBookmarks") || "[]")
  );
  const [accessMap, setAccessMap] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState("");
  const [userRole, setUserRole] = useState("user"); // Default to user, update based on auth state

  // Read toast from navigation state, then clear it using an ABSOLUTE path
  useEffect(() => {
    if (location.state && location.state.toast) {
      setToast(location.state.toast);
      // Clear state so refresh/back won't re-show the toast
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Auto-hide toast after ~3s (separate effect so navigation doesn't cancel the timer)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/templates");
      setTemplates(data);
      const acc = {};
      data.forEach((t) => {
        acc[t.id] = t.access || "all";
      });
      setAccessMap(acc);
    } catch (err) {
      setError(err.message);
      setToast(err.message || "Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    localStorage.setItem("templateBookmarks", JSON.stringify(bookmarked));
  }, [bookmarked]);

  useEffect(() => {
    const fetchRole = async () => {
      const u = auth.currentUser;
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserRole(snap.data()?.role || "user");
      }
    };
    fetchRole();
  }, []);

  const deleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await api.del(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setBookmarked((prev) => prev.filter((bid) => bid !== id));
      setAccessMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setToast("Template deleted");
    } catch (err) {
      setToast(err.message || "Delete failed");
    }
  };

  const duplicateTemplate = async (template) => {
    const duplicated = {
      ...template,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      access: accessMap[template.id] || "all",
      pages: JSON.parse(JSON.stringify(template.pages)),
    };
    try {
      const newTemplate = await api.post("/templates", duplicated);
      setTemplates((prev) => [...prev, newTemplate]);
      setAccessMap((prev) => ({ ...prev, [newTemplate.id]: duplicated.access }));
      setToast("Template duplicated");
    } catch (err) {
      setToast(err.message || "Duplicate failed");
    }
  };

  const toggleBookmark = (id) => {
    setBookmarked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
    );
  };

  const filteredTemplates = templates
    .filter((t) => {
      // Access filtering
      const accessVal = accessMap[t.id] || "all";
      if (accessVal === "admin" && userRole !== "admin") return false;
      if (accessVal === "manager" && !["admin", "manager"].includes(userRole)) return false;
      // All users: show to admin, manager, user
      if (accessVal === "all" && !["admin", "manager", "user"].includes(userRole)) return false;

      // Filter by template title (pages[0].title from TemplateBuilder)
      const name = t.pages?.[0]?.title || t.title || "";
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aBook = bookmarked.includes(a.id) ? 1 : 0;
      const bBook = bookmarked.includes(b.id) ? 1 : 0;
      if (aBook !== bBook) return bBook - aBook; // bookmarked on top
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  useEffect(() => {
    const handler = () => setMenuOpenFor(null);
    if (menuOpenFor !== null) {
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [menuOpenFor]);

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      <div className="p-6 w-full">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Templates
          </h1>
          <div className="flex gap-2">
            {["admin", "manager"].includes(userRole) && (
              <button
                onClick={async () => {
                  // Create an empty template on backend and immediately navigate to edit
                  const data = await api.post("/templates", {
                    pages: [
                      {
                        title: "Title Page",
                        description: "The Title Page is the first page of your inspection report. You can customize the Title Page below.",
                        logo: null,
                        sections: [
                          {
                            id: 1,
                            title: "Title Page",
                            description: "",
                            questions: [
                              {
                                id: 1,
                                type: "site",
                                label: "Site conducted",
                                required: true,
                                placeholder: ""
                              },
                              {
                                id: 2,
                                type: "inspection_date",
                                label: "Conducted on",
                                required: false,
                                placeholder: ""
                              },
                              {
                                id: 3,
                                type: "person",
                                label: "Prepared by",
                                required: false,
                                placeholder: ""
                              },
                              {
                                id: 4,
                                type: "inspection_location",
                                label: "Location",
                                required: false,
                                placeholder: ""
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  });
                  navigate(`/template-builder/${data.id}`);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm sm:text-base"
              >
                <Plus size={18} /> New Template
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            className="border rounded px-3 py-2 w-full md:w-1/2"
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Bookmarked Section */}
        {bookmarked.length > 0 && (
          <div className="mt-4 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold">
              <Star className="mr-1" size={16} /> Bookmarked templates
            </span>
          </div>
        )}
      </div>
      {/* Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-md">
        {loading ? (
          <div className="p-6 text-gray-500">Loading templates…</div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-6 text-gray-400">No templates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <colgroup>
                <col style={{ width: "32px" }} /> {/* Star */}
                <col style={{ width: "36px" }} /> {/* Icon */}
                <col style={{ width: "21%" }} /> {/* Name */}
                <col style={{ width: "16%" }} /> {/* Created */}
                <col style={{ width: "23%" }} /> {/* Access */}
                <col style={{ width: "17%" }} /> {/* Action */}
              </colgroup>
              <thead>
                <tr className="bg-blue-50 text-blue-800">
                  <th className="py-3 px-2"></th>
                  <th className="py-3 px-1"></th>
                  <th className="py-3 px-2 text-left font-bold">Name</th>
                  <th className="py-3 px-3 text-left font-bold">Created</th>
                  <th className="py-3 px-3 text-left font-bold">Access</th>
                  <th className="py-3 px-3 text-right font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((t) => {
                  // FIX 1: Always use meta.title if it exists (from TemplateBuilder)
                  const name = t.pages?.[0]?.title || "Unnamed Template";
                  // Show meta.description, then t.description, then section[0]?.description
                  const subtitle = t.pages?.[0]?.description || "";
                  const initials = getInitials(name);
                  const accessVal = accessMap[t.id] || "all";
                  const currentAccess =
                    ACCESS_OPTIONS.find(opt => opt.value === accessVal) ||
                    ACCESS_OPTIONS[2];
                  return (
                    <tr
                      key={t.id}
                      className={`border-b hover:bg-blue-50 transition ${bookmarked.includes(t.id) ? "bg-yellow-50" : ""}`}
                    >
                      {/* Bookmark Star */}
                      <td className="py-2 px-2 text-center align-middle">
                        <button
                          className="focus:outline-none"
                          title={bookmarked.includes(t.id) ? "Remove Bookmark" : "Bookmark"}
                          style={{ lineHeight: 0, padding: 0 }}
                          onClick={e => { e.stopPropagation(); toggleBookmark(t.id); }}
                        >
                          {bookmarked.includes(t.id) ? (
                            <Star size={16} className="text-yellow-500 fill-yellow-400" />
                          ) : (
                            <StarOff size={16} className="text-gray-300" />
                          )}
                        </button>
                      </td>
                      {/* Logo + Name + Subtitle with classic spacing */}
                      <td className="py-2 px-1 align-middle" colSpan={2}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-base shadow">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium text-gray-800">{name}</span>
                            {subtitle && (
                              <span className="truncate text-xs text-gray-500 font-normal">{subtitle}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Created */}
                      <td className="py-2 px-3 text-gray-600 align-middle">
                        {formatDate(t.createdAt)}
                      </td>
                      {/* Access */}
                      <td className="py-2 px-3 align-middle">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${currentAccess.color}`}
                        >
                          {currentAccess.badge}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-2 px-3 text-right align-middle">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            className="bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded-lg flex items-center gap-1 text-xs sm:text-sm md:text-base"
                            onClick={() => navigate(`/inspections/new/${t.id}`)}
                          >
                            Start Inspection
                          </button>
                            <div className="relative">
                              <button
                                className="p-2 rounded hover:bg-gray-100"
                                title="More"
                                style={{ lineHeight: 0 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setMenuOpenFor(menuOpenFor === t.id ? null : t.id);
                                  // Save trigger button position for portal menu
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  window._templateMenuBtnRect = rect;
                                }}
                              >
                                <MoreVertical size={20} />
                              </button>
                              {/* Dropdown in Portal */}
                              {menuOpenFor === t.id &&
                                createPortal(
                                  <div
                                    className="fixed bg-white border rounded shadow z-[9999] w-40 text-sm flex flex-col"
                                    style={{
                                      minWidth: 150,
                                      top: (window._templateMenuBtnRect?.bottom || 100) + 4,
                                      left: Math.max(
                                        8,
                                        Math.min(
                                          (window.innerWidth || 320) - 160 - 8,
                                          (window._templateMenuBtnRect?.right || 100) - 160
                                        )
                                      ),
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button
                                      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-left"
                                      onClick={() => {
                                        setMenuOpenFor(null);
                                        onEditTemplate?.(t.id) || navigate(`/template-builder/${t.id}`);
                                      }}
                                    >
                                      <Edit2 size={15} /> Edit Template
                                    </button>
                                    <button
                                      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-left"
                                      onClick={() => {
                                        setMenuOpenFor(null);
                                        duplicateTemplate(t);
                                      }}
                                    >
                                      <Copy size={15} /> Duplicate
                                    </button>
                                    <button
                                      className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 text-left"
                                      onClick={() => {
                                        setMenuOpenFor(null);
                                        deleteTemplate(t.id);
                                      }}
                                    >
                                      <Trash2 size={15} /> Delete
                                    </button>
                                  </div>,
                                  document.body
                                )}
                            </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* Mobile list (phones) */}
      <div className="block md:hidden mt-4">
        {loading ? (
          <div className="p-4 text-gray-500">Loading templates…</div>
        ) : error ? (
          <div className="p-4 text-red-600">Failed to load templates</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-4 text-gray-500">No templates found</div>
        ) : (
          <ul className="flex flex-col divide-y">
            {filteredTemplates.map((t) => {
              const name = t.pages?.[0]?.title || t.title || "Untitled";
              const subtitle = t.pages?.[0]?.description || t.description || "";
              const initials = getInitials(name);
              const accessVal = (accessMap[t.id] || "all");
              const accessLabel =
                accessVal === "admin" ? "Admins only" :
                accessVal === "manager" ? "Admins & Managers" :
                "All users";

              return (
                <li
                  key={t.id}
                  className="bg-white px-3 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/inspections/new/${t.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/inspections/new/${t.id}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* 1) Left logo */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-semibold text-base shadow">
                      {initials}
                    </div>

                    {/* 2–4) Title, subtitle (description), Access */}
                    <div className="flex-1 min-w-0">
                      {/* 3) Title (first row) */}
                      <div className="font-semibold text-gray-800 truncate">{name}</div>
                      {/* 4) Subtitle (second row) */}
                      {subtitle && (
                        <div className="text-sm text-gray-600 truncate">
                          {subtitle}
                        </div>
                      )}
                      {/* 5) Access (third row) */}
                      <div className="text-xs text-gray-500 mt-1">Access: {accessLabel}</div>
                    </div>

                    {/* Right-side actions: 3-dot menu (centered vertically) */}
                    <div className="flex items-center self-center">
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(menuOpenFor === t.id ? null : t.id);
                          try {
                            const rect = e.currentTarget.getBoundingClientRect();
                            window._templateMenuBtnRect = rect;
                          } catch {}
                        }}
                        title="More"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Same portal menu you use on desktop, clamped within viewport on small screens */}
                      {menuOpenFor === t.id &&
                        createPortal(
                          <div
                            className="fixed bg-white border rounded shadow z-[9999] w-40 text-sm flex flex-col"
                            style={{
                              minWidth: 150,
                              top: (window._templateMenuBtnRect?.bottom || 100) + 4,
                              left: Math.max(
                                8,
                                Math.min(
                                  (window.innerWidth || 320) - 160 - 8,
                                  (window._templateMenuBtnRect?.right || 100) - 160
                                )
                              ),
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-left"
                              onClick={() => {
                                setMenuOpenFor(null);
                                navigate(`/template-builder/${t.id}`);
                              }}
                            >
                              <Edit2 size={15} /> Edit Template
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-left"
                              onClick={() => {
                                setMenuOpenFor(null);
                                duplicateTemplate(t);
                              }}
                            >
                              <Copy size={15} /> Duplicate
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 text-left"
                              onClick={() => {
                                setMenuOpenFor(null);
                                deleteTemplate(t.id);
                              }}
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>,
                          document.body
                        )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
    </>
  );
}
