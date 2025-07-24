// src/pages/Projects.js
import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { PlusIcon, Settings, X as XIcon, Pencil, Trash, ArchiveRestore } from 'lucide-react';


export default function Projects({ onShowArchived }) {
  const { projects, fetchProjects, addProject, renameProject, deleteProject, archiveProject, loading } = useProjectStore();
  const [newProject, setNewProject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // UI state
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (newProject.trim()) {
      await addProject(newProject.trim());
      setNewProject('');
      setShowModal(false);
    }
  };

  const handleRenameProject = async (id) => {
    if (editValue.trim() && id) {
      await renameProject(id, editValue.trim());
      setEditId(null);
      setEditValue('');
    }
  };

  const handleDeleteProject = async () => {
    if (deleteId) {
      await deleteProject(deleteId);
      setDeleteId(null);
    }
  };

  // CSV Export
  const exportCSV = () => {
    const rows = [
      ['Name', 'Archived'],
      ...projects.map((p) => [p.name, p.archived ? 'Yes' : 'No']),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.csv';
    a.click();
  };

  return (
    <div className="p-6 w-full" onClick={() => setMenuOpen(false)}>
      {/* Header & actions */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Projects
          </h1>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end mt-2 md:mt-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={onShowArchived}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm"
            >
              Archived Projects
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Add Project
            </button>
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(m => !m);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Settings size={20} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 bg-white border rounded shadow z-10 w-48"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={exportCSV}
                    className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <XIcon size={16} className="mr-2 text-gray-600" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading projects…</div>
        ) : projects.filter(p => !p.archived).length === 0 ? (
          <div className="text-gray-400">No projects found.</div>
        ) : (
          projects.filter(p => !p.archived).map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-2xl shadow p-4 border-l-4 flex items-center justify-between ${
                project.archived ? 'border-gray-400 opacity-60' : 'border-blue-500'
              }`}
            >
              <div className="flex-1 min-w-0">
                {editId === project.id ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleRenameProject(project.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="border rounded px-2 py-1 w-40"
                      onBlur={() => setEditId(null)}
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <span className={`text-gray-800 font-medium text-lg break-words ${project.archived ? 'line-through' : ''}`}>
                    {project.name}
                  </span>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                {editId !== project.id && (
                  <button
                    title="Rename"
                    onClick={() => {
                      setEditId(project.id);
                      setEditValue(project.name);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Pencil size={18} />
                  </button>
                )}
                <button
                  title={project.archived ? "Restore" : "Archive"}
                  onClick={() => archiveProject(project.id, !project.archived)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ArchiveRestore size={18} className={project.archived ? "text-blue-600" : ""} />
                </button>
                <button
                  title="Delete"
                  onClick={() => setDeleteId(project.id)}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <Trash size={18} className="text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">
              Add New Project
            </h2>
            <form onSubmit={handleAddProject} className="space-y-4">
              <input
                type="text"
                placeholder="Project Name"
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">
              Delete Project
            </h2>
            <p className="mb-4">Are you sure you want to delete this project? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
