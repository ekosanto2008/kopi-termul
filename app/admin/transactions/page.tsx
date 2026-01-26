'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  final_amount: number | null;
  payment_method: string;
  payment_status: string;
  customers: {
    name: string;
  } | null;
}

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  // Raw Data (All transactions for the month)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  // Filtered & Paginated Data
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Fetch Data when Month/Year changes
  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedYear]);

  // 2. Filter & Paginate when Data, Search, or Page changes
  useEffect(() => {
    applyFilters();
  }, [allTransactions, searchTerm, page]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      // Fetch ALL transactions for the month (Limit 2000 for safety)
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, final_amount, payment_method, payment_status, customers(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;

      setAllTransactions(data as any[] || []);
      setPage(1); // Reset to page 1 on new fetch

    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allTransactions;

    // Client-side Search (Matches ID or Customer Name)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = allTransactions.filter(t => 
        t.id.toLowerCase().includes(lowerTerm) || 
        t.customers?.name?.toLowerCase().includes(lowerTerm)
      );
    }

    setTotalCount(filtered.length);

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    setDisplayedTransactions(filtered.slice(from, to));
  };

  const handleExportExcel = () => {
    try {
      const excelData = allTransactions.map((t: any) => ({
        'Order ID': t.id,
        'Date': new Date(t.created_at).toLocaleDateString('id-ID'),
        'Time': new Date(t.created_at).toLocaleTimeString('id-ID'),
        'Customer': t.customers?.name || 'Guest',
        'Payment Method': t.payment_method.toUpperCase(),
        'Status': t.payment_status,
        'Total Amount': t.final_amount || t.total_amount
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      const fileName = `Transactions_${months[selectedMonth]}_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      alert('Export Excel failed');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      doc.text(`Transaction Report: ${months[selectedMonth]} ${selectedYear}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, 14, 22);

      const tableData = allTransactions.map((t: any) => [
        t.id.slice(0, 8),
        new Date(t.created_at).toLocaleDateString('id-ID'),
        t.customers?.name || 'Guest',
        t.payment_method.toUpperCase(),
        (t.final_amount || t.total_amount).toLocaleString('id-ID'),
        t.payment_status
      ]);

      autoTable(doc, {
        head: [['Order ID', 'Date', 'Customer', 'Payment', 'Total (Rp)', 'Status']],
        body: tableData,
        startY: 30,
      });

      doc.save(`Transactions_${months[selectedMonth]}_${selectedYear}.pdf`);
    } catch (e) {
      alert('Export PDF failed');
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileText className="w-5 h-5" />
              PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search ID or Customer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to page 1 on search
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-900"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-900"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center gap-2 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading transactions...
                      </div>
                    </td>
                  </tr>
                ) : displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  displayedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        #{t.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{new Date(t.created_at).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {t.customers?.name || 'Guest'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase
                          ${t.payment_method === 'qris' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                        `}>
                          {t.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        Rp {(t.final_amount || t.total_amount)?.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs border border-green-100 capitalize">
                          {t.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalCount > 0 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
