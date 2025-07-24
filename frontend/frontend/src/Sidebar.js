// src/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  File,
  ClipboardList,
  Users,
  Folder,
  HardHat,
  UserCircle,
  ShieldCheck,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

export default function Sidebar({ userProfile, setCurrentPage, currentPage, signOut }) {
  const location = useLocation();
  const role = userProfile.role;
  const canAccessBuilder = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';

  return (
    <div
      style={{
        width: 220,
        height: '100vh',
        backgroundColor: '#222',
        color: '#fff',
        padding: '20px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <LayoutDashboard size={40} color="#3b82f6" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            to="/"
            onClick={() => setCurrentPage('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <Home size={18} /> Dashboard
          </Link>
          <Link
            to="/templates"
            onClick={() => setCurrentPage('templates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/templates' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <FileText size={18} /> Templates
          </Link>
          {canAccessBuilder && (
            <Link
              to="/templates/builder"
              onClick={() => setCurrentPage('templateBuilder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 0',
                whiteSpace: 'nowrap',
                color: location.pathname === '/templates/builder' ? '#09f' : '#ccc',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              <File size={18} /> Template Builder
            </Link>
          )}
          <Link
            to="/completed-inspections"
            onClick={() => setCurrentPage('completedInspections')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/completed-inspections' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <ClipboardList size={18} /> Completed Inspections
          </Link>
          <Link
            to="/team"
            onClick={() => setCurrentPage('team')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/team' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <Users size={18} /> Team
          </Link>
          <Link
            to="/projects"
            onClick={() => setCurrentPage('projects')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/projects' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <Folder size={18} /> Projects
          </Link>
          <Link
            to="/gear"
            onClick={() => setCurrentPage('gear')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 0',
              whiteSpace: 'nowrap',
              color: location.pathname === '/gear' ? '#09f' : '#ccc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            <HardHat size={18} /> Gear
          </Link>
          {isAdmin && (
            <Link
              to="/adminPanel"
              onClick={() => setCurrentPage('adminPanel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 0',
                whiteSpace: 'nowrap',
                color: location.pathname === '/adminPanel' ? '#09f' : '#ccc',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              <ShieldCheck size={18} /> Admin
            </Link>
          )}
        </div>
      </div>

      {/* Profile & Log Out */}
      <div style={{ borderTop: '1px solid #444', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Link
          to="/profile"
          onClick={() => setCurrentPage('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 0',
            whiteSpace: 'nowrap',
            color: location.pathname === '/profile' ? '#09f' : '#ccc',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          <UserCircle size={18} /> Profile
        </Link>
        <div
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 0',
            whiteSpace: 'nowrap',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <Settings size={18} /> Log Out
        </div>
      </div>
    </div>
  );
}
