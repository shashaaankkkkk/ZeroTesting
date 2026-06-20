import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import {
  RiDashboardLine, RiFolder3Line, RiFileTextLine, RiRobot2Line,
  RiDatabase2Line, RiPlayCircleLine, RiAlertLine, RiBarChart2Line,
  RiSettings4Line, RiLogoutBoxLine, RiGridLine, RiRecordCircleLine,
  RiCodeSSlashLine, RiMenuFoldLine, RiMenuUnfoldLine, RiStackLine,
} from 'react-icons/ri';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

const mainNavItems = [
  { path: '/', label: 'Dashboard', icon: RiDashboardLine },
  { path: '/projects', label: 'Projects', icon: RiFolder3Line },
  { path: '/settings', label: 'Settings', icon: RiSettings4Line },
];

const projectNavItems = [
  { path: '', label: 'Overview', icon: RiDashboardLine },
  { path: '/business-tests', label: 'Business Tests', icon: RiFileTextLine },
  { path: '/groups', label: 'Groups', icon: RiStackLine },
  { path: '/automation-tests', label: 'Automation Tests', icon: RiRobot2Line },
  { path: '/objects', label: 'Object Repository', icon: RiGridLine },
  { path: '/test-data', label: 'Test Data', icon: RiDatabase2Line },
  { path: '/recorder', label: 'Recorder', icon: RiRecordCircleLine },
  { path: '/executions', label: 'Executions', icon: RiPlayCircleLine },
  { path: '/failures', label: 'Failures', icon: RiAlertLine },
  { path: '/reports', label: 'Reports', icon: RiBarChart2Line },
];

export default function Sidebar() {
  const { id: projectId } = useParams();
  const location = useLocation();
  const { logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const isProjectRoute = location.pathname.startsWith('/projects/') && projectId;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <span className="text-sm font-bold text-gray-900 tracking-tight">zerotesting</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          {sidebarCollapsed ? <RiMenuUnfoldLine size={18} /> : <RiMenuFoldLine size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!isProjectRoute ? (
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
                <item.icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ) : (
          <>
            <NavLink to="/projects" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 mb-2">
              <RiFolder3Line size={14} />
              {!sidebarCollapsed && <span>← All Projects</span>}
            </NavLink>
            <div className="space-y-1">
              {projectNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/projects/${projectId}${item.path}`}
                  end={item.path === ''}
                  className={linkClass}
                >
                  <item.icon size={18} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full"
        >
          <RiLogoutBoxLine size={18} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
