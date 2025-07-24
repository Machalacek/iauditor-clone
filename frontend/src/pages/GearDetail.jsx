// src/pages/GearDetail.jsx

import React, { useState } from "react";
import { ArrowLeft, ClipboardList, FileText, Image as ImageIcon, File, AlertTriangle } from "lucide-react";
import { useTeamStore } from "../store/teamStore";
import { useProjectStore } from "../store/projectStore";

const TAB_LIST = [
  { label: "Overview", key: "overview", icon: <ClipboardList size={18} /> },
  { label: "Activity", key: "activity", icon: <FileText size={18} /> },
  { label: "Documents", key: "documents", icon: <File size={18} /> },
  { label: "Images", key: "images", icon: <ImageIcon size={18} /> },
];

export default function GearDetail({ gear, setCurrentPage }) {
  const { team } = useTeamStore();
  const { projects } = useProjectStore();
  const [tab, setTab] = useState("overview");

  if (!gear) {
    return (
      <div className="flex flex-col items-center p-8 text-gray-500">
        <button
          className="mb-4 text-blue-600 hover:underline flex items-center"
          onClick={() => setCurrentPage('gear')}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Gear
        </button>
        Gear not found.
      </div>
    );
  }

  const assignedUser = team.find((u) => u.id === gear.assignedTo);
  const assignedProject = projects.find((p) => p.id === gear.assignedProject);
  const activity = gear.activity || [];
  const pending = gear.pendingTransfer;

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

  return (
    <div className="w-full min-h-[90vh] flex flex-col items-center px-2 py-8 bg-[#f8fafd]">
      <div className="w-full max-w-none bg-white rounded-xl shadow-xl p-8 md:px-16 relative">
        {/* Back Button */}
        <div className="mb-4">
          <button
            className="text-blue-600 flex items-center hover:underline"
            onClick={() => setCurrentPage('gear')}
          >
            <ArrowLeft size={20} className="mr-1" />
            Back
          </button>
        </div>

        {/* --- EDIT BUTTON top-right --- */}
        {/* 
        <div className="absolute top-8 right-8">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-1"
            onClick={() => setShowEditModal(true)}
          >
            <Pencil size={16} className="mr-1" />
            Edit
          </button>
        </div>
        */}

        {/* IMAGE + INFO ROW */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
          <img
            src={gear.imageUrl || "/gear-placeholder.png"}
            alt={gear.name}
            className="w-32 h-32 object-cover rounded-2xl bg-gray-100 border flex-shrink-0"
          />
          <div className="flex-1 flex flex-col gap-1 items-center md:items-start">
            <div className="text-2xl md:text-3xl font-bold mb-1">{gear.name}</div>
            <div className="flex gap-2 flex-wrap mb-1">
              {gear.category && (
                <span className="bg-blue-100 text-blue-700 rounded-xl px-3 py-1 text-xs font-medium">
                  {gear.category}
                </span>
              )}
              {gear.status && (
                <span className="bg-gray-100 text-gray-700 rounded-xl px-3 py-1 text-xs font-medium">
                  {gear.status}
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:gap-12 gap-1 w-full mt-1 text-sm md:text-base">
              <div>
                <span className="font-semibold text-gray-700">Assigned To: </span>
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
                <span className="font-semibold text-gray-700">Serial #: </span>
                <span className="text-gray-800">{gear.serialNumber || <span className="text-gray-400">—</span>}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- PENDING TRANSFER NOTICE --- */}
        {pending && (
          <div className="mb-4 p-4 rounded-xl bg-yellow-50 border border-yellow-300 flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-500" />
            <div>
              <div className="font-bold text-yellow-800">Transfer Pending Acceptance</div>
              <div className="text-sm text-yellow-700">
                To: <span className="font-semibold">{displayUser(pending.to.userId)}</span>
                {pending.to.projectId && (
                  <> &nbsp; (Project: <span className="font-semibold">{displayProject(pending.to.projectId)}</span>)</>
                )}
                <br />
                From: <span className="font-semibold">{displayUser(pending.from.userId)}</span>
                {pending.from.projectId && (
                  <> &nbsp; (Project: <span className="font-semibold">{displayProject(pending.from.projectId)}</span>)</>
                )}
                <br />
                <span className="text-xs">Requested: {new Date(pending.date).toLocaleString()}</span>
              </div>
            </div>
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
              <div><span className="font-medium">Name:</span> {gear.name}</div>
              <div><span className="font-medium">Serial #:</span> {gear.serialNumber || <span className="text-gray-400">—</span>}</div>
              <div><span className="font-medium">Category:</span> {gear.category}</div>
              <div><span className="font-medium">Status:</span> {gear.status}</div>
              <div><span className="font-medium">Notes:</span> {gear.notes || <span className="text-gray-400">—</span>}</div>
              <div><span className="font-medium">Date Added:</span> {gear.dateAdded ? new Date(gear.dateAdded).toLocaleDateString() : <span className="text-gray-400">—</span>}</div>
            </div>
          )}
          {tab === "activity" && (
            <div className="px-2 py-2 text-gray-700">
              {(!activity || activity.length === 0) && (
                <div className="text-gray-400">No activity yet.</div>
              )}
              {activity && activity.length > 0 && (
                <ul className="space-y-3">
                  {activity.slice().reverse().map((act, i) => (
                    <li key={i} className="bg-blue-50 rounded px-4 py-2 text-sm">
                      <div>
                        <b>{act.type === "transfer" ? "Transfer" : act.type}</b> —{" "}
                        {act.date ? new Date(act.date).toLocaleString() : ""}
                      </div>
                      {act.type === "transfer" && (
                        <>
                          <div>
                            From: {displayUser(act.from?.assignedTo)}
                          </div>
                          <div>
                            To: {displayUser(act.to?.assignedTo)}
                          </div>
                          <div>
                            Project: {displayProject(act.to?.assignedProject)}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
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
              {gear.imageUrl ? (
                <img
                  src={gear.imageUrl}
                  alt={gear.name}
                  className="w-28 h-28 object-cover rounded-xl border"
                />
              ) : (
                <div className="text-sm text-gray-400">No images uploaded.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
