// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import TemplateBuilder from './pages/TemplateBuilder';
import Templates from './pages/Templates';
import Inspections from './pages/Inspections';
import Projects from './pages/Projects';
import ArchivedProjects from './pages/ArchivedProjects';
import Team from './pages/Team';
import Gear from './pages/Gear';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import GearDetail from './pages/GearDetail';
import NotificationBell from "./components/NotificationBell";
import GearModal from "./components/GearModal";
import TransferEquipmentModal from "./components/TransferEquipmentModal";
import AddProjectModal from "./components/AddProjectModal";
import InviteModal from "./components/InviteModal";
import OrganizationSettings from './pages/OrganizationSettings';
import Sidebar from './Sidebar';
import Register from "./pages/Register";
import NewInspection from "./pages/NewInspection";
import FillInspection from "./pages/FillInspection";
import ProjectDetail from "./pages/ProjectDetail";

import './store/projectStore';

import { Routes, Route, useLocation, } from "react-router-dom";

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useProjectStore } from "./store/projectStore";

import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedGear, setSelectedGear] = useState(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const profileUid = params.get('uid');

  // 🟢 All modal states
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [showTransferEquipmentModal, setShowTransferEquipmentModal] = useState(false);

  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  const plusBtnRef = useRef(null);
  const plusMenuRef = useRef(null);
  const moreBtnRef = useRef(null);
  const moreDrawerRef = useRef(null);
  const { projects, fetchProjects } = useProjectStore();

  // Placeholder gear/team/projects arrays for modals (add your data fetching here!)
  const gearList = [];
  const team = [];
  const projectList = [];

  useEffect(() => {
    if (!projects || projects.length === 0) {
      fetchProjects && fetchProjects();
    }
  }, [projects, fetchProjects]);

  // TODO: Replace with your own gear/team/projects fetching logic if needed
  useEffect(() => {
    // Fetch your gear, team, and projects here and set with setGearList, setTeam, setProjectList
    // For now, they are empty arrays
  }, []);

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
          // keep role available for other pages (e.g., ProjectDetail)
          const roleToStore = (data?.role || 'user');
          window.localStorage.setItem('role', roleToStore);
        }
      }
      setLoadingProfile(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync currentPage to URL on initial load
  useEffect(() => {
    if (location.pathname.startsWith('/profile')) {
      setCurrentPage('profile');
    } else if (location.pathname.startsWith('/team')) {
      setCurrentPage('team');
    } else if (location.pathname.startsWith('/dashboard')) {
      setCurrentPage('dashboard');
    } else if (location.pathname.startsWith('/templates')) {
      setCurrentPage('templates');
    } else if (location.pathname === '/template-builder') {
      setCurrentPage('templateBuilder');
    } else if (location.pathname.startsWith('/inspections')) {
      setCurrentPage('inspections');
    } else if (location.pathname.startsWith('/projects/')) {
      setCurrentPage('projectDetail');
    } else if (location.pathname.startsWith('/projects')) {
      setCurrentPage('projects');
    } else if (location.pathname.startsWith('/gearDetail')) {
      setCurrentPage('gearDetail');
    } else if (location.pathname.startsWith('/gear')) {
      setCurrentPage('gear');
    } else if (location.pathname.startsWith('/organizationSettings')) {
      setCurrentPage('organizationSettings');
    } else if (location.pathname.startsWith('/adminPanel')) {
      setCurrentPage('adminPanel');
    } else {
      setCurrentPage('dashboard'); // Default fallback
    }
  }, [location.pathname, location.search]);

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

  // Main content rendering (move this above the return!)
  const { role } = userProfile || {};
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
        return (
          <Dashboard
            setCurrentPage={setCurrentPage}
            openAddProject={() => setShowAddProjectModal(true)}
            openInviteMember={() => setShowInviteModal(true)}
            openAddGear={() => setShowAddGearModal(true)}
            openTransferEquipment={() => setShowTransferEquipmentModal(true)}
          />
        );
      case 'templates':
        return <Templates />;
      case 'templateBuilder':
        return <TemplateBuilder />;
      case 'inspections':
        return <Inspections />;
      case 'projects':
        return showArchivedProjects
          ? <ArchivedProjects onBack={() => setShowArchivedProjects(false)} />
          : <Projects onShowArchived={() => setShowArchivedProjects(true)} />;
      case 'projectDetail':
        return <ProjectDetail />;
      case 'team':
        return <Team setCurrentPage={setCurrentPage} />;
      case 'gear':
        return <Gear setSelectedGear={setSelectedGear} setCurrentPage={setCurrentPage} />;
      case 'profile':
        return <Profile setCurrentPage={setCurrentPage} uid={profileUid} />;
      case 'adminPanel':
        return <AdminPanel />;
      default:
        return <Dashboard />;
      case 'gearDetail':
        return <GearDetail gear={selectedGear} setCurrentPage={setCurrentPage} />;
      case 'organizationSettings':
        return <OrganizationSettings />;
    }
  };

  // 🟢 This is the main change: hide sidebar/layout for /template-builder!
  const isTemplateBuilder = location.pathname === "/template-builder";

  return (
    <Routes>
      {/* Invite registration route */}
      <Route path="/register" element={<Register />} />
      {/* NEW INSPECTION ROUTE */}
      <Route path="/inspections/new/:templateId" element={<NewInspection />} />
      {/* TEMPLATE BUILDER FULLSCREEN ROUTE */}
      <Route path="/template-builder/:templateId" element={<TemplateBuilder />} />
      {/* 🟢 REDIRECT BUILDER WITH NO ID */}
      <Route path="/template-builder" element={<TemplateBuilder />} />
      {/* FILL INSPECTION ROUTE */}
      <Route path="/inspections/fill/:templateId" element={<FillInspection />} />

      {/* ✅ PROJECT DETAIL ROUTE WITH LAYOUT */}
      <Route
        path="/projects/:id"
        element={
          !user ? (
            <Login
              onLogin={(page) => {
                setUser(auth.currentUser);
                setCurrentPage(page || "dashboard");
              }}
            />
          ) : loadingProfile || !userProfile ? (
            <div className="p-6">Loading...</div>
          ) : (
            <div className="app-container">
              <div className="main-layout">
                <Sidebar
                  userProfile={userProfile}
                  setCurrentPage={setCurrentPage}
                  currentPage={currentPage}
                  signOut={() => signOut(auth)}
                />
                <div className="content-container">
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <NotificationBell />
                  </div>
                  <ProjectDetail />
                </div>
              </div>
            </div>
          )
        }
      />

      {/* All other app routes */}
      <Route
        path="*"
        element={
          !user ? (
            <Login
              onLogin={page => {
                setUser(auth.currentUser);
                setCurrentPage(page || 'dashboard');
              }}
            />
          ) : loadingProfile || !userProfile ? (
            <div className="p-6">Loading...</div>
          ) : isTemplateBuilder ? (
            // ⬇️ Fullscreen builder - no sidebar or extra containers
            <TemplateBuilder />
          ) : (
            <div className="app-container">
              <div className="main-layout">
                <Sidebar
                  userProfile={userProfile}
                  setCurrentPage={setCurrentPage}
                  currentPage={currentPage}
                  signOut={() => signOut(auth)}
                />
                <div className="content-container">
                  <div style={{display: "flex", justifyContent: "flex-end", marginBottom: 12}}>
                    <NotificationBell />
                  </div>
                  {renderContent()}
                </div>
              </div>

              {/* Modals at the root level */}
              {showAddProjectModal && (
                <AddProjectModal
                  onClose={() => setShowAddProjectModal(false)}
                  onAdd={(project) => {
                    alert(`New project: ${project.name}`);
                    setShowAddProjectModal(false);
                  }}
                />
              )}
              {showInviteModal && (
                <InviteModal
                  onClose={() => setShowInviteModal(false)}
                  onInvite={(email) => {
                    alert(`Invitation sent to: ${email}`);
                    setShowInviteModal(false);
                  }}
                />
              )}
              {showAddGearModal && (
                <GearModal
                  onClose={() => setShowAddGearModal(false)}
                />
              )}
              {showTransferEquipmentModal && (
                <TransferEquipmentModal
                  gearList={gearList}
                  team={team}
                  projects={projectList}
                  onClose={() => setShowTransferEquipmentModal(false)}
                />
              )}
            </div>
          )
        }
      />
    </Routes>
  );
}
