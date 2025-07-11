import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const toggleTemplates = () => setTemplatesOpen(!templatesOpen);

  return (
    <div style={{
      width: 220,
      height: '100vh',
      backgroundColor: '#222',
      color: '#fff',
      padding: '20px 10px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h3 style={{ color: '#09f', marginBottom: 20 }}>Menu</h3>

      <Link
        to="/"
        style={{
          color: location.pathname === '/' ? '#09f' : '#ccc',
          padding: '8px 15px',
          textDecoration: 'none',
          display: 'block',
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        Dashboard
      </Link>

      <div>
        <div
          onClick={toggleTemplates}
          style={{
            color: templatesOpen ? '#09f' : '#ccc',
            cursor: 'pointer',
            padding: '8px 15px',
            borderRadius: 4,
            marginBottom: 4,
            userSelect: 'none',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Templates
          <span>{templatesOpen ? '▲' : '▼'}</span>
        </div>

        {templatesOpen && (
          <div style={{ paddingLeft: 15, marginBottom: 10 }}>
            <Link
              to="/templates/builder"
              style={{
                color: location.pathname === '/templates/builder' ? '#09f' : '#ccc',
                padding: '6px 15px',
                display: 'block',
                textDecoration: 'none',
                borderRadius: 4,
              }}
            >
              Template Builder
            </Link>
          </div>
        )}
      </div>

      <Link
        to="/completed-inspections"
        style={{
          color: location.pathname === '/completed-inspections' ? '#09f' : '#ccc',
          padding: '8px 15px',
          textDecoration: 'none',
          display: 'block',
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        Completed Inspections
      </Link>

      <Link
        to="/team"
        style={{
          color: location.pathname === '/team' ? '#09f' : '#ccc',
          padding: '8px 15px',
          textDecoration: 'none',
          display: 'block',
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        Team
      </Link>

      <Link
        to="/projects"
        style={{
          color: location.pathname === '/projects' ? '#09f' : '#ccc',
          padding: '8px 15px',
          textDecoration: 'none',
          display: 'block',
          borderRadius: 4,
        }}
      >
        Projects
      </Link>
    </div>
  );
}
