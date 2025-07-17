import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import TemplateBuilder from './pages/TemplateBuilder';
import Templates from './pages/Templates';
import CompletedInspections from './pages/CompletedInspections';
import Projects from './pages/Projects';
import Team from './pages/Team';
import Gear from './pages/Gear';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';

import { auth, db } from './firebase';
import {
  Home,
  FileText,
  ClipboardList,
  MoreHorizontal,
  Users,
  Folder,
  LayoutDashboard,
  File,
  HardHat,
  Settings,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';

import './App.css';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        try {
          const ref = doc(db, 'users', user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setUserProfile(snap.data());
          } else {
            setUserProfile({
              uid: user.uid,
              email: user.email,
              name: user.displayName || user.email,
              role: 'user',
              team: '',
            });
          }
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      }

      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    if (currentPage === 'templateBuilder' && !canAccessBuilder) {
      return <div className="p-6 text-red-500 font-medium">Access denied. Managers and Admins only.</div>;
    }

    if (currentPage === 'adminPanel' && !isAdmin) {
      return <div className="p-6 text-red-500 font-medium">Access denied. Admins only.</div>;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'templates':
        return <Templates />;
      case 'templateBuilder':
        return <TemplateBuilder />;
      case 'completedInspections':
        return <CompletedInspections />;
      case 'projects':
        return <Projects />;
      case 'team':
        return <Team />;
      case 'gear':
        return <Gear />;
      case 'profile':
        return <Profile />;
      case 'adminPanel':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return (
      <Login
        onLogin={(page) => {
          setUser(auth.currentUser);
          setCurrentPage(page || 'dashboard');
        }}
      />
    );
  }

  if (loadingProfile || !userProfile) {
    return <div className="p-6">Loading...</div>;
  }

  const role = userProfile?.role || 'user';
  const isAdmin = role === 'admin';
  const canAccessBuilder = role === 'admin' || role === 'manager';
  const displayName = userProfile?.name || user?.displayName || user?.email;

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar desktop-only">
          <div className="logo-container">
            <LayoutDashboard size={40} color="#3b82f6" />
          </div>

          <div className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <Home size={18} />
            Dashboard
          </div>
          <div className={`menu-item ${currentPage === 'templates' ? 'active' : ''}`} onClick={() => setCurrentPage('templates')}>
            <FileText size={18} />
            Templates
          </div>
          {canAccessBuilder && (
            <div className={`submenu-item ${currentPage === 'templateBuilder' ? 'active' : ''}`} onClick={() => setCurrentPage('templateBuilder')}>
              └ <File size={16} />
              Template Builder
            </div>
          )}
          <div className={`menu-item ${currentPage === 'completedInspections' ? 'active' : ''}`} onClick={() => setCurrentPage('completedInspections')}>
            <ClipboardList size={18} />
            Completed Inspections
          </div>
          <div className={`menu-item ${currentPage === 'team' ? 'active' : ''}`} onClick={() => setCurrentPage('team')}>
            <Users size={18} />
            Team
          </div>
          <div className={`menu-item ${currentPage === 'projects' ? 'active' : ''}`} onClick={() => setCurrentPage('projects')}>
            <Folder size={18} />
            Projects
          </div>
          <div className={`menu-item ${currentPage === 'gear' ? 'active' : ''}`} onClick={() => setCurrentPage('gear')}>
            <HardHat size={18} />
            Gear
          </div>
          <div className={`menu-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPage('profile')}>
            <UserCircle size={18} />
            Profile
          </div>
          {isAdmin && (
            <div className={`menu-item ${currentPage === 'adminPanel' ? 'active' : ''}`} onClick={() => setCurrentPage('adminPanel')}>
              <ShieldCheck size={18} />
              Admin
            </div>
          )}
          <div className="menu-item" onClick={() => auth.signOut()}>
            <Settings size={18} />
            Log Out
          </div>
        </div>

        {/* Main Content */}
        <div className="content-container">
          <div className="p-4 bg-white shadow text-gray-800 font-medium">
            Welcome, {displayName}
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav mobile-only">
        <div onClick={() => setCurrentPage('dashboard')}>
          <Home size={22} />
          <div>Home</div>
        </div>
        <div onClick={() => setCurrentPage('templates')}>
          <FileText size={22} />
          <div>Templates</div>
        </div>
        <div onClick={() => setCurrentPage('completedInspections')}>
          <ClipboardList size={22} />
          <div>Inspections</div>
        </div>
        <div onClick={() => setShowMoreMobile(!showMoreMobile)}>
          <MoreHorizontal size={22} />
          <div>More</div>
        </div>
      </div>

      {/* Mobile More Menu */}
      {showMoreMobile && (
        <div className="mobile-more-popup">
          <div onClick={() => { setCurrentPage('projects'); setShowMoreMobile(false); }}>
            <Folder size={18} /> Projects
          </div>
          <div onClick={() => { setCurrentPage('team'); setShowMoreMobile(false); }}>
            <Users size={18} /> Team
          </div>
          <div onClick={() => { setCurrentPage('gear'); setShowMoreMobile(false); }}>
            <HardHat size={18} /> Gear
          </div>
          <div onClick={() => { setCurrentPage('profile'); setShowMoreMobile(false); }}>
            <UserCircle size={18} /> Profile
          </div>
          {canAccessBuilder && (
            <div onClick={() => { setCurrentPage('templateBuilder'); setShowMoreMobile(false); }}>
              <File size={18} /> Template Builder
            </div>
          )}
          {isAdmin && (
            <div onClick={() => { setCurrentPage('adminPanel'); setShowMoreMobile(false); }}>
              <ShieldCheck size={18} /> Admin
            </div>
          )}
          <div onClick={() => { auth.signOut(); setShowMoreMobile(false); }}>
            <Settings size={18} /> Log Out
          </div>
        </div>
      )}
    </div>
  );
}
