import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyLogs from './DailyLogs';
import AttendanceAudit from './AttendanceAudit';
import EmployeeList from './EmployeeList';
import AttendanceReports from './AttendanceReports';
import AuditLogs from './AuditLogs';
import DashboardCharts from './DashboardCharts';
import AIChatWidget from './AIChatWidget';
import Settings from './Settings';
import AdminManagement from './AdminManagement';
import ManualAttendance from './ManualAttendance';
import SalaryPage from './SalaryPage';

const AdminLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [correctionEmployeeId, setCorrectionEmployeeId] = useState(null);
  const navigate = useNavigate();
  const isSuperadmin = (() => {
    try { return JSON.parse(atob((localStorage.getItem('admin_token') || '').split('.')[1])).position === 'Superadmin'; }
    catch { return false; }
  })();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Charts', group: 'Workspace' },
    { id: 'employees', label: 'Employee Directory', group: 'Workspace' },
    ...(isSuperadmin ? [{ id: 'manual-attendance', label: 'Manual Attendance', group: 'Workspace' }] : []),
    { id: 'salary', label: 'Salary', group: 'Workspace' },
    { id: 'audit', label: 'Attendance Audit', group: 'Workspace' },
    { id: 'logs', label: 'Daily Logs', group: 'Workspace' },
    { id: 'reports', label: 'Reports', group: 'Workspace' },
    { id: 'admin-management', label: 'Admin Management', group: 'Administration' },
    { id: 'audit-logs', label: 'Audit Logs', group: 'Administration' },
    { id: 'settings', label: 'Settings', group: 'Administration' }
  ];
  const handleLogout = () => { localStorage.removeItem('admin_token'); navigate('/admin/login'); };
  const handleNavClick = tabId => { setActiveTab(tabId); setIsSidebarOpen(false); };
  const renderContent = () => {
    switch (activeTab) {
      case 'logs':
        return <DailyLogs />;
      case 'employees':
      case 'register':
        return <EmployeeList isSuperadmin={isSuperadmin} />;
      case 'audit':
        return <AttendanceAudit />;
      case 'reports':
        return <AttendanceReports />;
      case 'salary':
        return <SalaryPage isSuperadmin={isSuperadmin} onCorrectAttendance={employeeId => { setCorrectionEmployeeId(employeeId); handleNavClick('manual-attendance'); }} />;
      case 'admin-management':
        return <AdminManagement />;
      case 'manual-attendance':
        return isSuperadmin ? <ManualAttendance initialEmployeeId={correctionEmployeeId} /> : <DashboardCharts />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'settings':
        return <Settings onNavigate={handleNavClick} />;
      case 'dashboard':
        return <DashboardCharts />;
      default:
        return <DashboardCharts />;
    }
  };

  return (
    <div className="admin-shell min-h-screen bg-slate-50 text-slate-900">
      <header className="portal-mobile-header md:hidden">
        <div><span className="brand-wordmark">JAJR</span><span className="ml-3 text-xs text-slate-500">Attendance workspace</span></div>
        <button type="button" aria-label="Open menu" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(true)} className="portal-secondary-button">Menu</button>
      </header>
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside aria-label="Main navigation" className={`portal-sidebar ${isSidebarOpen ? 'translate-x-0 is-open' : '-translate-x-full'} md:translate-x-0`}>
        <div className="portal-brand">
          <div className="flex items-start justify-between gap-3"><span className="brand-wordmark">JAJR</span><button type="button" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)} className="portal-secondary-button md:hidden">Close</button></div>
          <p className="mt-2 text-sm font-medium text-slate-600">People & attendance</p>
          <p className="mt-1 text-xs text-slate-400">Administration workspace</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 pb-6" aria-label="Admin pages">
          {['Workspace', 'Administration'].map(group => <div key={group} className="mt-6">
            <p className="portal-nav-group">{group}</p>
            <div className="space-y-1">{navItems.filter(item => item.group === group).map(item => <button key={item.id} type="button" data-testid={`nav-${item.id}`} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => handleNavClick(item.id)} className={`portal-nav-item ${activeTab === item.id ? 'is-active' : ''}`}>{item.label}</button>)}</div>
          </div>)}
        </nav>
        <div className="portal-sidebar-footer"><p className="text-xs text-slate-500">{isSuperadmin ? 'Superadmin access' : 'Administrator access'}</p><button type="button" data-testid="logout-button" onClick={handleLogout} className="mt-3 text-sm font-semibold text-slate-700 hover:text-slate-950">Logout</button></div>
      </aside>
      <main className="portal-main min-w-0">
        <div className="portal-workspace-bar"><p className="text-xs text-slate-500">Workspace <span className="mx-2 text-slate-300">/</span><span className="font-medium text-slate-700">{navItems.find(item => item.id === activeTab)?.label}</span></p><span className="portal-access-label">Admin portal</span></div>
        <div className="portal-page-content min-w-0">{renderContent()}</div>
      </main>
      <AIChatWidget activeTab={activeTab} onNavigate={handleNavClick} />
    </div>
  );
};
export default AdminLayout;
