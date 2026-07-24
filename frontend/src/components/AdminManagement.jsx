import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalError, setModalError] = useState('');

  // Logged-in admin state from token/localStorage
  const [currentUser, setCurrentUser] = useState(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form States
  const [addForm, setAddForm] = useState({ username: '', password: '', confirmPassword: '', position: 'Admin' });
  const [editForm, setEditForm] = useState({ username: '', position: 'Admin', password: '' });
  const [showAddPw, setShowAddPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  useEffect(() => {
    // Parse current user from JWT token
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (err) {
        console.error('Error parsing admin token:', err);
      }
    }
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      } else {
        setErrorMsg('Failed to load admin accounts.');
      }
    } catch (err) {
      setErrorMsg('Network error while fetching admins.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback to true if position is Superadmin, or if logged in as default admin (#1) or legacy token without position claim
  const isSuperadmin = !currentUser?.position || currentUser?.position === 'Superadmin' || currentUser?.username === 'admin' || currentUser?.id === 1;

  // Password strength checker
  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: 'Empty', color: 'bg-slate-200' };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setModalError('');

    if (addForm.password !== addForm.confirmPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    if (addForm.password.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: addForm.username,
          password: addForm.password,
          position: addForm.position
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`Admin account "${addForm.username}" created successfully!`);
        setIsAddModalOpen(false);
        setAddForm({ username: '', password: '', confirmPassword: '', position: 'Admin' });
        setModalError('');
        fetchAdmins();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setModalError(data.error || 'Failed to create admin account.');
      }
    } catch (err) {
      setModalError('Network error while creating admin.');
    }
  };

  const handleEditAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setModalError('');

    if (editForm.password && editForm.password.length < 8) {
      setModalError('New password must be at least 8 characters long.');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editForm.username,
          position: editForm.position,
          password: editForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`Admin account "${editForm.username}" updated successfully!`);
        setIsEditModalOpen(false);
        setSelectedAdmin(null);
        setModalError('');
        fetchAdmins();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setModalError(data.error || 'Failed to update admin account.');
      }
    } catch (err) {
      setModalError('Network error while updating admin.');
    }
  };

  const handleDeleteAdminSubmit = async () => {
    if (!selectedAdmin) return;
    setErrorMsg('');
    setSuccessMsg('');
    setModalError('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/${selectedAdmin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`Admin account "${selectedAdmin.username}" deleted.`);
        setIsDeleteModalOpen(false);
        setSelectedAdmin(null);
        setModalError('');
        fetchAdmins();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setModalError(data.error || 'Failed to delete admin account.');
      }
    } catch (err) {
      setModalError('Network error while deleting admin.');
    }
  };

  const openAddModal = () => {
    setModalError('');
    setAddForm({ username: '', password: '', confirmPassword: '', position: 'Admin' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (admin) => {
    setModalError('');
    setSelectedAdmin(admin);
    setEditForm({ username: admin.username, position: admin.position || 'Admin', password: '' });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (admin) => {
    setModalError('');
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const filteredAdmins = admins.filter(a =>
    a.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.position && a.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pwAddStrength = getPasswordStrength(addForm.password);

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            Admin Management
          </h2>
          <p className="text-slate-500 text-xs">Manage administrative users, positions, and authentication credentials.</p>
        </div>

        {isSuperadmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 justify-center">
            <span>➕</span> Register New Admin
          </button>
        )}
      </div>

      {/* Global Status Messages */}
      {(successMsg || errorMsg) && (
        <div className="px-6 pt-4 space-y-2">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span>✅</span> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="text-xs text-rose-500 hover:text-rose-700 font-bold">✕</button>
            </div>
          )}
        </div>
      )}

      {/* Filter / Search Controls */}
      <div className="p-6 pb-2">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Search by username or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table Container */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Position / Role</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                  Loading administrator accounts...
                </td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                  No admin accounts found matching "{searchTerm}"
                </td>
              </tr>
            ) : (
              filteredAdmins.map((admin) => {
                const isSelf = currentUser?.id === admin.id;

                return (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{admin.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      {admin.username}
                      {isSelf && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-md font-bold border border-blue-200">
                          Active Account
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {admin.position === 'Superadmin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 text-[11px] font-bold rounded-lg border border-purple-200">
                          👑 Superadmin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200">
                          👤 Admin
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(admin.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isSuperadmin ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors">
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(admin)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold rounded-lg transition-colors border border-rose-200">
                            🗑️ Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Read-Only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL 1: ADD NEW ADMIN ─────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                ➕ Register New Admin Account
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between">
                <span>⚠️ {modalError}</span>
                <button onClick={() => setModalError('')} className="text-xs text-rose-500 hover:text-rose-700 font-bold">✕</button>
              </div>
            )}

            <form onSubmit={handleAddAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="e.g. manager_jajr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Position / Privilege Level</label>
                <select
                  value={addForm.position}
                  onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="Admin">👤 Regular Admin (Standard Access)</option>
                  <option value="Superadmin">👑 Superadmin (Full Access & Admin Management)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showAddPw ? 'text' : 'password'}
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPw(!showAddPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs">
                    {showAddPw ? '🙈' : '👁️'}
                  </button>
                </div>

                {addForm.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Strength</span>
                      <span>{pwAddStrength.label}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${pwAddStrength.color}`} style={{ width: `${pwAddStrength.score}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT ADMIN ───────────────────────────────────────── */}
      {isEditModalOpen && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                ✏️ Edit Admin Account (#{selectedAdmin.id})
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between">
                <span>⚠️ {modalError}</span>
                <button onClick={() => setModalError('')} className="text-xs text-rose-500 hover:text-rose-700 font-bold">✕</button>
              </div>
            )}

            <form onSubmit={handleEditAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Position / Privilege Level</label>
                <select
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="Admin">👤 Regular Admin</option>
                  <option value="Superadmin">👑 Superadmin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reset Password <span className="text-[10px] font-normal text-slate-400">(Optional — leave blank to keep existing)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPw ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter new password to reset"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPw(!showEditPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs">
                    {showEditPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE CONFIRMATION ──────────────────────────────── */}
      {isDeleteModalOpen && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto">
              ⚠️
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between text-left">
                <span>⚠️ {modalError}</span>
                <button onClick={() => setModalError('')} className="text-xs text-rose-500 hover:text-rose-700 font-bold">✕</button>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Admin Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete administrator account <strong className="text-slate-900">"{selectedAdmin.username}"</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={handleDeleteAdminSubmit}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
