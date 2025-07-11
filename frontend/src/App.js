import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import TemplateBuilder from './pages/TemplateBuilder';
import Templates from './pages/Templates';
import CompletedInspections from './pages/CompletedInspections';
import Projects from './pages/Projects';
import Team from './pages/Team';
import {
  Home,
  FileText,
  ClipboardList,
  MoreHorizontal,
  Users,
  Folder,
  LayoutDashboard,
  File,
  Settings,
} from 'lucide-react';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  const renderContent = () => {
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* Sidebar (always present on desktop) */}
        <div className="sidebar desktop-only">
          <div className="logo-container">
            {/* Replace with your own logo or image */}
            <LayoutDashboard size={40} color="#3b82f6" />
          </div>
          <div
            className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <Home size={18} />
            Dashboard
          </div>
          <div
            className={`menu-item ${currentPage === 'templates' ? 'active' : ''}`}
            onClick={() => setCurrentPage('templates')}
          >
            <FileText size={18} />
            Templates
          </div>
          <div
            className={`submenu-item ${currentPage === 'templateBuilder' ? 'active' : ''}`}
            onClick={() => setCurrentPage('templateBuilder')}
          >
            └ <File size={16} />
            Template Builder
          </div>
          <div
            className={`menu-item ${currentPage === 'completedInspections' ? 'active' : ''}`}
            onClick={() => setCurrentPage('completedInspections')}
          >
            <ClipboardList size={18} />
            Completed Inspections
          </div>
          <div
            className={`menu-item ${currentPage === 'team' ? 'active' : ''}`}
            onClick={() => setCurrentPage('team')}
          >
            <Users size={18} />
            Team
          </div>
          <div
            className={`menu-item ${currentPage === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentPage('projects')}
          >
            <Folder size={18} />
            Projects
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-container">{renderContent()}</div>
      </div>

      {/* Mobile Bottom Navigation */}
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
        </div>
      )}
    </div>
  );
}
