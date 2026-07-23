import React, { useState, useEffect } from 'react';
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

  const token = localStorage.getItem('admin_token');

  const fetchReport = async () => {
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
    fetchReport();
  }, [reportType, date, startDate, endDate, year, month]);

  const exportToPDF = () => {
    if (!reportData || !reportData.report) return;

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
    if (!reportData || !reportData.report) return;

    const worksheet = XLSX.utils.json_to_sheet(reportData.report);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report`;
    XLSX.writeFile(workbook, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Attendance Reports</h2>

      {/* Report Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Report Type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full md:w-64 p-2 border rounded"
        >
          <option value="daily">Daily Report</option>
          <option value="weekly">Weekly Report</option>
          <option value="monthly">Monthly Report</option>
        </select>
      </div>

      {/* Date Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportType === 'daily' && (
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        {reportType === 'weekly' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        )}

        {reportType === 'monthly' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
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

      {/* Export Buttons */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={exportToPDF}
          disabled={!reportData || loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Export PDF
        </button>
        <button
          onClick={exportToExcel}
          disabled={!reportData || loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Export Excel
        </button>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Report Table */}
      {loading ? (
        <div className="text-center py-8">Loading report...</div>
      ) : reportData && reportData.report ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">Name</th>
                <th className="px-4 py-2 border text-left">Role</th>
                <th className="px-4 py-2 border text-left">Days Present</th>
                <th className="px-4 py-2 border text-left">Check-ins</th>
                <th className="px-4 py-2 border text-left">Check-outs</th>
                {reportType === 'daily' && (
                  <>
                    <th className="px-4 py-2 border text-left">First Check-in</th>
                    <th className="px-4 py-2 border text-left">Last Check-out</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {reportData.report.map((employee, index) => (
                <tr key={employee.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{employee.name || 'N/A'}</td>
                  <td className="px-4 py-2 border">{employee.role || 'N/A'}</td>
                  <td className="px-4 py-2 border">{employee.days_present || 0}</td>
                  <td className="px-4 py-2 border">{employee.total_check_ins || employee.check_ins || 0}</td>
                  <td className="px-4 py-2 border">{employee.total_check_outs || employee.check_outs || 0}</td>
                  {reportType === 'daily' && (
                    <>
                      <td className="px-4 py-2 border">
                        {employee.first_check_in ? new Date(employee.first_check_in).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 border">
                        {employee.last_check_out ? new Date(employee.last_check_out).toLocaleTimeString() : 'N/A'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {reportData.report.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No attendance data found for the selected period.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No report data available.
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
