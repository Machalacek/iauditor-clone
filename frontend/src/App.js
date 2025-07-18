// src/App.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
} from 'firebase/firestore';

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

export default function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  // Listen for auth state changes, record lastSeen, and block deactivated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : null;

        // Record lastSeen timestamp
        await updateDoc(ref, { lastSeen: new Date().toISOString() });

        // If deactivated, immediately sign out and alert
        if (data?.active === false) {
          await signOut(auth);
          setUser(null);
          alert('Your account is deactivated. Please contact an admin.');
          setLoadingProfile(false);
          return;
        }

        // Otherwise load or initialize profile
        if (data) {
          setUserProfile(data);
        } else {
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email,
            role: 'user',
            team: '',
            lastSeen: null,
          });
        }
      }

      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    const role = userProfile?.role || 'user';
    const isAdmin = role === 'admin';
    const canAccessBuilder = isAdmin || role === 'manager';

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

  const displayName = userProfile.name || user.displayName || user.email;

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar desktop-only">
          <div className="logo-container">
            <LayoutDashboard size={40} color="#3b82f6" />
          </div>

          <div className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <Home size={18} /> Dashboard
          </div>
          <div className={`menu-item ${currentPage === 'templates' ? 'active' : ''}`} onClick={() => setCurrentPage('templates')}>
            <FileText size={18} /> Templates
          </div>
          {(userProfile.role === 'admin' || userProfile.role === 'manager') && (
            <div className={`submenu-item ${currentPage === 'templateBuilder' ? 'active' : ''}`} onClick={() => setCurrentPage('templateBuilder')}>
              └ <File size={16} /> Template Builder
            </div>
          )}
          <div className={`menu-item ${currentPage === 'completedInspections' ? 'active' : ''}`} onClick={() => setCurrentPage('completedInspections')}>
            <ClipboardList size={18} /> Completed Inspections
          </div>
          <div className={`menu-item ${currentPage === 'team' ? 'active' : ''}`} onClick={() => setCurrentPage('team')}>
            <Users size={18} /> Team
          </div>
          <div className={`menu-item ${currentPage === 'projects' ? 'active' : ''}`} onClick={() => setCurrentPage('projects')}>
            <Folder size={18} /> Projects
          </div>
          <div className={`menu-item ${currentPage === 'gear' ? 'active' : ''}`} onClick={() => setCurrentPage('gear')}>
            <HardHat size={18} /> Gear
          </div>
          <div className={`menu-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPage('profile')}>
            <UserCircle size={18} /> Profile
          </div>
          {userProfile.role === 'admin' && (
            <div className={`menu-item ${currentPage === 'adminPanel' ? 'active' : ''}`} onClick={() => setCurrentPage('adminPanel')}>
              <ShieldCheck size={18} /> Admin
            </div>
          )}
          <div className="menu-item" onClick={() => signOut(auth)}>
            <Settings size={18} /> Log Out
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
          <Home size={22} /><div>Home</div>
        </div>
        <div onClick={() => setCurrentPage('templates')}>
          <FileText size={22} /><div>Templates</div>
        </div>
        <div onClick={() => setCurrentPage('completedInspections')}>
          <ClipboardList size={22} /><div>Inspections</div>
        </div>
        <div onClick={() => setShowMoreMobile(!showMoreMobile)}>
          <MoreHorizontal size={22} /><div>More</div>
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
          {(userProfile.role === 'admin' || userProfile.role === 'manager') && (
            <div onClick={() => { setCurrentPage('templateBuilder'); setShowMoreMobile(false); }}>
              <File size={18} /> Template Builder
            </div>
          )}
          {userProfile.role === 'admin' && (
            <div onClick={() => { setCurrentPage('adminPanel'); setShowMoreMobile(false); }}>
              <ShieldCheck size={18} /> Admin
            </div>
          )}
          <div onClick={() => { signOut(auth); setShowMoreMobile(false); }}>
            <Settings size={18} /> Log Out
          </div>
        </div>
      )}
    </div>
  );
}
