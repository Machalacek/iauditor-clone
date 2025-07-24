import React, { useEffect, useRef, useState } from "react";
import { Tab } from "@headlessui/react";
import { auth, db, storage } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useGearStore } from "../store/gearStore";
import { useTeamStore } from "../store/teamStore";
import {
  FaUserEdit,
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
  FaMinusCircle,
  FaTrash,
  FaCertificate,
  FaToolbox,
  FaExclamationCircle,
  FaExchangeAlt,
  FaListUl,
  FaSave,
  FaTimes,
  FaEdit,
} from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import { BsPersonWorkspace } from "react-icons/bs";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";

// Helper: months diff
function monthsDiff(date) {
  if (!date) return Infinity;
  const now = new Date();
  const exp = new Date(date);
  return (
    exp.getFullYear() * 12 +
    exp.getMonth() -
    (now.getFullYear() * 12 + now.getMonth())
  );
}

function TabHeader({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      {icon} {children}
    </span>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [avatarURL, setAvatarURL] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tabIdx, setTabIdx] = useState(0);

  // --- Overview/certs ---
  const [overviewCerts, setOverviewCerts] = useState([]);
  // --- Certs Tab ---
  const [certs, setCerts] = useState([]);
  const [certUploading, setCertUploading] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certName, setCertName] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  // --- Review Tab ---
  const [reviews, setReviews] = useState([]);
  const [newReviewTitle, setNewReviewTitle] = useState("");
  const [newReview, setNewReview] = useState("");
  const [reviewType, setReviewType] = useState("positive");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editReviewTitle, setEditReviewTitle] = useState("");
  const [editReviewNote, setEditReviewNote] = useState("");
  const [editReviewType, setEditReviewType] = useState("positive");

  // --- Assigned Gear ---
  const gearList = useGearStore((s) => s.gear);
  const team = useTeamStore((s) => s.team);

  // Avatar input
  const avatarInputRef = useRef();
  const textareaRef = useRef();
  const editTextareaRef = useRef();

  useEffect(() => {
    // Load user profile
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return setLoading(false);
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      if (snap.exists()) {
        const d = snap.data();
        setProfile({ ...d, uid: user.uid });
        setAvatarURL(d.avatarURL || "");
        setCerts(d.certifications || []);
        setOverviewCerts(d.certifications || []);
        setReviews(d.reviews || []);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // ============ EXPIRING CERT NOTIFICATION FEATURE ===============
  // Helper to send notification for expiring certs
  async function checkAndNotifyExpiringCerts(certs, userName) {
    for (let cert of certs) {
      const months = monthsDiff(cert.expiry);
      if (
        cert.expiry &&
        months < 3 &&
        !cert.notified
      ) {
        try {
          await axios.post("/api/notify-expiring-cert", {
            cert: { ...cert, user: userName }
          });
          cert.notified = true;
          // Optionally persist the notified flag if you want (see below)
        } catch (e) {
          // Handle/log error if needed
        }
      }
    }
  }
  // Hook: notify on load/update
  useEffect(() => {
    if (certs && certs.length && profile && profile.name) {
      checkAndNotifyExpiringCerts(certs, profile.name);
    }
  }, [certs, profile]);
  // ============ END EXPIRING CERT NOTIFICATION ===============

  // Save Profile (for Overview tab)
  const handleSave = async () => {
    setSaving(true);
    const refUser = doc(db, "users", profile.uid);
    await updateDoc(refUser, {
      name: profile.name,
      team: profile.team,
      phone: profile.phone || "",
      email: profile.email || "",
      avatarURL,
    });
    setSaving(false);
    alert("Profile updated");
  };

  // Avatar Upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const storageRef = ref(
        storage,
        `avatars/${profile.uid}/${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setAvatarURL(url);
      setProfile((p) => ({ ...p, avatarURL: url }));
      await updateDoc(doc(db, "users", profile.uid), { avatarURL: url });
    } catch (err) {
      alert("Failed to upload avatar: " + err.message);
    }
    setAvatarUploading(false);
  };

  // Certifications Tab: Upload cert (file is NOT required)
  const handleCertUpload = async (e) => {
    e.preventDefault();
    if (!certName || !certExpiry) {
      alert("Please fill all cert fields");
      return;
    }
    setCertUploading(true);
    try {
      let url = "";
      let filename = "";
      if (certFile) {
        const storageRef = ref(
          storage,
          `certifications/${profile.uid}/${certFile.name}`
        );
        await uploadBytes(storageRef, certFile);
        url = await getDownloadURL(storageRef);
        filename = certFile.name;
      }
      const newCert = {
        name: certName,
        url,
        expiry: certExpiry,
        filename,
      };
      const updatedCerts = [...certs, newCert];
      setCerts(updatedCerts);
      setOverviewCerts(updatedCerts);
      await updateDoc(doc(db, "users", profile.uid), {
        certifications: updatedCerts,
      });
      setCertFile(null);
      setCertName("");
      setCertExpiry("");
    } catch (err) {
      alert("Failed to upload cert: " + err.message);
    }
    setCertUploading(false);
  };

  // Certifications Tab: Delete cert
  const handleDeleteCert = async (cert) => {
    if (!window.confirm("Delete this certification?")) return;
    try {
      if (cert.filename) {
        await deleteObject(
          ref(storage, `certifications/${profile.uid}/${cert.filename}`)
        );
      }
    } catch (e) {}
    const updatedCerts = certs.filter((c) => c.url !== cert.url || c.name !== cert.name);
    setCerts(updatedCerts);
    setOverviewCerts(updatedCerts);
    await updateDoc(doc(db, "users", profile.uid), {
      certifications: updatedCerts,
    });
  };

  // Reviews Tab: Add new
  const handleAddReview = async () => {
    if (!newReviewTitle.trim() || !newReview.trim()) return;
    const entry = {
      type: reviewType,
      title: newReviewTitle,
      note: newReview,
      date: new Date().toISOString(),
    };
    const updatedReviews = [...reviews, entry];
    setReviews(updatedReviews);
    await updateDoc(doc(db, "users", profile.uid), {
      reviews: updatedReviews,
    });
    setNewReview("");
    setNewReviewTitle("");
    setReviewType("positive");
  };

  // Reviews Tab: Start Edit
  const handleStartEditReview = (idx) => {
    setEditingIdx(idx);
    setEditReviewTitle(reviews[idx].title);
    setEditReviewNote(reviews[idx].note);
    setEditReviewType(reviews[idx].type);
    setTimeout(() => {
      if (editTextareaRef.current) editTextareaRef.current.focus();
    }, 100);
  };

  // Reviews Tab: Save Edit
  const handleSaveEditReview = async (idx) => {
    if (!editReviewTitle.trim() || !editReviewNote.trim()) return;
    const updatedReviews = [...reviews];
    updatedReviews[idx] = {
      ...updatedReviews[idx],
      title: editReviewTitle,
      note: editReviewNote,
      type: editReviewType,
    };
    setReviews(updatedReviews);
    await updateDoc(doc(db, "users", profile.uid), {
      reviews: updatedReviews,
    });
    setEditingIdx(null);
    setEditReviewTitle("");
    setEditReviewNote("");
    setEditReviewType("positive");
  };

  // Reviews Tab: Cancel Edit
  const handleCancelEditReview = () => {
    setEditingIdx(null);
    setEditReviewTitle("");
    setEditReviewNote("");
    setEditReviewType("positive");
  };

  // Reviews Tab: Delete review
  const handleDeleteReview = async (idx) => {
    if (!window.confirm("Delete this review?")) return;
    const updatedReviews = reviews.filter((_, i) => i !== idx);
    setReviews(updatedReviews);
    await updateDoc(doc(db, "users", profile.uid), {
      reviews: updatedReviews,
    });
  };

  // Performance summary
  const reviewSummary = (() => {
    let pos = 0,
      neg = 0,
      neu = 0;
    reviews.forEach((r) => {
      if (r.type === "positive") pos++;
      else if (r.type === "negative") neg++;
      else neu++;
    });
    return { pos, neg, neu, total: reviews.length };
  })();

  // --- Assigned Gear ---
  const myGear =
    profile &&
    gearList.filter(
      (g) =>
        g.assignedTo &&
        (g.assignedTo === profile.name ||
          g.assignedTo === profile.uid ||
          g.assignedTo === profile.email)
    );

  // User role
  const thisUser = team.find(
    (t) => t.name === profile?.name || t.email === profile?.email
  );
  const role = thisUser?.role || profile?.role || "";
  const canModifyGear = ["Administrator", "Manager", "admin", "manager"].includes(role);

  // Markdown helper buttons
  const insertMarkdown = (syntaxStart, syntaxEnd = "", which = "add") => {
    const textarea =
      which === "add" ? textareaRef.current : editTextareaRef.current;
    const textValue =
      which === "add" ? newReview : editReviewNote;
    if (!textarea) return;
    const [start, end] = [textarea.selectionStart, textarea.selectionEnd];
    const selected = textValue.slice(start, end);
    const before = textValue.slice(0, start);
    const after = textValue.slice(end);
    const md = `${before}${syntaxStart}${selected}${syntaxEnd}${after}`;
    if (which === "add") setNewReview(md);
    else setEditReviewNote(md);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        start + syntaxStart.length + selected.length + syntaxEnd.length;
    }, 0);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">Profile not found.</div>;

  return (
    <div className="w-full flex justify-center py-8 px-2">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-2xl shadow-xl px-8 py-6 w-full">
          {/* Profile header */}
          <div className="flex items-center gap-6 mb-4">
            <div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-5xl text-white shadow-lg overflow-hidden cursor-pointer hover:opacity-90 relative group"
              title="Change avatar"
              onClick={() => avatarInputRef.current.click()}
            >
              {avatarURL ? (
                <img
                  src={avatarURL}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaUserEdit />
              )}
              <div className="absolute bottom-0 right-0 bg-black/70 rounded-full p-1 group-hover:opacity-100 opacity-0 transition-opacity">
                <FaCamera className="text-white text-sm" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-bold">{profile.name}</span>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  {profile.role}
                </span>
              </div>
              <div className="text-gray-500 flex items-center gap-2 mt-1">
                <HiOutlineMail className="text-base" />
                {profile.email}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Position: <span className="font-semibold">{profile.team}</span>
              </div>
            </div>
          </div>
          <div className="border-b mb-2" />

          {/* TABS */}
          <Tab.Group selectedIndex={tabIdx} onChange={setTabIdx}>
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
                    <TabHeader icon={<FaUserEdit />}>Overview</TabHeader>
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
                    <TabHeader icon={<FaCertificate />}>Certifications</TabHeader>
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
                    <TabHeader icon={<BsPersonWorkspace />}>Performance Review</TabHeader>
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
              {/* --- Overview --- */}
              <Tab.Panel>
                <div className="py-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Name</label>
                    <input className="w-full p-2 border rounded bg-gray-50"
                      value={profile.name}
                      onChange={e =>
                        setProfile((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Position</label>
                    <input className="w-full p-2 border rounded bg-gray-50"
                      value={profile.team}
                      onChange={e =>
                        setProfile((p) => ({ ...p, team: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Phone</label>
                    <input className="w-full p-2 border rounded bg-gray-50"
                      value={profile.phone || ""}
                      onChange={e =>
                        setProfile((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Role</label>
                    <input
                      className="w-full p-2 border rounded bg-gray-100 text-gray-500"
                      value={profile.role}
                      disabled
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-600 font-medium mb-1">Email</label>
                    <input
                      className="w-full p-2 border rounded bg-gray-100 text-gray-500"
                      value={profile.email}
                      disabled
                    />
                  </div>
                </div>
                {/* Certs quick list */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCertificate className="text-blue-500" />
                    <h2 className="text-lg font-semibold">Certifications</h2>
                  </div>
                  {/* CERTS VERTICAL, RIGHT-ALIGNED EXPIRY, EXCLAMATION LEFT */}
                  <div className="flex flex-col gap-2">
                    {overviewCerts.length === 0 && (
                      <span className="text-gray-400 italic">
                        No certifications uploaded
                      </span>
                    )}
                    {overviewCerts.map((cert) => {
                      const months = monthsDiff(cert.expiry);
                      return (
                        <div
                          key={cert.url || cert.name}
                          className="flex items-center justify-between bg-gray-50 border rounded px-4 py-2 shadow-sm"
                        >
                          {/* Left: Cert Name */}
                          <div className="flex-1 min-w-0 font-medium text-ellipsis overflow-hidden">
                            {cert.url ? (
                              <a
                                href={cert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={clsx(
                                  "hover:underline",
                                  months < 3
                                    ? "text-red-600 animate-pulse"
                                    : "text-blue-700"
                                )}
                              >
                                {cert.name}
                              </a>
                            ) : (
                              <span
                                className={clsx(
                                  months < 3
                                    ? "text-red-600 animate-pulse"
                                    : "text-blue-700"
                                )}
                              >
                                {cert.name}
                              </span>
                            )}
                          </div>
                          {/* Right: Expiry info */}
                          <div className="flex items-center gap-2 ml-4">
                            {months < 3 && (
                              <FaExclamationCircle className="text-red-500 animate-bounce" />
                            )}
                            <span
                              className={clsx(
                                "text-xs rounded px-2 py-0.5 whitespace-nowrap",
                                months < 3
                                  ? "bg-red-100 text-red-700 font-bold animate-pulse"
                                  : "bg-green-100 text-green-700"
                              )}
                            >
                              Expires: {cert.expiry}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Review summary */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BsPersonWorkspace className="text-blue-500" />
                    <h2 className="text-lg font-semibold">Performance Review Summary</h2>
                  </div>
                  <div className="flex gap-4 text-sm mb-2">
                    <span className="flex items-center gap-1 text-green-600">
                      <FaCheckCircle /> Positive: {reviewSummary.pos}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <FaMinusCircle /> Neutral: {reviewSummary.neu}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <FaTimesCircle /> Negative: {reviewSummary.neg}
                    </span>
                    <span className="flex items-center gap-1 text-blue-600 ml-auto font-bold">
                      Total: {reviewSummary.total}
                    </span>
                  </div>
                  {/* Review titles in summary */}
                  {reviews.length > 0 && (
                    <ul className="pl-2 list-disc">
                      {reviews.map((r, idx) => (
                        <li key={idx} className={clsx("mb-1", r.type === "positive" ? "text-green-700" : r.type === "negative" ? "text-red-700" : "text-gray-700")}>
                          <span className="font-bold">{r.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-8 flex">
                  <button
                    className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </Tab.Panel>
              {/* --- Certifications --- */}
              <Tab.Panel>
                <div className="py-6">
                  {/* Add Certification Card - Full width gradient, wide inputs */}
                  <form
                    className="w-full bg-gradient-to-tr from-blue-50 to-white rounded-2xl shadow-lg border px-8 py-6 mb-10 flex flex-col gap-6"
                    onSubmit={handleCertUpload}
                  >
                    <div className="flex flex-col md:flex-row gap-4 w-full items-end">
                      {/* Certificate Name (much wider on desktop) */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-gray-600 font-semibold mb-1">Certificate Name</label>
                        <input
                          className="w-full p-2 border rounded bg-white text-base font-medium shadow-sm"
                          value={certName}
                          onChange={e => setCertName(e.target.value)}
                          placeholder="e.g. Fall Protection"
                          required
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <label className="block text-gray-600 font-semibold mb-1">Expiry Date</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded bg-white text-base font-medium shadow-sm"
                          value={certExpiry}
                          onChange={e => setCertExpiry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="w-full md:w-56">
                        <label className="block text-gray-600 font-semibold mb-1">File</label>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="block w-full text-sm"
                          onChange={e => setCertFile(e.target.files[0])}
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full md:w-auto bg-blue-600 text-white px-7 py-2 rounded-xl shadow hover:bg-blue-700 transition font-semibold mt-2 md:mt-0"
                        disabled={certUploading}
                      >
                        {certUploading ? "Uploading..." : "Add"}
                      </button>
                    </div>
                  </form>

                  {/* Certifications List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {certs.length === 0 && (
                      <div className="text-center text-gray-400 italic col-span-2">No certifications uploaded</div>
                    )}
                    {certs.map((cert) => {
                      const months = monthsDiff(cert.expiry);
                      const isExpiring = months < 3;
                      const expired = months < 0;
                      return (
                        <div
                          key={cert.url || cert.name}
                          className={clsx(
                            "flex gap-4 items-center bg-white rounded-xl border shadow hover:shadow-lg p-5 transition-all duration-150 group relative overflow-hidden",
                            expired
                              ? "border-red-400 ring-2 ring-red-100"
                              : isExpiring
                              ? "border-red-400 ring-2 ring-red-50"
                              : "border-gray-200"
                          )}
                        >
                          {/* Icon/Avatar */}
                          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-2xl shadow-inner border">
                            <FaCertificate className={clsx(isExpiring || expired ? "text-red-500" : "text-blue-400")} />
                          </div>
                          {/* Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg text-gray-900 truncate">{cert.name}</span>
                              {expired && (
                                <span className="ml-2 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded animate-pulse shadow">EXPIRED</span>
                              )}
                              {!expired && isExpiring && (
                                <span className="ml-2 text-xs font-bold text-red-900 bg-red-100 px-2 py-0.5 rounded animate-pulse shadow flex items-center gap-1">
                                  <FaExclamationCircle className="text-red-500" /> Expiring Soon
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {cert.url ? (
                                <a
                                  href={cert.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs font-medium flex items-center gap-1"
                                >
                                  View File
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs italic">No file</span>
                              )}
                              <span className={clsx(
                                "ml-auto text-xs rounded px-2 py-0.5 font-semibold",
                                expired
                                  ? "bg-red-100 text-red-700"
                                  : isExpiring
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              )}>
                                Expires: {cert.expiry}
                              </span>
                            </div>
                          </div>
                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteCert(cert)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 opacity-70 group-hover:opacity-100 transition"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Tab.Panel>
              {/* --- Performance Review --- */}
              <Tab.Panel>
                <div className="py-4">
                  <form
                    className="grid md:grid-cols-3 gap-4 items-start mb-6 bg-white rounded-lg border p-4 shadow-sm relative"
                    style={{ minHeight: 230 }}
                    onSubmit={e => {
                      e.preventDefault();
                      handleAddReview();
                    }}
                  >
                    {/* Left: Title & Note (2/3 width) */}
                    <div className="md:col-span-2 flex flex-col gap-3">
                      <div>
                        <label className="block text-gray-600 font-medium mb-1 text-sm">
                          Title
                        </label>
                        <input
                          className="w-full p-2 border rounded bg-gray-50 text-base font-semibold"
                          value={newReviewTitle}
                          onChange={e => setNewReviewTitle(e.target.value)}
                          placeholder="Review Title"
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-gray-600 font-medium text-sm">
                            Note
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Bold (**text**)"
                              className="p-1 rounded hover:bg-gray-200 text-base font-bold"
                              onClick={() => insertMarkdown("**", "**", "add")}
                              style={{ fontWeight: "bold" }}
                            >
                              B
                            </button>
                            <button
                              type="button"
                              title="Italic (_text_)"
                              className="p-1 rounded hover:bg-gray-200 text-base italic"
                              onClick={() => insertMarkdown("_", "_", "add")}
                              style={{ fontStyle: "italic" }}
                            >
                              I
                            </button>
                            <button
                              type="button"
                              title="Bulleted List"
                              className="p-1 rounded hover:bg-gray-200 text-base"
                              onClick={() => insertMarkdown("- ", "", "add")}
                            >
                              <FaListUl />
                            </button>
                          </div>
                        </div>
                        <textarea
                          ref={textareaRef}
                          rows={4}
                          className="w-full p-2 border rounded bg-gray-50 resize-vertical text-base"
                          value={newReview}
                          onChange={e => setNewReview(e.target.value)}
                          placeholder="Enter review/notes... (Markdown: Bold, Italic, Bullet)"
                          required
                        />
                      </div>
                    </div>
                    {/* Right: Review Type & Add */}
                    <div className="flex flex-col gap-2 w-full h-full relative">
                      <div>
                        <label className="block text-gray-600 font-medium mb-1 text-sm">
                          Review Type
                        </label>
                        <select
                          className="w-full p-2 border rounded bg-gray-50 text-base"
                          value={reviewType}
                          onChange={e => setReviewType(e.target.value)}
                        >
                          <option value="positive">Positive</option>
                          <option value="neutral">Neutral</option>
                          <option value="negative">Negative</option>
                        </select>
                      </div>
                      {/* Button stays bottom right (absolute on desktop, static on mobile) */}
                      <div className="flex-1 flex items-end justify-end md:absolute md:bottom-4 md:right-4 md:w-auto md:h-auto">
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition font-semibold text-base"
                          style={{ minWidth: 90 }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </form>
                  <div>
                    {reviews.length === 0 && (
                      <span className="text-gray-400 italic">
                        No reviews yet.
                      </span>
                    )}
                    <ul>
                      {reviews.map((r, i) => (
                        <li
                          key={i}
                          className={clsx(
                            "flex gap-3 items-start border-b py-3",
                            r.type === "positive"
                              ? "text-green-700"
                              : r.type === "negative"
                              ? "text-red-700"
                              : "text-gray-700"
                          )}
                        >
                          <div className="pt-1 min-w-[28px] flex flex-col items-center">
                            {r.type === "positive" && <FaCheckCircle />}
                            {r.type === "neutral" && <FaMinusCircle />}
                            {r.type === "negative" && <FaTimesCircle />}
                          </div>
                          <div className="flex-1">
                            {editingIdx === i ? (
                              <div>
                                <div className="flex gap-2 mb-1 flex-wrap">
                                  <input
                                    className="w-1/2 p-2 border rounded bg-gray-50 font-bold"
                                    value={editReviewTitle}
                                    onChange={e =>
                                      setEditReviewTitle(e.target.value)
                                    }
                                    placeholder="Review Title"
                                    required
                                  />
                                  <select
                                    className="p-2 border rounded"
                                    value={editReviewType}
                                    onChange={e => setEditReviewType(e.target.value)}
                                  >
                                    <option value="positive">Positive</option>
                                    <option value="neutral">Neutral</option>
                                    <option value="negative">Negative</option>
                                  </select>
                                </div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="block text-gray-600 font-medium">
                                    Note
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      title="Bold (**text**)"
                                      className="p-1 rounded hover:bg-gray-200 text-base font-bold"
                                      onClick={() => insertMarkdown("**", "**", "edit")}
                                      style={{ fontWeight: "bold" }}
                                    >
                                      B
                                    </button>
                                    <button
                                      type="button"
                                      title="Italic (_text_)"
                                      className="p-1 rounded hover:bg-gray-200 text-base italic"
                                      onClick={() => insertMarkdown("_", "_", "edit")}
                                      style={{ fontStyle: "italic" }}
                                    >
                                      I
                                    </button>
                                    <button
                                      type="button"
                                      title="Bulleted List"
                                      className="p-1 rounded hover:bg-gray-200 text-base"
                                      onClick={() => insertMarkdown("- ", "", "edit")}
                                    >
                                      <FaListUl />
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  ref={editTextareaRef}
                                  rows={4}
                                  className="w-full p-2 border rounded bg-gray-50 resize-vertical"
                                  value={editReviewNote}
                                  onChange={e => setEditReviewNote(e.target.value)}
                                  placeholder="Edit note..."
                                  required
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                                    onClick={() => handleSaveEditReview(i)}
                                  >
                                    <FaSave /> Save
                                  </button>
                                  <button
                                    className="bg-gray-300 text-gray-800 px-4 py-1 rounded hover:bg-gray-400 flex items-center gap-1"
                                    onClick={handleCancelEditReview}
                                  >
                                    <FaTimes /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-lg block mb-1">
                                  {r.title}
                                </span>
                                <ReactMarkdown
                                  children={r.note || ""}
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ node, ...props }) => <p {...props} className="mb-1" />,
                                    ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-6" />,
                                    strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                                    em: ({ node, ...props }) => <em {...props} className="italic" />,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 pt-1 min-w-[80px]">
                            {new Date(r.date).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1 items-center ml-2 pt-1">
                            {editingIdx !== i && (
                              <button
                                onClick={() => handleStartEditReview(i)}
                                className="text-blue-500 hover:text-blue-800"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(i)}
                              className="text-red-400 hover:text-red-700"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Tab.Panel>
              {/* --- Assigned Gear --- */}
              <Tab.Panel>
                <div className="py-4">
                  {(!myGear || myGear.length === 0) && (
                    <span className="text-gray-400 italic">
                      No gear assigned
                    </span>
                  )}
                  {myGear && myGear.length > 0 && (
                    <ul className="space-y-2">
                      {myGear.map((g) => (
                        <li
                          key={g.id}
                          className="bg-gray-50 border rounded px-3 py-2 flex items-center gap-3 shadow-sm"
                        >
                          <span className="font-medium">{g.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {g.category}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                            {g.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            #{g.serialNumber}
                          </span>
                          {canModifyGear ? (
                            <button className="ml-auto bg-gray-100 px-3 py-1 rounded text-xs font-medium border border-gray-200 shadow-sm hover:bg-gray-200">
                              Modify
                            </button>
                          ) : (
                            <button className="ml-auto bg-blue-600 px-3 py-1 rounded text-xs font-medium text-white shadow hover:bg-blue-700 flex items-center gap-1">
                              <FaExchangeAlt /> Transfer Equipment
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}
