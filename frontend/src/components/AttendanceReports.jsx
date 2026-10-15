import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import TableScroll from './UI/TableScroll';
import RecordCard from './UI/RecordCard';
import { attendanceDate } from '../utils/attendanceTime';

const AttendanceReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(attendanceDate(new Date()));
  const [startDate, setStartDate] = useState(attendanceDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState(attendanceDate(new Date()));
  const [year, setYear] = useState(Number(attendanceDate(new Date()).slice(0, 4)));
  const [month, setMonth] = useState(Number(attendanceDate(new Date()).slice(5, 7)));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Rate Limiting states
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const requestRef = useRef(0);

  const token = localStorage.getItem('admin_token');

  const fetchReport = async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setReportData(null);
    setError('');
    if (!token || (reportType === 'daily' && !date) ||
        (reportType === 'weekly' && (!startDate || !endDate || startDate > endDate))) {
      setError(!token ? 'Your session has expired. Please sign in again.' : 'Select valid dates with end date on or after start date.');
      setLoading(false);
      return;
    }

    try {
      let url = '';
      const params = new URLSearchParams();

      switch (reportType) {
        case 'daily':
          url = '/api/reports/daily';
          params.append('date', date);
          break;
        case 'weekly':
          url = '/api/reports/weekly';
          params.append('startDate', startDate);
          params.append('endDate', endDate);
          break;
        case 'monthly':
          url = '/api/reports/monthly';
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

      if (requestId !== requestRef.current) return;
      if (response.status === 429) {
        setError('Rate limit exceeded: Too many requests. Please wait a moment before trying again.');
        setReportData(null);
        return;
      }

      const data = await response.json();
      if (requestId !== requestRef.current) return;

      if (response.ok) {
        setReportData(data);
      } else {
        setError(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      if (requestId === requestRef.current) setError('Network error. Please check your connection.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchReport();
    return () => { requestRef.current++; };
  }, [reportType, date, startDate, endDate, year, month]);

  const exportToPDF = () => {
    if (loading || error || !reportData || !reportData.report || isExportingPDF) return;

    setIsExportingPDF(true);
    setTimeout(() => setIsExportingPDF(false), 2000);

    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    if (reportType === 'daily') {
      doc.text(`Date: ${reportData.date}`, 14, 42);
    } else if (reportType === 'weekly' || reportType === 'monthly') {
      doc.text(`Period: ${reportData.startDate} to ${reportData.endDate}`, 14, 42);
    }

    let y = 52;
    doc.setFontSize(10);
    const drawHeaders = () => {
      ['Name', 'Role', 'Days Present', 'Check-ins', 'Check-outs'].forEach((label, index) => {
        doc.text(label, [14, 88, 154, 202, 248][index], y);
      });
      y += 10;
    };
    drawHeaders();
    reportData.report.forEach(employee => {
      const name = doc.splitTextToSize(employee.name || 'N/A', 68);
      const role = doc.splitTextToSize(employee.role || 'N/A', 58);
      const height = Math.max(name.length, role.length) * 5 + 4;
      if (y + height > 195) { doc.addPage(); y = 20; drawHeaders(); }
      doc.text(name, 14, y);
      doc.text(role, 88, y);
      doc.text(String(employee.days_present || 0), 154, y);
      doc.text(String(employee.total_check_ins ?? employee.check_ins ?? 0), 202, y);
      doc.text(String(employee.total_check_outs ?? employee.check_outs ?? 0), 248, y);
      y += height;
    });

    doc.save(`${title}_${attendanceDate(new Date())}.pdf`);
  };

  const exportToExcel = () => {
    if (loading || error || !reportData || !reportData.report || isExportingExcel) return;

    setIsExportingExcel(true);
    setTimeout(() => setIsExportingExcel(false), 2000);

    const worksheet = XLSX.utils.json_to_sheet(reportData.report);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report`;
    XLSX.writeFile(workbook, `${title}_${attendanceDate(new Date())}.xlsx`);
  };

  // Pagination & Aggregation calculations
  const reportList = reportData?.report || [];
  const totalItems = reportList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReportItems = reportList.slice(indexOfFirstItem, indexOfLastItem);

  const totalCheckInsAgg = reportList.reduce((acc, curr) => acc + Number(curr.total_check_ins || curr.check_ins || 0), 0);
  const totalCheckOutsAgg = reportList.reduce((acc, curr) => acc + Number(curr.total_check_outs || curr.check_outs || 0), 0);
  const totalDaysPresentAgg = reportList.reduce((acc, curr) => acc + Number(curr.days_present || 0), 0);

  return (
    <div className="page-panel w-full min-w-0 space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex flex-wrap items-center gap-2">
             Attendance Reports & Analytics
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium border border-slate-200">
              Export Engine
            </span>
          </h2>
          <p className="text-slate-500 text-xs">Generate comprehensive daily, weekly, and monthly attendance reports.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToPDF}
            disabled={!reportData || !!error || loading || isExportingPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5">
             {isExportingPDF ? 'Exporting PDF...' : 'Export PDF'}
          </button>
          <button
            onClick={exportToExcel}
            disabled={!reportData || !!error || loading || isExportingExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5">
             {isExportingExcel ? 'Exporting Excel...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Report Mode Tabs & Controls */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-4">
        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
          <div className="flex min-w-0 flex-wrap items-center bg-slate-200/60 p-1 rounded-xl gap-1">
            <button
              onClick={() => setReportType('daily')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                reportType === 'daily'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
               Daily Report
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                reportType === 'weekly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
               Weekly Range
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                reportType === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
               Monthly Summary
            </button>
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5">
             {loading ? 'Loading...' : 'Refresh Report'}
          </button>
        </div>

        {/* Dynamic Controls per Report Type */}
        <div className="flex flex-wrap items-center gap-4">
          {reportType === 'daily' && (
            <div>
              <label htmlFor="reportDate" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Select Date
              </label>
              <input
                id="reportDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          )}

          {reportType === 'weekly' && (
            <>
              <div>
                <label htmlFor="startDate" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  End Date
                </label>
                <input
                  id="endDate"
                  min={startDate || undefined}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label htmlFor="reportYear" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Year
                </label>
                <input
                  id="reportYear"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  min="2020"
                  max="2030"
                />
              </div>
              <div>
                <label htmlFor="reportMonth" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Month
                </label>
                <select
                  id="reportMonth"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employees</p>
              <p className="text-xl font-extrabold text-slate-900">{totalItems}</p>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-4 flex items-center gap-3">

            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Days Present Sum</p>
              <p className="text-xl font-extrabold text-blue-900">{totalDaysPresentAgg}</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3">

            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Total Check-Ins</p>
              <p className="text-xl font-extrabold text-emerald-900">{totalCheckInsAgg}</p>
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3">

            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Total Check-Outs</p>
              <p className="text-xl font-extrabold text-rose-900">{totalCheckOutsAgg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
           {error}
        </div>
      )}

      {/* Report Results Table */}
      <div className="min-w-0 border border-slate-100 rounded-2xl">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <span className="text-slate-500 text-xs font-medium">Generating report data...</span>
          </div>
        ) : reportData && reportData.report && reportData.report.length > 0 ? (
          <div>
            <div className="space-y-3 p-3 md:hidden" data-testid="mobile-record-list">
              {currentReportItems.map((employee, index) => (
                <RecordCard
                  key={employee.id || index}
                  testId={`report-card-${employee.id || index}`}
                  title={employee.name || 'N/A'}
                  badge={<span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Role: {employee.role || 'Staff'}</span>}
                  fields={[
                    { label: 'Days present', value: employee.days_present || 0 },
                    { label: 'Check-ins', value: employee.total_check_ins || employee.check_ins || 0 },
                    { label: 'Check-outs', value: employee.total_check_outs || employee.check_outs || 0 },
                  ]}
                  details={reportType === 'daily' ? [
                    { label: 'First check-in', value: employee.first_check_in ? new Date(employee.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A' },
                    { label: 'Last check-out', value: employee.last_check_out ? new Date(employee.last_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A' },
                  ] : []}
                />
              ))}
            </div>
            <TableScroll className="hidden md:block">
              <table className="w-full min-w-max text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Role / Position</th>
                    <th className="py-3 px-4">Days Present</th>
                    <th className="py-3 px-4">Check-ins</th>
                    <th className="py-3 px-4">Check-outs</th>
                    {reportType === 'daily' && (
                      <>
                        <th className="py-3 px-4">First Check-in</th>
                        <th className="py-3 px-4">Last Check-out</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentReportItems.map((employee, index) => (
                    <tr key={employee.id || index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{employee.name || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {employee.role || 'Staff'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{employee.days_present || 0}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md">
                          {employee.total_check_ins || employee.check_ins || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md">
                          {employee.total_check_outs || employee.check_outs || 0}
                        </span>
                      </td>
                      {reportType === 'daily' && (
                        <>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {employee.first_check_in ? new Date(employee.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {employee.last_check_out ? new Date(employee.last_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span>
                    Showing <strong className="text-slate-900">{indexOfFirstItem + 1}</strong> to{' '}
                    <strong className="text-slate-900">{Math.min(indexOfLastItem, totalItems)}</strong> of{' '}
                    <strong className="text-slate-900">{totalItems}</strong> records
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Rows:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none">
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
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold rounded-lg transition-colors">
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, array) => {
                      const prevPage = array[idx - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                              currentPage === p
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                            }`}>
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold rounded-lg transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">

            <p className="text-slate-500 text-xs font-semibold">No attendance report data available for selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReports;
