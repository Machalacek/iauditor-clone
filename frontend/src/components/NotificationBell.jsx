// src/components/NotificationBell.jsx

import React, { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { db, auth } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { useNotificationStore } from "../store/notificationStore";
import { useTeamStore } from "../store/teamStore";
import { useProjectStore } from "../store/projectStore";

export default function NotificationBell() {
  const { notifications, setNotifications } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [banner, setBanner] = useState("");


  const bellBtnRef = useRef(null);
  const menuRef = useRef(null);

  const { team } = useTeamStore();
  const { projects } = useProjectStore();

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

  // Listen to notifications (and user profile/role)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const d = snap.data();
      setUserProfile({ ...d, uid: user.uid });
      setNotifications(d?.notifications || []);
    });
    return () => unsub && unsub();
  }, [setNotifications]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        bellBtnRef.current &&
        !bellBtnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Listen for global toast events from pages (e.g., ProjectDetail)
  useEffect(() => {
    let timer = null;
    function handleToast(e) {
      const msg = e?.detail || "";
      if (!msg) return;
      setBanner(msg);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setBanner(""), 3000);
    }
    window.addEventListener("app:toast", handleToast);
    return () => {
      window.removeEventListener("app:toast", handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Mark all as read (remove 'pending' state)
  const markAllRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      notifications: notifications.map((n) => ({ ...n, pending: false })),
    });
  };

  // Accept transfer handler
  const handleAccept = async (notif) => {
    const user = auth.currentUser;
    if (!user) return;

    const gearRef = doc(db, "gear", notif.gearId);
    const gearSnap = await getDoc(gearRef);
    const gearData = gearSnap.data();

    // Always use fallback for undefined fields
    const fromProjectId = notif.fromProjectId || "";
    const toProjectId = notif.toProjectId || "";

    // Update assignment, clear pendingTransfer, add to activity
    await updateDoc(gearRef, {
      assignedTo: notif.toUserId,
      assignedProject: toProjectId,
      pendingTransfer: null,
      activity: [
        ...(Array.isArray(gearData.activity) ? gearData.activity : []),
        {
          type: "transfer-accepted",
          date: new Date().toISOString(),
          from: {
            assignedTo: notif.fromUserId || "",
            assignedProject: fromProjectId,
          },
          to: {
            assignedTo: notif.toUserId || "",
            assignedProject: toProjectId,
          },
          by: user.uid,
        },
      ],
    });

    await updateNotificationStatus(notif, "accepted");
  };

  // Deny transfer handler
  const handleDeny = async (notif) => {
    const user = auth.currentUser;
    if (!user) return;

    const gearRef = doc(db, "gear", notif.gearId);
    const gearSnap = await getDoc(gearRef);
    const gearData = gearSnap.data();

    const fromProjectId = notif.fromProjectId || "";
    const toProjectId = notif.toProjectId || "";

    // Just clear pendingTransfer, do not reassign
    await updateDoc(gearRef, {
      pendingTransfer: null,
      activity: [
        ...(Array.isArray(gearData.activity) ? gearData.activity : []),
        {
          type: "transfer-denied",
          date: new Date().toISOString(),
          from: {
            assignedTo: notif.fromUserId || "",
            assignedProject: fromProjectId,
          },
          to: {
            assignedTo: notif.toUserId || "",
            assignedProject: toProjectId,
          },
          by: user.uid,
        },
      ],
    });

    await updateNotificationStatus(notif, "denied");
  };

  // Helper: update notification for all recipients
  const updateNotificationStatus = async (notif, decision) => {
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const targets = users.filter((u) =>
      (u.notifications || []).some((n) => n.id === notif.id)
    );
    await Promise.all(
      targets.map((u) =>
        updateDoc(doc(db, "users", u.id), {
          notifications: (u.notifications || []).map((n) =>
            n.id === notif.id ? { ...n, pending: false, decision } : n
          ),
        })
      )
    );
  };

  return (
    <div className="relative">
      {banner && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="px-4 py-1.5 rounded-md shadow bg-green-500 text-white text-sm font-semibold">
            {banner}
          </div>
        </div>
      )}
      <button
        ref={bellBtnRef}
        className="p-2 rounded-full hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={22} />
        {notifications.some((n) => n.pending) && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-lg p-4 z-50 max-h-96 overflow-y-auto text-gray-900"
          style={{ color: "#222" }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-lg">Notifications</span>
            <button className="text-xs text-blue-500" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          {notifications.length === 0 && (
            <div className="text-gray-400 text-sm py-4">No notifications.</div>
          )}
          {notifications.slice().reverse().map((notif) => {
            const canAct =
              notif.pending &&
              (userProfile?.role === "admin" ||
                userProfile?.role === "manager" ||
                userProfile?.uid === notif.toUserId);

            // Format transfer notification nicely:
            let notifMsg = "";
            if (notif.type === "gear-transfer-request") {
              notifMsg = (
                <>
                  Transfer requested: <b>{notif.gearName}</b>
                  {" from "}
                  <b>{displayUser(notif.fromUserId)}</b>
                  {notif.fromProjectId && (
                    <> (<b>{displayProject(notif.fromProjectId)}</b>)</>
                  )}
                  {" to "}
                  <b>{displayUser(notif.toUserId)}</b>
                  {notif.toProjectId && (
                    <> (<b>{displayProject(notif.toProjectId)}</b>)</>
                  )}
                </>
              );
            } else {
              notifMsg = notif.message;
            }

            return (
              <div
                key={notif.id}
                className={`mb-3 p-2 rounded ${
                  notif.pending ? "bg-yellow-50" : "bg-gray-50"
                }`}
              >
                <div className="font-medium">{notifMsg}</div>
                <div className="text-xs text-gray-500">
                  {new Date(notif.requestedAt).toLocaleString()}
                </div>
                {notif.pending && canAct && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      onClick={() => handleAccept(notif)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-700 text-xs"
                      onClick={() => handleDeny(notif)}
                    >
                      Deny
                    </button>
                  </div>
                )}
                {!notif.pending && notif.decision && (
                  <div
                    className={`mt-2 text-xs font-bold ${
                      notif.decision === "accepted"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {notif.decision === "accepted" ? "Accepted" : "Denied"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
