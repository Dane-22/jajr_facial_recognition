import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const lastFetchRef = useRef(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Debounce search term by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    fetchEmployees();
  }, [debouncedSearchTerm, roleFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    let isMounted = true;

    const loadFaceApiModels = async () => {
      // Only load models when camera is being used
      if (!isCapturing) return;

      try {
        console.log('Loading face-api models...');
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        if (isMounted) {
          console.log('Face-api models loaded successfully');
          setModelsLoaded(true);
          setModelLoadingError(false);
        }
      } catch (error) {
        console.error('Error loading face-api models:', error);
        if (isMounted) {
          setModelLoadingError(true);
          setError('Failed to load face recognition models. Please refresh the page and try again.');
        }
      }
    };

    loadFaceApiModels();

    return () => {
      isMounted = false;
    };
  }, [isCapturing]);

  const fetchEmployees = async () => {
    const now = Date.now();
    // Rate limiter throttle check (min 300ms between calls)
    if (now - lastFetchRef.current < 300) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`http://localhost:5000/api/employees?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 429) {
        setError('Rate limit exceeded: Too many requests. Please wait a moment before trying again.');
        setEmployees([]);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setEmployees(data.employees || []);
      } else {
        setError(data.error || 'Failed to fetch employees');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({ name: '', role: '' });
    setFaceDescriptor(null);
    setShowModal(true);
  };

  const startCamera = useCallback(async () => {
    try {
      console.log('Starting camera...');
      setIsCapturing(true);
    } catch (error) {
      console.error('Error in startCamera:', error);
      setError('Failed to start camera. Please try again.');
    }
  }, []);

  // Handle camera startup after video element is mounted
  useEffect(() => {
    if (isCapturing && videoRef.current && !videoRef.current.srcObject) {
      console.log('Video element mounted, starting camera stream...');
      navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      .then(stream => {
        console.log('Camera stream obtained:', stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Camera started successfully');
        }
      })
      .catch(error => {
        console.error('Error accessing webcam:', error);
        setIsCapturing(false);
        if (error.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError('Failed to access camera: ' + error.message);
        }
      });
    }
  }, [isCapturing]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  }, []);

  const captureFaceDescriptor = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) return;

    try {
      setIsProcessing(true);
      setError('');

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const drawBox = new faceapi.draw.DrawBox(resizedDetections.detection.box, {
          label: 'Face Detected',
          boxColor: '#00ff00',
          lineWidth: 2
        });
        drawBox.draw(canvas);

        setFaceDescriptor(Array.from(detections.descriptor));
      } else {
        setError('No face detected. Please position your face clearly in the frame.');
      }
    } catch (error) {
      console.error('Error capturing face:', error);
      setError('Failed to capture face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({ name: employee.name, role: employee.role });
    setFaceDescriptor(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:5000/api/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete employee');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // For new employees, require face descriptor
    if (!editingEmployee && !faceDescriptor) {
      setError('Please capture a face descriptor first for new employees');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const url = editingEmployee 
        ? `http://localhost:5000/api/employees/${editingEmployee.id}`
        : 'http://localhost:5000/api/employees';
      
      const method = editingEmployee ? 'PUT' : 'POST';

      const payload = editingEmployee 
        ? formData 
        : { ...formData, face_descriptor: faceDescriptor };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (editingEmployee) {
          setEmployees(employees.map(emp => 
            emp.id === editingEmployee.id ? data.employee : emp
          ));
        } else {
          setEmployees([data.employee, ...employees]);
        }
        setShowModal(false);
        setFormData({ name: '', role: '' });
        setFaceDescriptor(null);
        setEditingEmployee(null);
        stopCamera();
      } else {
        setError(data.error || 'Failed to save employee');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setRoleFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalItems = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Employee Management</h2>
              <p className="text-slate-500 text-sm">Create, view, update, and delete employees</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-sm font-medium rounded-xl transition-colors duration-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              <div className="relative">
                <input
                  type="text"
                  data-testid="employee-search-input"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all duration-200 w-64"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                data-testid="add-employee-button"
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors duration-200 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <input
                type="text"
                placeholder="Filter by role..."
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              >
                <option value="created_at">Created Date</option>
                <option value="name">Name</option>
                <option value="role">Role</option>
                <option value="id">ID</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-sm font-medium rounded-xl transition-colors duration-200">
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm mb-1 font-medium">Total Employees</p>
              <p className="text-3xl font-bold text-slate-900">{employees.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm mb-1 font-medium">Roles</p>
              <p className="text-3xl font-bold text-slate-900">
                {[...new Set(employees.map(emp => emp.role))].length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4" data-testid="employee-error-message">
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">All Employees</h3>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold">No employees found</p>
              <p className="text-slate-500 text-sm mt-1">Click "Add Employee" to create one</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[18rem]">
              <table className="w-full" data-testid="employee-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {currentEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        #{employee.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200/80 font-medium rounded-lg text-xs">
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(employee.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            data-testid={`edit-employee-${employee.id}`}
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                            title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            data-testid={`delete-employee-${employee.id}`}
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {employees.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>
                Showing <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(indexOfLastItem, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{totalItems}</span> employees
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="employeeItemsPerPage" className="text-xs text-slate-500 font-medium">Rows per page:</label>
                <select
                  id="employeeItemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-2 text-xs text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    data-testid="employee-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Enter employee name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    data-testid="employee-role-input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Enter employee role"
                    required
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Face Registration</h4>
                    {!isCapturing ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={!modelsLoaded || modelLoadingError}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200">
                        {modelLoadingError ? 'Model Load Failed' : modelsLoaded ? 'Start Camera' : 'Loading Models...'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                        Stop Camera
                      </button>
                    )}
                  </div>

                  {modelLoadingError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">Failed to load face recognition models. Please refresh the page.</p>
                    </div>
                  )}

                  {isCapturing && (
                    <div className="w-full h-[300px] bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            videoRef.current.play();
                          }
                        }}/>
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full"/>
                      <button
                        type="button"
                        onClick={captureFaceDescriptor}
                        disabled={isProcessing}
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md px-6 py-3 bg-white hover:bg-slate-100 disabled:bg-slate-300 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors duration-200">
                        {isProcessing ? 'Processing...' : 'Capture Face'}
                      </button>
                    </div>
                  )}

                  {faceDescriptor && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-green-400 text-sm font-medium">Face descriptor captured successfully</p>
                      </div>
                    </div>
                  )}

                  {!editingEmployee && !faceDescriptor && (
                    <p className="text-slate-400 text-xs">* Face registration is required for new employees</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  data-testid="cancel-employee-button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: '', role: '' });
                    setFaceDescriptor(null);
                    setEditingEmployee(null);
                    stopCamera();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-medium rounded-xl transition-colors duration-200">
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-employee-button"
                  disabled={!editingEmployee && !faceDescriptor}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors duration-200">
                  {editingEmployee ? 'Update' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
