import React, { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { ArchiveRestore } from 'lucide-react';

export default function ArchivedProjects({ onBack }) {
  const { projects, fetchProjects, archiveProject, loading } = useProjectStore();
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <div className="p-6 w-full">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Archived Projects
          </h1>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
            <button
              onClick={onBack}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm"
            >
              Back to Active Projects
            </button>
          </div>
        </div>
      </div>

      {/* Archived List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading projects…</div>
        ) : projects.filter(p => p.archived).length === 0 ? (
          <div className="text-gray-400">No archived projects found.</div>
        ) : (
          projects.filter(p => p.archived).map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl shadow p-4 border-l-4 border-gray-400 opacity-60 flex items-center justify-between"
            >
              <span className="text-gray-800 font-medium text-lg line-through">
                {project.name}
              </span>
              <button
                title="Restore"
                onClick={() => archiveProject(project.id, false)}
                className="p-1 hover:bg-gray-100 rounded ml-4"
              >
                <ArchiveRestore size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
