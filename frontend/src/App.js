// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import TemplateBuilder from './pages/TemplateBuilder';
import Templates from './pages/Templates';
import CompletedInspections from './pages/CompletedInspections';
import Projects from './pages/Projects';
import ArchivedProjects from './pages/ArchivedProjects'; // <-- new!
import Team from './pages/Team';
import Gear from './pages/Gear';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';

// Zustand store for projects
import './store/projectStore';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import {
  Home,
  FileText,
  ClipboardList,
  MoreHorizontal,
  PlusCircle,
  Users,
  Folder,
  File,
  HardHat,
  Settings,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';

import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [showArchivedProjects, setShowArchivedProjects] = useState(false); // <-- NEW

  const plusBtnRef = useRef(null);
  const plusMenuRef = useRef(null);
  const moreBtnRef = useRef(null);
  const moreDrawerRef = useRef(null);

  // Listen for auth changes & load profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      setUser(fbUser);
      if (fbUser) {
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : null;
        await updateDoc(ref, { lastSeen: new Date().toISOString() });
        if (data?.active === false) {
          await signOut(auth);
          alert('Your account is deactivated.');
        } else {
          setUserProfile(
            data || {
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email,
              role: 'user',
              team: '',
              lastSeen: null,
            }
          );
        }
      }
      setLoadingProfile(false);
    });
    return () => unsubscribe();
  }, []);

  // Click-outside to close mobile menus
  useEffect(() => {
    const handler = e => {
      if (
        showPlusMenu &&
        plusMenuRef.current &&
        !plusMenuRef.current.contains(e.target) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target)
      ) {
        setShowPlusMenu(false);
      }
      if (
        showMoreMobile &&
        moreDrawerRef.current &&
        !moreDrawerRef.current.contains(e.target) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target)
      ) {
        setShowMoreMobile(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showPlusMenu, showMoreMobile]);

  if (!user) {
    return (
      <Login
        onLogin={page => {
          setUser(auth.currentUser);
          setCurrentPage(page || 'dashboard');
        }}
      />
    );
  }
  if (loadingProfile || !userProfile) {
    return <div className="p-6">Loading...</div>;
  }

  const { name, email, role } = userProfile;
  const displayName = name || email;
  const isAdmin = role === 'admin';
  const canBuilder = isAdmin || role === 'manager';

  const renderContent = () => {
    if (currentPage === 'templateBuilder' && !canBuilder) {
      return <div className="p-6 text-red-500">Access denied.</div>;
    }
    if (currentPage === 'adminPanel' && !isAdmin) {
      return <div className="p-6 text-red-500">Admins only.</div>;
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
        return showArchivedProjects
          ? <ArchivedProjects onBack={() => setShowArchivedProjects(false)} />
          : <Projects onShowArchived={() => setShowArchivedProjects(true)} />;
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

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* Desktop Sidebar */}
        <div className="sidebar desktop-only">
          {/* Logo at top */}
          <div className="desktop-logo-holder">
            <img src="/assets/logo.png" alt="Logo" />
          </div>

          <div className="menu-top">
            <div
              className={`menu-item ${
                currentPage === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('dashboard');
                setShowArchivedProjects(false);
              }}
            >
              <Home size={18} /> Dashboard
            </div>
            <div
              className={`menu-item ${
                currentPage === 'templates' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('templates');
                setShowArchivedProjects(false);
              }}
            >
              <FileText size={18} /> Templates
            </div>
            {canBuilder && (
              <div
                className={`menu-item ${
                  currentPage === 'templateBuilder' ? 'active' : ''
                }`}
                onClick={() => {
                  setCurrentPage('templateBuilder');
                  setShowArchivedProjects(false);
                }}
              >
                <File size={18} /> Template Builder
              </div>
            )}
            <div
              className={`menu-item ${
                currentPage === 'completedInspections' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('completedInspections');
                setShowArchivedProjects(false);
              }}
            >
              <ClipboardList size={18} /> Completed Inspections
            </div>
            <div
              className={`menu-item ${
                currentPage === 'projects' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('projects');
                setShowArchivedProjects(false);
              }}
            >
              <Folder size={18} /> Projects
            </div>
            <div
              className={`menu-item ${
                currentPage === 'team' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('team');
                setShowArchivedProjects(false);
              }}
            >
              <Users size={18} /> Team
            </div>
            <div
              className={`menu-item ${
                currentPage === 'gear' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('gear');
                setShowArchivedProjects(false);
              }}
            >
              <HardHat size={18} /> Gear
            </div>
            {isAdmin && (
              <div
                className={`menu-item ${
                  currentPage === 'adminPanel' ? 'active' : ''
                }`}
                onClick={() => {
                  setCurrentPage('adminPanel');
                  setShowArchivedProjects(false);
                }}
              >
                <ShieldCheck size={18} /> Admin
              </div>
            )}
          </div>

          {/* Profile & Log Out at bottom */}
          <div className="menu-bottom">
            <div
              className={`menu-item ${
                currentPage === 'profile' ? 'active' : ''
              }`}
              onClick={() => {
                setCurrentPage('profile');
                setShowArchivedProjects(false);
              }}
            >
              <UserCircle size={18} /> Profile
            </div>
            <div className="menu-item" onClick={() => signOut(auth)}>
              <Settings size={18} /> Log Out
            </div>
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
        <div onClick={() => {
          setCurrentPage('dashboard');
          setShowArchivedProjects(false);
        }}>
          <Home size={22} />
          <div>Home</div>
        </div>
        <div onClick={() => {
          setCurrentPage('templates');
          setShowArchivedProjects(false);
        }}>
          <FileText size={22} />
          <div>Templates</div>
        </div>
        <div
          ref={plusBtnRef}
          className="plus-btn"
          onClick={() => {
            setShowPlusMenu(p => !p);
            setShowMoreMobile(false);
          }}
        >
          <PlusCircle size={28} />
        </div>
        <div onClick={() => {
          setCurrentPage('completedInspections');
          setShowArchivedProjects(false);
        }}>
          <ClipboardList size={22} />
          <div>Inspections</div>
        </div>
        <div
          ref={moreBtnRef}
          onClick={() => {
            setShowMoreMobile(m => !m);
            setShowPlusMenu(false);
          }}
        >
          <MoreHorizontal size={22} />
          <div>More</div>
        </div>
      </div>

      {/* Mobile “+” Sub-Menu */}
      {showPlusMenu && (
        <div ref={plusMenuRef} className="mobile-plus-menu mobile-only">
          <div
            onClick={() => {
              setCurrentPage('templates');
              setShowPlusMenu(false);
              setShowArchivedProjects(false);
            }}
          >
            <FileText size={18} /> Start Inspection
          </div>
          <div
            onClick={() => {
              setCurrentPage('gear');
              setShowPlusMenu(false);
              setShowArchivedProjects(false);
            }}
          >
            <HardHat size={18} /> Add Gear
          </div>
          {canBuilder && (
            <div
              onClick={() => {
                setCurrentPage('team');
                setShowPlusMenu(false);
                setShowArchivedProjects(false);
              }}
            >
              <Users size={18} /> Add Member
            </div>
          )}
        </div>
      )}

      {/* Mobile “More” Drawer */}
      <div
        ref={moreDrawerRef}
        className={`mobile-more-drawer mobile-only ${
          showMoreMobile ? 'open' : ''
        }`}
      >
        <div className="mobile-drawer-logo">
          <img src="/assets/logo.png" alt="Logo" />
        </div>
        <div
          onClick={() => {
            setCurrentPage('projects');
            setShowArchivedProjects(false);
          }}
        >
          <Folder size={18} /> Projects
        </div>
        <div
          onClick={() => {
            setCurrentPage('team');
            setShowArchivedProjects(false);
          }}
        >
          <Users size={18} /> Team
        </div>
        <div
          onClick={() => {
            setCurrentPage('gear');
            setShowArchivedProjects(false);
          }}
        >
          <HardHat size={18} /> Gear
        </div>
        {canBuilder && (
          <div
            onClick={() => {
              setCurrentPage('templateBuilder');
              setShowArchivedProjects(false);
            }}
          >
            <File size={18} /> Template Builder
          </div>
        )}
        {isAdmin && (
          <div
            onClick={() => {
              setCurrentPage('adminPanel');
              setShowArchivedProjects(false);
            }}
          >
            <ShieldCheck size={18} /> Admin
          </div>
        )}
        <div className="divider" />
        <div
          onClick={() => {
            setCurrentPage('profile');
            setShowArchivedProjects(false);
          }}
        >
          <UserCircle size={18} /> Profile
        </div>
        <div
          onClick={() => {
            signOut(auth);
            setShowArchivedProjects(false);
          }}
        >
          <Settings size={18} /> Log Out
        </div>
      </div>
    </div>
  );
}
