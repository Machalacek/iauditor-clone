import React, { useState, useRef, useEffect } from 'react';
import {
  Home, FileText, File, ClipboardList, Users, Folder, HardHat,
  UserCircle, ShieldCheck, Settings, ChevronRight, ChevronDown, ChevronUp,
  Menu as MenuIcon, X as CloseIcon, PlusCircle, Repeat,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SIDEBAR_WIDTH = 240;

export default function Sidebar({
  userProfile,
  setCurrentPage,
  currentPage,
  signOut,
  organizationLogo,
}) {
  // --- Desktop flyout state
  const [adminFlyout, setAdminFlyout] = useState(false);
  const flyoutTimeout = useRef(null);

  const navigate = useNavigate();

  // --- Mobile state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);

  // --- Mobile bottom bar "+"
  const [plusOpen, setPlusOpen] = useState(false);

  // --- Plus pulse animation (3x only)
  const [showPulse, setShowPulse] = useState(true);
  const pulseCount = useRef(0);

  useEffect(() => {
    if (!showPulse) return;
    const interval = setInterval(() => {
      pulseCount.current += 1;
      if (pulseCount.current >= 3) {
        setShowPulse(false);
        clearInterval(interval);
      }
    }, 800); // ping duration
    return () => clearInterval(interval);
  }, [showPulse]);

  const role = userProfile.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const logoSrc = organizationLogo || '/assets/logo.png';

  // Nav
  const canBuilder = isAdmin || isManager;
  const mainMenu = [
    { key: 'dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    { key: 'templates', icon: <FileText size={20} />, label: 'Templates' },
    ...(canBuilder ? [{ key: 'templateBuilder', icon: <File size={20} />, label: 'Template Builder' }] : []),
    { key: 'inspections', icon: <ClipboardList size={20} />, label: 'Inspections' },
    { key: 'projects', icon: <Folder size={20} />, label: 'Projects' },
    { key: 'team', icon: <Users size={20} />, label: 'Team' },
    { key: 'gear', icon: <HardHat size={20} />, label: 'Gear' },
  ];
  const adminMenu = [
    { key: 'organizationSettings', icon: <Settings size={18} />, label: 'Org Settings' },
    { key: 'profile', icon: <UserCircle size={18} />, label: 'Profile' },
  ];

  // Plus actions (same for all roles)
  const plusMenu = [
    {
      label: 'Start Inspection',
      icon: <FileText size={20} />,
      onClick: () => { navigate('/templates'); setCurrentPage('templates'); },
    },
    {
      label: 'Add Gear',
      icon: <HardHat size={20} />,
      onClick: () => { navigate('/gear'); setCurrentPage('gear'); },
    },
    {
      label: 'Transfer Equipment',
      icon: <Repeat size={20} />,
      onClick: () => { /* Optional: navigate('/gear'); */ setCurrentPage('transferEquipment'); },
    },
    ...(canBuilder
      ? [{
        label: 'Add Member',
        icon: <Users size={20} />,
        onClick: () => { navigate('/team'); setCurrentPage('team'); },
      }]
      : []
    ),
  ];

  // --- Desktop Admin flyout logic ---
  function handleFlyoutEnter() {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    setAdminFlyout(true);
  }
  function handleFlyoutLeave() {
    flyoutTimeout.current = setTimeout(() => setAdminFlyout(false), 120);
  }
  function handleFlyoutClick(e) {
    e.stopPropagation();
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    setAdminFlyout((o) => !o);
  }

  // --- Desktop Sidebar ---
  return (
    <>
      {/* Hamburger for mobile only */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/80 shadow-md md:hidden"
        onClick={() => setMobileOpen(true)}
        style={{ border: '1px solid #eee' }}
        aria-label="Open navigation"
      >
        <MenuIcon size={28} />
      </button>

      {/* Desktop Sidebar */}
      <nav
        className="hidden md:flex flex-col h-screen"
        style={{
          width: SIDEBAR_WIDTH,
          background: 'rgba(255,255,255,0.93)',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '0 4px 40px rgba(31,41,55,0.07)',
          borderTopRightRadius: 30,
          borderBottomRightRadius: 30,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 30,
          padding: '26px 0 0 0',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={logoSrc}
            alt="Logo"
            className="w-16 h-16 rounded-2xl border bg-white shadow"
            style={{ objectFit: 'contain' }}
          />
        </div>
        {/* Main nav */}
        <div className="flex-1 flex flex-col gap-1 px-3">
          {mainMenu.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                navigate(`/${item.key}`);
                setCurrentPage(item.key);
              }}
              className={classNames(
                "flex items-center gap-3 px-4 py-2 rounded-xl font-semibold transition group w-full text-left",
                currentPage === item.key
                  ? "bg-blue-100 text-blue-700 shadow"
                  : "hover:bg-blue-50 text-gray-700"
              )}
              tabIndex={0}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {/* Admin/Log out/Profile section */}
        <div className="flex flex-col gap-1 p-3 border-t border-gray-200 mt-3">
          {isAdmin ? (
            <div
              className="relative select-none"
              tabIndex={0}
              onMouseEnter={handleFlyoutEnter}
              onMouseLeave={handleFlyoutLeave}
              onClick={handleFlyoutClick}
              aria-haspopup="true"
              aria-expanded={adminFlyout}
              style={{ outline: 'none' }}
            >
              <button
                className={classNames(
                  "flex items-center gap-3 px-4 py-2 rounded-xl w-full font-semibold transition group",
                  adminFlyout
                    ? "bg-blue-100 text-blue-700 shadow"
                    : "hover:bg-blue-50 text-gray-700"
                )}
                aria-haspopup="true"
                aria-expanded={adminFlyout}
              >
                <ShieldCheck size={20} />
                <span>Admin</span>
                <ChevronRight className="ml-auto" size={18} />
              </button>
              {/* Flyout */}
              {adminFlyout && (
                <div
                  className="absolute left-[110%] top-0 min-w-[170px] bg-white border border-gray-200 shadow-xl rounded-xl py-2 flex flex-col z-50"
                  style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)", marginLeft: 12 }}
                  onMouseEnter={handleFlyoutEnter}
                  onMouseLeave={handleFlyoutLeave}
                  onClick={e => e.stopPropagation()}
                >
                  {adminMenu.map(item => (
                    <button
                      key={item.key}
                      onClick={() => {
                        navigate(`/${item.key}`);
                        setCurrentPage(item.key);
                        setAdminFlyout(false);
                      }}
                      className={classNames(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-left",
                        currentPage === item.key
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-blue-100 text-gray-800"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              className={classNames(
                "flex items-center gap-3 px-4 py-2 rounded-xl w-full font-semibold transition group",
                currentPage === 'profile'
                  ? "bg-blue-100 text-blue-700 shadow"
                  : "hover:bg-blue-50 text-gray-700"
              )}
              onClick={() => {
                navigate('/profile');
                setCurrentPage('profile');
              }}
            >
              <UserCircle size={20} />
              <span>Profile</span>
            </button>
          )}
          {/* Log Out */}
          <button
            className="flex items-center gap-3 px-4 py-2 rounded-xl font-semibold hover:bg-red-50 text-red-500 transition group"
            onClick={signOut}
          >
            <Settings size={20} /> Log Out
          </button>
        </div>
      </nav>

      {/* --- MOBILE DRAWER --- */}
      <nav
        className={classNames(
          "fixed inset-0 z-[99] transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        style={{
          background: mobileOpen ? "rgba(0,0,0,0.23)" : "transparent"
        }}
        aria-hidden={!mobileOpen}
        tabIndex={-1}
      >
        {/* Drawer */}
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: '100vh',
            background: '#fff',
            borderTopRightRadius: 28,
            borderBottomRightRadius: 28,
            boxShadow: '6px 0 28px rgba(0,0,0,0.13)',
            position: 'relative',
            zIndex: 100,
            padding: '26px 0 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 0
          }}
          className="relative"
        >
          {/* Close Button */}
          <button
            className="absolute top-2 right-3 p-2 rounded-lg bg-white shadow"
            style={{ border: '1px solid #eee' }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <CloseIcon size={28} />
          </button>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src={logoSrc}
              alt="Logo"
              className="w-16 h-16 rounded-2xl border bg-white shadow"
              style={{ objectFit: 'contain' }}
            />
          </div>
          {/* Main nav */}
          <div className="flex-1 flex flex-col gap-1 px-3">
            {mainMenu.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  navigate(`/${item.key}`);
                  setCurrentPage(item.key);
                  setMobileOpen(false);
                }}
                className={classNames(
                  "flex items-center gap-3 px-4 py-2 rounded-xl font-semibold transition group w-full text-left",
                  currentPage === item.key
                    ? "bg-blue-100 text-blue-700 shadow"
                    : "hover:bg-blue-50 text-gray-700"
                )}
                tabIndex={0}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {/* Admin/Profile + Log Out */}
          <div className="flex flex-col gap-1 p-3 border-t border-gray-200 mt-3">
            {isAdmin ? (
              <div>
                <button
                  className={classNames(
                    "flex items-center gap-3 px-4 py-2 rounded-xl w-full font-semibold transition group",
                    mobileAdminOpen
                      ? "bg-blue-100 text-blue-700 shadow"
                      : "hover:bg-blue-50 text-gray-700"
                  )}
                  onClick={() => setMobileAdminOpen(o => !o)}
                >
                  <ShieldCheck size={20} />
                  <span>Admin</span>
                  {mobileAdminOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {mobileAdminOpen && (
                  <div className="pl-5 py-1 flex flex-col gap-1">
                    {adminMenu.map(item => (
                      <button
                        key={item.key}
                        onClick={() => {
                          navigate(`/${item.key}`);
                          setCurrentPage(item.key);
                          setMobileOpen(false);
                          setMobileAdminOpen(false);
                        }}
                        className={classNames(
                          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-left",
                          currentPage === item.key
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-blue-100 text-gray-800"
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                className={classNames(
                  "flex items-center gap-3 px-4 py-2 rounded-xl w-full font-semibold transition group",
                  currentPage === 'profile'
                    ? "bg-blue-100 text-blue-700 shadow"
                    : "hover:bg-blue-50 text-gray-700"
                )}
                onClick={() => {
                  navigate('/profile');
                  setCurrentPage('profile');
                  setMobileOpen(false);
                }}
              >
                <UserCircle size={20} />
                <span>Profile</span>
              </button>
            )}
            {/* Log Out */}
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-xl font-semibold hover:bg-red-50 text-red-500 transition group"
              onClick={signOut}
            >
              <Settings size={20} /> Log Out
            </button>
          </div>
        </div>
        {/* Click outside to close */}
        <div className="absolute inset-0 z-10" onClick={() => setMobileOpen(false)} />
      </nav>

      {/* --- MOBILE BOTTOM NAVBAR --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-40 flex justify-between items-center px-2 py-1">
        <button
          className={classNames("flex flex-col items-center flex-1 py-1", currentPage === 'dashboard' && "text-blue-600")}
          onClick={() => {
            navigate('/dashboard');
            setCurrentPage('dashboard');
          }}
        >
          <Home size={22} />
          <span className="text-xs">Home</span>
        </button>
        <button
          className={classNames("flex flex-col items-center flex-1 py-1", currentPage === 'templates' && "text-blue-600")}
          onClick={() => {
            navigate('/templates');
            setCurrentPage('templates');
          }}
        >
          <FileText size={22} />
          <span className="text-xs">Templates</span>
        </button>
        <button
          className={classNames("flex flex-col items-center flex-1 py-1")}
          onClick={() => setPlusOpen(p => !p)}
        >
          <span className="relative block -mt-5">
            {showPulse && (
              <span
                className="absolute inset-0 rounded-full bg-blue-600 opacity-60 animate-ping"
                style={{ width: 46, height: 46, zIndex: 0 }}
              />
            )}
            <span
              className="relative rounded-full bg-blue-600 shadow-lg p-2 border-4 border-white flex items-center justify-center"
              style={{ width: 46, height: 46, zIndex: 1 }}
            >
              <PlusCircle size={28} color="white" />
            </span>
          </span>
        </button>
        <button
          className={classNames("flex flex-col items-center flex-1 py-1", currentPage === 'Inspections' && "text-blue-600")}
          onClick={() => {
            navigate('/Inspections');
            setCurrentPage('Inspections');
          }}
        >
          <ClipboardList size={22} />
          <span className="text-xs">Inspections</span>
        </button>
        <button
          className={classNames("flex flex-col items-center flex-1 py-1", currentPage === 'gear' && "text-blue-600")}
          onClick={() => {
            navigate('/gear');
            setCurrentPage('gear');
          }}
        >
          <HardHat size={22} />
          <span className="text-xs">Gear</span>
        </button>
      </div>
      {/* Mobile PLUS MENU (above bottom nav) */}
      {plusOpen && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[94vw] max-w-xs bg-white rounded-2xl shadow-2xl border border-blue-100 p-3 z-50 flex flex-col gap-2 animate-fade-in"
          style={{ boxShadow: '0 12px 32px 0 rgba(38, 97, 255, 0.13)' }}>
          {plusMenu.map(item => (
            <button
              key={item.label}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 text-gray-800 font-semibold transition"
              onClick={() => { item.onClick(); setPlusOpen(false); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
