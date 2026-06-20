import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { RiUser3Line } from 'react-icons/ri';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../stores/uiStore';

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const { sidebarCollapsed } = useUIStore();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.includes('/projects') && path.endsWith('/projects')) return 'Projects';
    if (path.includes('/automation-tests') && path.includes('/builder')) return 'Visual Test Builder';
    if (path.includes('/automation-tests')) return 'Automation Tests';
    if (path.includes('/objects')) return 'Object Repository';
    if (path.includes('/test-data')) return 'Test Data';
    if (path.includes('/recorder')) return 'Playwright Recorder';
    if (path.includes('/executions')) return 'Executions';
    if (path.includes('/failures')) return 'Failures';
    if (path.includes('/reports')) return 'Reports';
    if (path === '/settings') return 'Settings';
    if (path === '/profile') return 'Profile';
    return 'zerotesting';
  };

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20 transition-all duration-200 ${
        sidebarCollapsed ? 'left-16' : 'left-60'
      }`}
    >
      <h1 className="text-base font-semibold text-gray-900">{getPageTitle()}</h1>

      <div className="flex items-center gap-4">
        <Link
          to="/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100"
        >
          <RiUser3Line size={16} />
          <span>{user?.first_name || user?.email || 'Profile'}</span>
        </Link>
      </div>
    </header>
  );
}
