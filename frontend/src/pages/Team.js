// src/pages/Team.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import emailjs from 'emailjs-com';
import {
  MoreVertical,
  Settings,
  ChevronUp,
  ChevronDown,
  X as XIcon,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';

const ROLES = ['all', 'user', 'manager', 'admin'];
const STATUSES = ['all', 'active', 'deactivated'];

// format ISO timestamp as DD.MM.YYYY | HH:MM
function formatLastSeen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} | ${hh}:${mi}`;
}

// status badge (green/red)
function renderStatus(active) {
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
        active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {active ? 'Active' : 'Deactivated'}
    </span>
  );
}

// avatar initials
function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function Team() {
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('user');
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'user',
  });

  const canEdit = ['admin', 'manager'].includes(currentUserRole);

  // load user role & members
  useEffect(() => {
    const load = async () => {
      const u = auth.currentUser;
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setCurrentUserRole(snap.data()?.role || 'user');
      }
      const snap = await getDocs(collection(db, 'users'));
      setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  // apply search, filters & sort
  useEffect(() => {
    let res = [...teamMembers];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(
        m =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') {
      res = res.filter(m => m.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      res = res.filter(m =>
        statusFilter === 'active' ? m.active : !m.active
      );
    }
    res.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'active':
          av = a.active ? 1 : 0;
          bv = b.active ? 1 : 0;
          return sortAsc ? av - bv : bv - av;
        case 'lastSeen':
          av = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          bv = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return sortAsc ? av - bv : bv - av;
        case 'role':
          av = a.role.toLowerCase();
          bv = b.role.toLowerCase();
          return sortAsc
            ? av.localeCompare(bv)
            : bv.localeCompare(av);
        case 'name':
        default:
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          return sortAsc
            ? av.localeCompare(bv)
            : bv.localeCompare(av);
      }
    });
    setFilteredMembers(res);
  }, [
    teamMembers,
    search,
    roleFilter,
    statusFilter,
    sortBy,
    sortAsc,
  ]);

  const handleSort = field => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Firestore updates
  const handleUpdate = async (id, field, val) => {
    await updateDoc(doc(db, 'users', id), { [field]: val });
    setTeamMembers(ms =>
      ms.map(m => (m.id === id ? { ...m, [field]: val } : m))
    );
  };
  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, 'users', id), { active: !current });
    setTeamMembers(ms =>
      ms.map(m => (m.id === id ? { ...m, active: !current } : m))
    );
    setMenuOpenFor(null);
  };

  // invite + email
  const handleInvite = async e => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'users'), {
      ...inviteForm,
      active: true,
      lastSeen: null,
    });
    setTeamMembers(ms => [
      ...ms,
      { id: ref.id, ...inviteForm, active: true, lastSeen: null },
    ]);
    try {
      await emailjs.send(
        'YOUR_SERVICE_ID',
        'YOUR_TEMPLATE_ID',
        {
          to_name: inviteForm.name,
          to_email: inviteForm.email,
          role: inviteForm.role,
          login_url: window.location.origin + '/login',
        },
        'YOUR_PUBLIC_KEY'
      );
    } catch (err) {
      console.error('EmailJS error:', err);
    }
    setInviteForm({ name: '', email: '', role: 'user' });
    setShowModal(false);
  };

  // export CSV
  const exportCSV = () => {
    const rows = [
      ['Name', 'Status', 'Last seen', 'Role'],
      ...teamMembers.map(m => [
        m.name,
        m.active ? 'Active' : 'Deactivated',
        m.lastSeen || '—',
        m.role,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'team_members.csv';
    a.click();
  };

  return (
    <div
      className="p-6 w-full"
      onClick={() => {
        setMenuOpenFor(null);
        setFilterOpen(false);
      }}
    >
      {/* Header & actions */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Team Members
          </h1>
          {canEdit && (
            <div
              className="flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => alert('Manage invites')}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm"
              >
                Manage invites
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
              >
                + Add Member
              </button>
              <div className="relative">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setMenuOpenFor(
                      menuOpenFor === 'header' ? null : 'header'
                    );
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Settings size={20} />
                </button>
                {menuOpenFor === 'header' && (
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
          )}
        </div>

        {/* Search, chips & +Add Filter */}
        <div className="relative mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded px-3 py-2 w-full md:w-1/2"
            />

            <div className="flex flex-wrap gap-2">
              {roleFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                  Role:
                  <span className="ml-1 font-semibold">
                    {roleFilter.charAt(0).toUpperCase() +
                      roleFilter.slice(1)}
                  </span>
                  <XIcon
                    size={14}
                    className="ml-2 cursor-pointer text-red-500 hover:text-red-700"
                    onClick={() => setRoleFilter('all')}
                  />
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                  Status:
                  <span className="ml-1 font-semibold">
                    {statusFilter.charAt(0).toUpperCase() +
                      statusFilter.slice(1)}
                  </span>
                  <XIcon
                    size={14}
                    className="ml-2 cursor-pointer text-red-500 hover:text-red-700"
                    onClick={() => setStatusFilter('all')}
                  />
                </span>
              )}
              {(sortBy !== 'name' || !sortAsc) && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                  Name:
                  <span className="ml-1 font-semibold">
                    {sortAsc ? 'A→Z' : 'Z→A'}
                  </span>
                  <XIcon
                    size={14}
                    className="ml-2 cursor-pointer text-red-500 hover:text-red-700"
                    onClick={() => {
                      setSortBy('name');
                      setSortAsc(true);
                    }}
                  />
                </span>
              )}
            </div>

            <div className="relative">
              <button
                className="text-blue-600 text-sm hover:underline"
                onClick={e => {
                  e.stopPropagation();
                  setFilterOpen(open => !open);
                }}
              >
                + Add Filter
              </button>
              {filterOpen && (
                <div
                  className="absolute top-full right-0 mt-1 bg-white border rounded shadow p-4 z-10 w-64"
                  onClick={e => e.stopPropagation()}
                >
                  <label className="block mb-2 text-sm">
                    Role:
                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      className="mt-1 block w-full border rounded px-2 py-1"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block mb-2 text-sm">
                    Status:
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="mt-1 block w-full border rounded px-2 py-1"
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="text-sm">
                    Name Sort:
                    <button
                      onClick={() => handleSort('name')}
                      className="ml-2 px-2 py-1 border rounded"
                    >
                      {sortAsc ? 'A→Z' : 'Z→A'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header Row */}
      <div className="hidden md:grid grid-cols-[3fr_1fr_1fr_1fr_auto] bg-blue-50 px-6 py-3 text-sm font-bold text-blue-800 rounded-2xl mb-2">
        {['name', 'active', 'lastSeen', 'role'].map((field, idx) => {
          const labels = {
            name: 'Name',
            active: 'Status',
            lastSeen: 'Last seen',
            role: 'Role',
          };
          return (
            <div
              key={field}
              className={`flex items-center ${
                idx === 0 ? 'justify-start' : 'justify-center'
              } gap-1 cursor-pointer`}
              onClick={() => handleSort(field)}
            >
              {labels[field]}
              {sortBy === field ? (
                sortAsc ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )
              ) : (
                <>
                  <ChevronUp size={12} className="opacity-20" />
                  <ChevronDown size={12} className="opacity-20" />
                </>
              )}
            </div>
          );
        })}
        <div className="text-center">
          <Settings size={16} />
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading team members…</div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-gray-400">No team members found.</div>
        ) : (
          filteredMembers.map(member => (
            <React.Fragment key={member.id}>
              {/* Mobile Card */}
              <div className="block md:hidden bg-white rounded-2xl shadow p-4 border-l-4 border-blue-500 grid grid-cols-[1fr_auto] gap-y-2">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                      {getInitials(member.name)}
                    </div>
                    <span className="text-gray-800 font-medium">
                      {member.name}
                    </span>
                  </div>
                  <div className="mt-2 text-gray-500 text-sm">
                    {member.email}
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    {canEdit ? (
                      <select
                        className="border px-2 py-1 rounded text-sm"
                        value={member.role}
                        onChange={e =>
                          handleUpdate(member.id, 'role', e.target.value)
                        }
                      >
                        {ROLES.slice(1).map(r => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="capitalize text-sm">
                        {member.role}
                      </div>
                    )}
                    {renderStatus(member.active)}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpenFor(
                        menuOpenFor === member.id ? null : member.id
                      );
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpenFor === member.id && (
                    <div
                      className="absolute right-0 mt-2 bg-white border rounded shadow z-10 w-48"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          navigate(`/profile/${member.id}`);
                          setMenuOpenFor(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <User size={16} className="mr-2 text-gray-600" />
                        View Profile
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => toggleActive(member.id, member.active)}
                          className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          {member.active ? (
                            <UserX size={16} className="mr-2 text-red-500" />
                          ) : (
                            <UserCheck size={16} className="mr-2 text-green-500" />
                          )}
                          {member.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Row */}
              <div className="hidden md:grid grid-cols-[3fr_1fr_1fr_1fr_auto] items-center bg-white rounded-2xl shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <div className="text-gray-800 font-medium">
                      {member.name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="justify-self-center">
                  {renderStatus(member.active)}
                </div>
                <div className="justify-self-center text-sm text-gray-600">
                  {formatLastSeen(member.lastSeen)}
                </div>
                <div className="justify-self-center">
                  {canEdit ? (
                    <select
                      className="border px-2 py-1 rounded text-sm"
                      value={member.role}
                      onChange={e =>
                        handleUpdate(member.id, 'role', e.target.value)
                      }
                    >
                      {ROLES.slice(1).map(r => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="capitalize text-sm">
                      {member.role}
                    </div>
                  )}
                </div>
                <div className="relative text-right">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpenFor(
                        menuOpenFor === member.id ? null : member.id
                      );
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpenFor === member.id && (
                    <div
                      className="absolute right-0 mt-2 bg-white border rounded shadow z-10 w-48"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          navigate(`/profile/${member.id}`);
                          setMenuOpenFor(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <User size={16} className="mr-2 text-gray-600" />
                        View Profile
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => toggleActive(member.id, member.active)}
                          className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          {member.active ? (
                            <UserX size={16} className="mr-2 text-red-500" />
                          ) : (
                            <UserCheck size={16} className="mr-2 text-green-500" />
                          )}
                          {member.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">
              Invite Team Member
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={inviteForm.name}
                onChange={e =>
                  setInviteForm(f => ({ ...f, name: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={inviteForm.email}
                onChange={e =>
                  setInviteForm(f => ({ ...f, email: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
                required
              />
              <select
                value={inviteForm.role}
                onChange={e =>
                  setInviteForm(f => ({ ...f, role: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
              >
                {ROLES.slice(1).map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
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
