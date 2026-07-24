import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const AttendanceReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Rate Limiting states
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const lastFetchRef = useRef(0);

  const token = localStorage.getItem('admin_token');

  const fetchReport = async () => {
    const now = Date.now();
    // Rate limit throttle check (min 300ms between calls)
    if (now - lastFetchRef.current < 300) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError('');
    
    try {
      let url = '';
      const params = new URLSearchParams();
      
      switch (reportType) {
        case 'daily':
          url = 'http://localhost:5000/api/reports/daily';
          params.append('date', date);
          break;
        case 'weekly':
          url = 'http://localhost:5000/api/reports/weekly';
          params.append('startDate', startDate);
          params.append('endDate', endDate);
          break;
        case 'monthly':
          url = 'http://localhost:5000/api/reports/monthly';
          params.append('year', year);
          params.append('month', month);
          break;
        default:
          throw new Error('Invalid report type');
      }

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 429) {
        setError('Rate limit exceeded: Too many requests. Please wait a moment before trying again.');
        setReportData(null);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setReportData(data);
      } else {
        setError(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchReport();
  }, [reportType, date, startDate, endDate, year, month]);

  const exportToPDF = () => {
    if (!reportData || !reportData.report || isExportingPDF) return;

    setIsExportingPDF(true);
    setTimeout(() => setIsExportingPDF(false), 2000);

    const doc = new jsPDF();
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    if (reportType === 'daily') {
      doc.text(`Date: ${reportData.date}`, 14, 42);
    } else if (reportType === 'weekly') {
      doc.text(`Period: ${reportData.startDate} to ${reportData.endDate}`, 14, 42);
    } else if (reportType === 'monthly') {
      doc.text(`Period: ${reportData.startDate} to ${reportData.endDate}`, 14, 42);
    }

    let y = 52;
    doc.setFontSize(10);
    
    // Table headers
    doc.text('Name', 14, y);
    doc.text('Role', 60, y);
    doc.text('Days Present', 110, y);
    doc.text('Check-ins', 150, y);
    doc.text('Check-outs', 190, y);
    
    y += 10;
    
    // Table data
    reportData.report.forEach((employee, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(employee.name || 'N/A', 14, y);
      doc.text(employee.role || 'N/A', 60, y);
      doc.text(String(employee.days_present || 0), 110, y);
      doc.text(String(employee.total_check_ins || employee.check_ins || 0), 150, y);
      doc.text(String(employee.total_check_outs || employee.check_outs || 0), 190, y);
      
      y += 8;
    });

    doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData || !reportData.report || isExportingExcel) return;

    setIsExportingExcel(true);
    setTimeout(() => setIsExportingExcel(false), 2000);

    const worksheet = XLSX.utils.json_to_sheet(reportData.report);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report`;
    XLSX.writeFile(workbook, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Pagination calculations
  const reportList = reportData?.report || [];
  const totalItems = reportList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReportItems = reportList.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="w-full border-b border-slate-100 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Attendance Reports</h2>
          <p className="text-slate-500 text-xs">Generate and export attendance reports</p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="reportType" className="text-slate-600 text-sm font-medium">
            Report Type:
          </label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="daily">Daily Report</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
          </select>
        </div>
      </div>

      {/* Date Filters */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {reportType === 'daily' && (
            <div>
              <label htmlFor="date" className="block text-xs font-medium text-slate-600 mb-1.5">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
              />
            </div>
          )}

          {reportType === 'weekly' && (
            <>
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-slate-600 mb-1.5">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
                />
              </div>
            </>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label htmlFor="year" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Year
                </label>
                <input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
                  min="2020"
                  max="2030"
                />
              </div>
              <div>
                <label htmlFor="month" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Month
                </label>
                <select
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="border-b border-slate-100 px-4 py-4 flex gap-3">
        <button
          onClick={exportToPDF}
          disabled={!reportData || loading || isExportingPDF}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200">
          {isExportingPDF ? 'Exporting PDF...' : 'Export PDF'}
        </button>
        <button
          onClick={exportToExcel}
          disabled={!reportData || loading || isExportingExcel}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200">
          {isExportingExcel ? 'Exporting Excel...' : 'Export Excel'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Report Table */}
      <div className="w-full">
        <div className="border-b border-slate-100 px-4 py-4">
          <h3 className="text-sm font-bold text-slate-900">Report Results</h3>
        </div>
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex py-12 items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mr-4" />
              <p className="text-slate-500 text-sm font-medium">Loading report...</p>
            </div>
          ) : reportData && reportData.report ? (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Days Present</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Check-ins</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Check-outs</th>
                      {reportType === 'daily' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">First Check-in</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Last Check-out</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentReportItems.map((employee, index) => (
                      <tr key={employee.id || index} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{employee.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{employee.role || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{employee.days_present || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{employee.total_check_ins || employee.check_ins || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{employee.total_check_outs || employee.check_outs || 0}</td>
                        {reportType === 'daily' && (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {employee.first_check_in ? new Date(employee.first_check_in).toLocaleTimeString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {employee.last_check_out ? new Date(employee.last_check_out).toLocaleTimeString() : 'N/A'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {reportList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>
                      Showing <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-semibold text-slate-900">
                        {Math.min(indexOfLastItem, totalItems)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-900">{totalItems}</span> records
                    </span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="reportItemsPerPage" className="text-xs text-slate-500 font-medium">Rows per page:</label>
                      <select
                        id="reportItemsPerPage"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
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
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
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
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              {reportData.report.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No attendance data found for the selected period.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">No report data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;
