import React, { useEffect, useState } from "react";
import {
  FileText,
  ClipboardList,
  Folder,
  Users,
  Star,
  UserPlus,
  HardHat,
  File,
  Activity,
  Repeat,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

export default function Dashboard({
  setCurrentPage,
  openAddProject,
  openInviteMember,
  openAddGear,
  openTransferEquipment,
}) {
  const [stats, setStats] = useState({
    templates: 0,
    inspections: 0,
    projects: 0,
    team: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const templatesSnap = await getDocs(collection(db, "templates"));
      const inspectionsSnap = await getDocs(
        query(collection(db, "inspections"), where("status", "==", "completed"))
      );
      const projectsSnap = await getDocs(
        query(collection(db, "projects"), where("archived", "==", false))
      );
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("active", "==", true))
      );
      setStats({
        templates: templatesSnap.size,
        inspections: inspectionsSnap.size,
        projects: projectsSnap.size,
        team: usersSnap.size,
      });
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchRecent() {
      let activityList = [];
      const gearSnap = await getDocs(
        query(collection(db, "gear"), orderBy("dateAdded", "desc"), limit(3))
      );
      gearSnap.forEach((doc) => {
        const g = doc.data();
        activityList.push({
          type: "gear",
          text: `Equipment added: ${g.name}`,
          date: g.dateAdded,
          icon: <HardHat size={16} className="text-green-600" />,
        });
      });
      const usersSnap = await getDocs(
        query(collection(db, "users"), orderBy("createdAt", "desc"), limit(2))
      );
      usersSnap.forEach((doc) => {
        const u = doc.data();
        if (u.createdAt) {
          activityList.push({
            type: "team",
            text: `New team member: ${u.name}`,
            date: u.createdAt,
            icon: <UserPlus size={16} className="text-orange-500" />,
          });
        }
      });
      const inspSnap = await getDocs(
        query(
          collection(db, "inspections"),
          where("status", "==", "completed"),
          orderBy("completedAt", "desc"),
          limit(2)
        )
      );
      inspSnap.forEach((doc) => {
        const i = doc.data();
        activityList.push({
          type: "inspection",
          text: `Inspection completed by ${i.completedBy || "Someone"}`,
          date: i.completedAt,
          icon: <Star size={16} className="text-blue-600" />,
        });
      });
      const docSnap = await getDocs(
        query(collection(db, "documents"), orderBy("uploadedAt", "desc"), limit(2))
      );
      docSnap.forEach((doc) => {
        const d = doc.data();
        activityList.push({
          type: "document",
          text: `New document: ${d.name}`,
          date: d.uploadedAt,
          icon: <File size={16} className="text-gray-600" />,
        });
      });
      const projectsSnap = await getDocs(
        query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(2))
      );
      projectsSnap.forEach((doc) => {
        const p = doc.data();
        if (p.createdAt) {
          activityList.push({
            type: "project",
            text: `Project added: ${p.name}`,
            date: p.createdAt,
            icon: <Folder size={16} className="text-purple-600" />,
          });
        }
      });
      activityList = activityList
        .filter((a) => !!a.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7);
      setRecent(activityList);
      setLoading(false);
    }
    fetchRecent();
  }, []);

  function timeAgo(date) {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return d.toLocaleDateString();
  }

  const statCards = [
    {
      label: "Templates",
      count: stats.templates,
      icon: <FileText size={28} className="text-blue-600" />,
      action: () => setCurrentPage && setCurrentPage("templates"),
      color: "bg-blue-50 hover:bg-blue-100",
    },
    {
      label: "Completed Inspections",
      count: stats.inspections,
      icon: <ClipboardList size={28} className="text-green-600" />,
      action: () => setCurrentPage && setCurrentPage("completedInspections"),
      color: "bg-green-50 hover:bg-green-100",
    },
    {
      label: "Projects",
      count: stats.projects,
      icon: <Folder size={28} className="text-purple-600" />,
      action: () => setCurrentPage && setCurrentPage("projects"),
      color: "bg-purple-50 hover:bg-purple-100",
    },
    {
      label: "Team Members",
      count: stats.team,
      icon: <Users size={28} className="text-orange-600" />,
      action: () => setCurrentPage && setCurrentPage("team"),
      color: "bg-orange-50 hover:bg-orange-100",
    },
  ];

  // Single quickActions definition!
  const quickActions = [
    {
      label: "New Inspection",
      icon: <ClipboardList size={18} className="text-blue-600" />,
      onClick: null, // Disabled for now
      disabled: true,
    },
    {
      label: "Add Project",
      icon: <Folder size={18} className="text-purple-600" />,
      onClick: openAddProject,
    },
    {
      label: "Invite Member",
      icon: <UserPlus size={18} className="text-orange-600" />,
      onClick: openInviteMember,
    },
    {
      label: "Add Gear",
      icon: <HardHat size={18} className="text-green-600" />,
      onClick: openAddGear,
    },
    {
      label: "Transfer Equipment",
      icon: <Repeat size={18} className="text-green-700" />,
      onClick: openTransferEquipment,
    },
  ];

  return (
    <div className="dashboard-root bg-gradient-to-tr from-blue-50 via-white to-cyan-50 min-h-screen px-2 py-6 md:px-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Welcome/Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 flex items-center gap-3">
            Welcome to your Dashboard
          </h1>
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {statCards.map((card) => (
            <button
              key={card.label}
              className={`rounded-2xl shadow-md ${card.color} flex flex-col items-center py-7 px-3 cursor-pointer transition-transform hover:scale-[1.04] group border-2 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none`}
              onClick={card.action}
              tabIndex={0}
              type="button"
              aria-label={`Go to ${card.label}`}
            >
              <div className="mb-2">{card.icon}</div>
              <div className="text-3xl font-bold text-gray-900">{card.count}</div>
              <div className="text-md font-semibold text-gray-500 mt-1">{card.label}</div>
            </button>
          ))}
        </div>
        {/* Quick Actions - centered */}
        <div className="gap-3 mb-10 justify-center hidden">
          {quickActions.map((act) => (
            <button
              key={act.label}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm font-semibold transition hover:bg-blue-50 focus:ring-2 focus:ring-blue-200 outline-none ${
                act.disabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={act.onClick}
              type="button"
              aria-label={act.label}
              disabled={act.disabled}
            >
              {act.icon}
              {act.label}
            </button>
          ))}
        </div>
        {/* Recent Activity: full width */}
        <div className="w-full mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 min-h-[350px]">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Activity size={22} className="text-blue-600" />
              Recent Activity
            </h2>
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="text-gray-400">No recent activity</div>
            ) : (
              <ul className="divide-y divide-blue-50">
                {recent.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <div>{item.icon}</div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-medium">{item.text}</span>
                      <div className="text-xs text-gray-400">{timeAgo(item.date)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
