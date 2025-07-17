import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import { MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';

const ROLES = ['user', 'manager', 'admin'];

export default function Team() {
  const [showModal, setShowModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('user');
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [menuOpenHeader, setMenuOpenHeader] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'user',
    team: '',
  });

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setCurrentUserRole(snap.data().role || 'user');
      }
    };

    const fetchTeam = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamMembers(data);
      setLoading(false);
    };

    fetchCurrentUserRole();
    fetchTeam();
  }, []);

  useEffect(() => {
    let result = [...teamMembers];

    if (search) {
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((m) => m.role === roleFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy]?.toLowerCase?.() || '';
      const bVal = b[sortBy]?.toLowerCase?.() || '';
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    setFilteredMembers(result);
  }, [teamMembers, search, roleFilter, sortBy, sortAsc]);

  const handleUpdate = async (userId, field, value) => {
    setUpdatingId(userId);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { [field]: value });
    setTeamMembers(prev =>
      prev.map(u => (u.id === userId ? { ...u, [field]: value } : u))
    );
    setUpdatingId(null);
  };

  const toggleActiveStatus = async (userId, currentStatus) => {
    await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
    setTeamMembers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, active: !currentStatus } : u
      )
    );
    setMenuOpenFor(null);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();

    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...inviteForm,
        active: true,
      });
      setTeamMembers((prev) => [
        ...prev,
        { id: docRef.id, ...inviteForm, active: true },
      ]);
      setInviteForm({ name: '', email: '', role: 'user', team: '' });
      setShowModal(false);
    } catch (err) {
      console.error('Error adding user:', err);
      alert('Failed to invite user.');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const renderStatus = (active) => (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {active ? 'Active' : 'Deactivated'}
    </span>
  );

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Team', 'Status'],
      ...teamMembers.map((m) => [
        m.name,
        m.email,
        m.role,
        m.team,
        m.active !== false ? 'Active' : 'Deactivated',
      ]),
    ]
      .map(row => row.map(item => `"${item}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_members.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">TEAMS</h1>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm"
                onClick={() => alert('Redirect to manage invites')}
              >
                Manage invites
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                + Add Member
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpenHeader(!menuOpenHeader)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <MoreVertical size={20} />
                </button>
                {menuOpenHeader && (
                  <div className="absolute right-0 top-10 bg-white border rounded shadow-md z-10 w-48">
                    <button
                      onClick={handleExportCSV}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Export Team Members as CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 my-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full sm:w-1/2"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border px-3 py-2 rounded w-full sm:w-40"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-gray-500">Loading team members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-gray-400">No team members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border mt-4 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {['name', 'email', 'role'].map((col) => (
                    <th
                      key={col}
                      className="p-2 border cursor-pointer select-none"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1 capitalize">
                        {col}
                        {sortBy === col ? (
                          sortAsc ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        ) : null}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 border">Team</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-t">
                    <td className="p-2 border">{member.name || '—'}</td>
                    <td className="p-2 border">{member.email}</td>
                    <td className="p-2 border">
                      {canEdit ? (
                        <select
                          value={member.role || 'user'}
                          onChange={(e) =>
                            handleUpdate(member.id, 'role', e.target.value)
                          }
                          className="border px-2 py-1 rounded"
                          disabled={updatingId === member.id}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="capitalize">
                          {member.role || 'user'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 border">
                      {canEdit ? (
                        <input
                          type="text"
                          value={member.team || ''}
                          onChange={(e) =>
                            handleUpdate(member.id, 'team', e.target.value)
                          }
                          className="border px-2 py-1 rounded w-full"
                          disabled={updatingId === member.id}
                        />
                      ) : (
                        member.team || '—'
                      )}
                    </td>
                    <td className="p-2 border">{renderStatus(member.active !== false)}</td>
                    <td className="p-2 border text-center relative">
                      {canEdit && (
                        <div className="inline-block relative">
                          <button
                            onClick={() =>
                              setMenuOpenFor(
                                menuOpenFor === member.id ? null : member.id
                              )
                            }
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {menuOpenFor === member.id && (
                            <div className="absolute right-0 top-6 bg-white border rounded shadow-md z-10 w-40">
                              <button
                                onClick={() =>
                                  toggleActiveStatus(
                                    member.id,
                                    member.active !== false
                                  )
                                }
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              >
                                {member.active !== false
                                  ? 'Deactivate User'
                                  : 'Activate User'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
                required
              />
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, role: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Team"
                value={inviteForm.team}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, team: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
