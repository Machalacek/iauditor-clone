// src/pages/GearDetail.jsx

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  File,
  AlertTriangle,
  Trash2,
  Repeat,
} from "lucide-react";
import { useTeamStore } from "../store/teamStore";
import { useProjectStore } from "../store/projectStore";
import { auth, db } from "../firebase";
import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import TransferEquipmentModal from "../components/TransferEquipmentModal";

const TAB_LIST = [
  { label: "Overview", key: "overview", icon: <ClipboardList size={18} /> },
  { label: "Activity", key: "activity", icon: <FileText size={18} /> },
  { label: "Documents", key: "documents", icon: <File size={18} /> },
  { label: "Images", key: "images", icon: <ImageIcon size={18} /> },
];

export default function GearDetail({ gear, setCurrentPage }) {
  const { team } = useTeamStore();
  const { projects, fetchProjects } = useProjectStore();
  const [tab, setTab] = useState("overview");
  const [pendingAction, setPendingAction] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingHandled, setPendingHandled] = useState(false);

  // --- Local gear state for instant updates ---
  const [localGear, setLocalGear] = useState(gear);
  // Keep in sync with parent if gear prop changes
  useEffect(() => { setLocalGear(gear); }, [gear]);

  // Fetch projects if not loaded
  useEffect(() => {
    if (!projects || projects.length === 0) {
      fetchProjects && fetchProjects();
    }
  }, [projects, fetchProjects]);

  function displayUser(id) {
    if (!id) return "—";
    const user = team.find((u) => u.id === id);
    return user ? user.name || user.email || id : id;
  }
  function displayProject(id) {
    if (!id) return "—";
    const project = projects.find((p) => p.id === id);
    return project ? project.name || id : id;
  }

  // Transfer handler for TransferEquipmentModal
  async function handleGearTransfer(gearId, newAssignedTo, newProject) {
    const gearRef = doc(db, "gear", gearId);
    const gearSnap = await getDoc(gearRef);
    const gearData = gearSnap.data();
    const notifId = `${gearId}_${Date.now()}`;
    const notification = {
      id: notifId,
      type: "gear-transfer-request",
      gearId,
      gearName: gearData.name,
      fromUserId: gearData.assignedTo || "",
      fromProjectId: gearData.assignedProject || "",
      toUserId: newAssignedTo,
      toProjectId: newProject || "",
      requestedBy: auth.currentUser.uid,
      requestedAt: new Date().toISOString(),
      pending: true,
      message: "",
    };

    await updateDoc(gearRef, {
      pendingTransfer: {
        notifId,
        to: { userId: newAssignedTo, projectId: newProject || "" },
        from: {
          userId: gearData.assignedTo || "",
          projectId: gearData.assignedProject || "",
        },
        date: new Date().toISOString(),
        requestedBy: auth.currentUser.uid,
      },
    });

    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const notifees = users.filter(
      (u) =>
        u.role === "admin" ||
        u.role === "manager" ||
        u.id === newAssignedTo
    );
    await Promise.all(
      notifees.map((u) =>
        updateDoc(doc(db, "users", u.id), {
          notifications: (u.notifications || []).concat([notification]),
        })
      )
    );
  }

  // Accept/Deny logic for pending transfer
  async function updateNotificationStatus(notifId, decision) {
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const targets = users.filter((u) =>
      (u.notifications || []).some((n) => n.id === notifId)
    );
    await Promise.all(
      targets.map((u) =>
        updateDoc(doc(db, "users", u.id), {
          notifications: (u.notifications || []).map((n) =>
            n.id === notifId ? { ...n, pending: false, decision } : n
          ),
        })
      )
    );
  }

  // Accept/Deny handler for pending transfer
  const handlePendingAction = async (accept) => {
    if (!localGear || !localGear.pendingTransfer) return;
    setPendingAction(true);
    const gearRef = doc(db, "gear", localGear.id);
    const gearSnap = await getDoc(gearRef);
    const gearData = gearSnap.data();
    const currentUser = auth.currentUser;
    let activity = Array.isArray(gearData.activity) ? gearData.activity : [];
    const pending = gearData.pendingTransfer;

    if (accept) {
      await updateDoc(gearRef, {
        assignedTo: pending.to.userId,
        assignedProject: pending.to.projectId || "",
        pendingTransfer: null,
        activity: [
          ...activity,
          {
            type: "transfer-accepted",
            date: new Date().toISOString(),
            from: {
              assignedTo: pending.from.userId,
              assignedProject: pending.from.projectId,
            },
            to: {
              assignedTo: pending.to.userId,
              assignedProject: pending.to.projectId,
            },
            by: currentUser.uid,
          },
        ],
      });
      if (pending.notifId) {
        await updateNotificationStatus(
          pending.notifId,
          "accepted"
        );
      }
    } else {
      await updateDoc(gearRef, {
        pendingTransfer: null,
        activity: [
          ...activity,
          {
            type: "transfer-denied",
            date: new Date().toISOString(),
            from: {
              assignedTo: pending.from.userId,
              assignedProject: pending.from.projectId,
            },
            to: {
              assignedTo: pending.to.userId,
              assignedProject: pending.to.projectId,
            },
            by: currentUser.uid,
          },
        ],
      });
      if (pending.notifId) {
        await updateNotificationStatus(
          pending.notifId,
          "denied"
        );
      }
    }

    // Refresh gear doc in local state for instant UI update
    const updatedSnap = await getDoc(doc(db, "gear", localGear.id));
    setLocalGear({ ...updatedSnap.data(), id: localGear.id });

    setPendingHandled(true);
    setPendingAction(false);
  };

  // Who can accept/deny?
  const canApprove =
    localGear.pendingTransfer &&
    (
      ["admin", "manager"].includes(
        team.find((u) => u.id === auth.currentUser?.uid)?.role
      ) ||
      localGear.pendingTransfer.to.userId === auth.currentUser?.uid
    );

  // Admin check for delete activity
  const isAdmin =
    team.find((u) => u.id === auth.currentUser?.uid)?.role === "admin";
  const handleDeleteActivity = async (idx) => {
    const gearRef = doc(db, "gear", localGear.id);
    let newActivity = [...(localGear.activity || [])];
    // Because we reverse when displaying, must compute true index
    newActivity.splice(localGear.activity.length - 1 - idx, 1);
    await updateDoc(gearRef, { activity: newActivity });

    // Refresh local state
    const updatedSnap = await getDoc(doc(db, "gear", localGear.id));
    setLocalGear({ ...updatedSnap.data(), id: localGear.id });
  };

  if (!localGear) {
    return (
      <div className="flex flex-col items-center p-8 text-gray-500">
        <button
          className="mb-4 text-blue-600 hover:underline flex items-center"
          onClick={() => setCurrentPage("gear")}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Gear
        </button>
        Gear not found.
      </div>
    );
  }

  const assignedUser = team.find((u) => u.id === localGear.assignedTo);
  const assignedProject = projects.find((p) => p.id === localGear.assignedProject);

  return (
    <div className="w-full min-h-[90vh] flex flex-col items-center px-2 py-8 bg-[#f8fafd]">
      <div className="w-full max-w-none bg-white rounded-xl shadow-xl p-8 md:px-16 relative">
        {/* Top: Back + Transfer Equipment button */}
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-blue-600 flex items-center hover:underline"
            onClick={() => setCurrentPage("gear")}
          >
            <ArrowLeft size={20} className="mr-1" />
            Back
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-semibold flex items-center"
            onClick={() => setShowTransferModal(true)}
          >
            <Repeat size={18} className="mr-2" />
            Transfer Equipment
          </button>
        </div>

        {/* IMAGE + INFO ROW */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
          <img
            src={localGear.imageUrl || "/gear-placeholder.png"}
            alt={localGear.name}
            className="w-32 h-32 object-cover rounded-2xl bg-gray-100 border flex-shrink-0"
          />
          <div className="flex-1 flex flex-col gap-1 items-center md:items-start">
            <div className="text-2xl md:text-3xl font-bold mb-1">
              {localGear.name}
            </div>
            <div className="flex gap-2 flex-wrap mb-1">
              {localGear.category && (
                <span className="bg-blue-100 text-blue-700 rounded-xl px-3 py-1 text-xs font-medium">
                  {localGear.category}
                </span>
              )}
              {localGear.status && (
                <span className="bg-gray-100 text-gray-700 rounded-xl px-3 py-1 text-xs font-medium">
                  {localGear.status}
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:gap-12 gap-1 w-full mt-1 text-sm md:text-base">
              <div>
                <span className="font-semibold text-gray-700">
                  Assigned To:{" "}
                </span>
                <span className="text-gray-800">
                  {assignedUser
                    ? assignedUser.name || assignedUser.email
                    : <span className="text-gray-400">—</span>}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Project: </span>
                <span className="text-gray-800">
                  {assignedProject
                    ? assignedProject.name
                    : <span className="text-gray-400">—</span>}
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:gap-12 gap-1 w-full text-sm md:text-base">
              <div>
                <span className="font-semibold text-gray-700">
                  Serial #:{" "}
                </span>
                <span className="text-gray-800">
                  {localGear.serialNumber || (
                    <span className="text-gray-400">—</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- PENDING TRANSFER NOTICE --- */}
        {localGear.pendingTransfer && !pendingHandled && (
          <div className="mb-4 p-4 rounded-xl bg-yellow-50 border border-yellow-300 flex flex-col md:flex-row items-center md:gap-3 gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-500" />
              <span className="font-bold text-yellow-800">
                Transfer Pending Acceptance
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-yellow-700">
                <div>
                  <b>To:</b>{" "}
                  <span className="font-semibold">
                    {displayUser(localGear.pendingTransfer.to.userId)}
                  </span>
                  {localGear.pendingTransfer.to.projectId && (
                    <>
                      {" "}
                      (<b>Project:</b>{" "}
                      <span className="font-semibold">
                        {displayProject(localGear.pendingTransfer.to.projectId)}
                      </span>
                      )
                    </>
                  )}
                </div>
                <div>
                  <b>From:</b>{" "}
                  <span className="font-semibold">
                    {displayUser(localGear.pendingTransfer.from.userId)}
                  </span>
                  {localGear.pendingTransfer.from.projectId && (
                    <>
                      {" "}
                      (<b>Project:</b>{" "}
                      <span className="font-semibold">
                        {displayProject(localGear.pendingTransfer.from.projectId)}
                      </span>
                      )
                    </>
                  )}
                </div>
                <div>
                  <span className="text-xs">
                    Requested:{" "}
                    {new Date(localGear.pendingTransfer.date).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {canApprove && !pendingHandled && (
              <div className="flex gap-2 mt-2 md:mt-0">
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  onClick={() => handlePendingAction(true)}
                  disabled={pendingAction}
                >
                  Accept
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  onClick={() => handlePendingAction(false)}
                  disabled={pendingAction}
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- TABS --- */}
        <div className="flex border-b mb-4">
          {TAB_LIST.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "flex-1 px-4 py-2 flex items-center justify-center gap-2 font-semibold " +
                (tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-blue-600")
              }
              style={{ minWidth: 80 }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* --- TAB CONTENT --- */}
        <div>
          {tab === "overview" && (
            <div className="px-2 py-2 text-gray-700">
              <div><span className="font-medium">Name:</span> {localGear.name}</div>
              <div><span className="font-medium">Serial #:</span> {localGear.serialNumber || <span className="text-gray-400">—</span>}</div>
              <div><span className="font-medium">Category:</span> {localGear.category}</div>
              <div><span className="font-medium">Status:</span> {localGear.status}</div>
              <div><span className="font-medium">Notes:</span> {localGear.notes || <span className="text-gray-400">—</span>}</div>
              <div><span className="font-medium">Date Added:</span> {localGear.dateAdded ? new Date(localGear.dateAdded).toLocaleDateString() : <span className="text-gray-400">—</span>}</div>
            </div>
          )}
          {tab === "activity" && (
            <div className="px-2 py-2 text-gray-700">
              {(!localGear.activity || localGear.activity.length === 0) ? (
                <div className="text-gray-400">No activity yet.</div>
              ) : (
                <ul className="space-y-3">
                  {localGear.activity.slice().reverse().map((act, i) => {
                    const showTrash = isAdmin;
                    if (["transfer-accepted", "transfer-denied"].includes(act.type)) {
                      return (
                        <li key={i} className="bg-blue-50 rounded px-4 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-bold capitalize mb-1">
                              Transfer {act.type === "transfer-accepted" ? "Accepted" : "Denied"} — {act.date ? new Date(act.date).toLocaleString() : ""}
                            </div>
                            {showTrash && (
                              <button
                                className="text-red-500 hover:text-red-700 ml-3"
                                title="Delete Activity"
                                onClick={() => handleDeleteActivity(i)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <div>
                            <b>From:</b> {displayUser(act.from?.assignedTo)}
                            {act.from?.assignedProject && (
                              <> (<b>Project:</b> {displayProject(act.from.assignedProject)})</>
                            )}
                          </div>
                          <div>
                            <b>To:</b> {displayUser(act.to?.assignedTo)}
                            {act.to?.assignedProject && (
                              <> (<b>Project:</b> {displayProject(act.to.assignedProject)})</>
                            )}
                          </div>
                          <div>
                            <b>{act.type === "transfer-accepted" ? "Accepted" : "Denied"} by:</b> {displayUser(act.by)}
                          </div>
                        </li>
                      );
                    }
                    if (act.type === "transfer") {
                      return (
                        <li key={i} className="bg-blue-50 rounded px-4 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-bold mb-1">
                              Transfer — {act.date ? new Date(act.date).toLocaleString() : ""}
                            </div>
                            {showTrash && (
                              <button
                                className="text-red-500 hover:text-red-700 ml-3"
                                title="Delete Activity"
                                onClick={() => handleDeleteActivity(i)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <div>
                            <b>From:</b> {displayUser(act.from?.assignedTo)}
                            {act.from?.assignedProject && (
                              <> (<b>Project:</b> {displayProject(act.from.assignedProject)})</>
                            )}
                          </div>
                          <div>
                            <b>To:</b> {displayUser(act.to?.assignedTo)}
                            {act.to?.assignedProject && (
                              <> (<b>Project:</b> {displayProject(act.to.assignedProject)})</>
                            )}
                          </div>
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>
              )}
            </div>
          )}
          {tab === "documents" && (
            <div className="px-2 py-2 text-gray-500">
              <div className="text-sm">No documents uploaded.</div>
            </div>
          )}
          {tab === "images" && (
            <div className="px-2 py-2 flex flex-wrap gap-3">
              {localGear.imageUrl ? (
                <img
                  src={localGear.imageUrl}
                  alt={localGear.name}
                  className="w-28 h-28 object-cover rounded-xl border"
                />
              ) : (
                <div className="text-sm text-gray-400">No images uploaded.</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Transfer Equipment Modal */}
      {showTransferModal && (
        <TransferEquipmentModal
          gearList={[localGear]}
          team={team}
          projects={projects}
          onClose={() => setShowTransferModal(false)}
          onTransfer={async (gearId, newAssignedTo, newProject) => {
            await handleGearTransfer(gearId, newAssignedTo, newProject);
            const updatedSnap = await getDoc(doc(db, "gear", localGear.id));
            setLocalGear({ ...updatedSnap.data(), id: localGear.id });
            setShowTransferModal(false);
          }}
        />
      )}
    </div>
  );
}
