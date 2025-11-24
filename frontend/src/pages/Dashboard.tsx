import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Archive, RefreshCw, LogOut, Mail, FileText, 
  Paperclip, PieChart as ChartIcon, Sparkles, 
  Briefcase, User, CreditCard, Megaphone, AlertCircle, X, ClipboardList,
  Download, ChevronLeft, ChevronRight, Inbox, Image as ImageIcon, Search, Trash2, ShieldAlert,
  Clock
} from 'lucide-react'; // Added Clock explicitly
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Attachment {
  name: string;
  type: string;
  id: string;
}

interface Email {
  gmailId: string;
  subject: string;
  sender: string;
  snippet: string;
  receivedDate: string;
  bodyHtml?: string;
  bodyText?: string;
  aiSummary?: string;
  attachments: Attachment[];
  category?: string;
  priority?: string;
  topics?: string[];
  isSensitive?: boolean;
  sensitiveType?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); 
  const [showContent, setShowContent] = useState(false);
  
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');

  const getSenderName = (raw: string) => raw ? raw.split('<')[0].replace(/"/g, '').trim() : 'Unknown';
  
  const getAttachmentIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('financial') || t.includes('bill') || t.includes('invoice')) return <CreditCard size={16} className="text-green-600" />;
    if (t.includes('document') || t.includes('pdf') || t.includes('resume')) return <FileText size={16} className="text-blue-600" />;
    if (t.includes('media') || t.includes('image') || t.includes('photo')) return <ImageIcon size={16} className="text-purple-600" />;
    if (t.includes('data') || t.includes('xls')) return <ChartIcon size={16} className="text-orange-600" />;
    return <Paperclip size={16} className="text-gray-500" />;
  };

  const handleAttachmentClick = (msgId: string, attId: string, filename: string) => {
    const url = `http://localhost:3000/email/${msgId}/attachment/${attId}?filename=${encodeURIComponent(filename)}`;
    window.open(url, '_blank');
  };

  const fetchEmails = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get('/email/messages'); 
      setEmails(res.data || []); // Safe default
    } catch (err) { console.error("Fetch failed", err); } 
    finally { if (!isBackground) setLoading(false); }
  };

  const handleManualSync = async (isBackground = false, isUserAction = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.post('/email/sync', { isUserAction }); 
      setEmails(res.data || []); // Safe default
    } catch (err) { console.error("Sync failed", err); } 
    finally { if (!isBackground) setLoading(false); }
  };

  const handleSearch = async (e: React.FormEvent | null, query: string) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      fetchEmails();
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/email/search?q=${encodeURIComponent(query)}`);
      setEmails(res.data || []); // Safe default
    } catch (err) { console.error("Search failed", err); }
    finally { setLoading(false); }
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if(val === '') fetchEmails();
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/email/stats');
      setStats(res.data);
      setShowStats(true);
    } catch (err) { console.error("Stats failed", err); }
  };
   const cleanPromotions = async () => {
    if (!confirm("Are you sure you want to delete ALL Promotion emails? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const res = await api.delete('/email/cleanup/category?category=Promotions');
      alert(res.data.message);
      fetchEmails(); // Refresh list
      fetchStats();  // Refresh charts
    } catch (err) { console.error("Cleanup failed", err); }
    finally { setLoading(false); }
  };

  const runRetention = async () => {
    // Using 60 days (2 month) for the demo button
    if (!confirm("Run Retention Policy? This will delete emails older than 60 Days.")) return;

    setLoading(true);
    try {
      const res = await api.delete('/email/cleanup/retention?days=60');
      alert(res.data.message);
      fetchEmails();
      fetchStats();
    } catch (err) { console.error("Retention failed", err); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const headers = ["Subject", "Sender", "Date", "Category", "Priority", "Summary"];
    recordLog('EXPORT_CSV', 'Downloaded full CSV report');
    const rows = emails.map(e => [
      `"${(e.subject || '').replace(/"/g, '""')}"`,
      `"${getSenderName(e.sender)}"`,
      `"${new Date(e.receivedDate).toLocaleDateString()}"`,
      e.category || 'General',
      e.priority || 'Medium',
      `"${(e.aiSummary || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `email_archive.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    recordLog('EXPORT_PDF', 'Downloaded full PDF report');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Email Archive Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    const tableData = emails.map(e => [
      (e.subject || '').substring(0, 30) + '...',
      getSenderName(e.sender),
      new Date(e.receivedDate).toLocaleDateString(),
      e.category || 'General',
      e.priority || 'Medium'
    ]);
    autoTable(doc, {
      head: [['Subject', 'Sender', 'Date', 'Category', 'Priority']],
      body: tableData,
      startY: 40,
    });
    doc.save(`email_archive_report.pdf`);
  };

  useEffect(() => {
    if (searchQuery) return;
    fetchEmails();
    handleManualSync(false, false); 
    const intervalId = setInterval(() => { fetchEmails(true); }, 10000);
    return () => clearInterval(intervalId);
  }, [searchQuery]);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/logs');
      setLogs(res.data);
      setShowLogs(true);
    } catch (err) { console.error("Log fetch failed", err); }
  };

  // Helper to record Client-Side actions (Exporting)
  const recordLog = async (action: string, details: string) => {
    try {
      await api.post('/logs', { action, details });
    } catch (err) { console.error("Logging failed", err); }
  };

  // const filteredEmails = emails.filter(e => {
  //   if (searchQuery) return true;
  //   if (filter === 'ALL') return true;
  //   if (['Work', 'Personal', 'Finance', 'Promotions'].includes(filter)) return e.category === filter;
  //   return true;
  // });
  const filteredEmails = emails.filter(e => {
    // 1. First, check if it matches the Folder Filter
    let matchesFolder = false;
    if (filter === 'ALL') matchesFolder = true;
    else if (['Work', 'Personal', 'Finance', 'Promotions'].includes(filter)) matchesFolder = e.category === filter;
    else matchesFolder = true;

    // 2. If not matching folder, hide it immediately
    if (!matchesFolder) return false;

    // 3. If searching, DOES IT ALSO MATCH THE SEARCH?
    if (searchQuery) {
       // (Backend sends filtered list, but we double check or just trust backend return)
       // Since your backend search returns GLOBAL results, 
       // we rely on the "Switch to ALL" fix above.
       return true; 
    }

    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-gray-300 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}>
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} text-white font-bold text-xl`}>
          {isSidebarOpen && (<div className="flex items-center gap-2"><Archive className="text-blue-500" /> <span>Archiver</span></div>)}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:bg-gray-800 p-1 rounded transition">
            {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
          <button onClick={() => setFilter('ALL')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${filter === 'ALL' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'} ${!isSidebarOpen && 'justify-center'}`}>
            <Inbox size={18} /> {isSidebarOpen && "All Mail"}
          </button>
          {isSidebarOpen && <div className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2">Smart Folders</div>}
          <button onClick={() => setFilter('Work')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${filter === 'Work' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'} ${!isSidebarOpen && 'justify-center'}`} title="Work">
            <Briefcase size={18} className="text-orange-400" /> {isSidebarOpen && "Work"}
          </button>
          <button onClick={() => setFilter('Personal')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${filter === 'Personal' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'} ${!isSidebarOpen && 'justify-center'}`} title="Personal">
            <User size={18} className="text-green-400" /> {isSidebarOpen && "Personal"}
          </button>
          <button onClick={() => setFilter('Finance')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${filter === 'Finance' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'} ${!isSidebarOpen && 'justify-center'}`} title="Finance">
            <CreditCard size={18} className="text-purple-400" /> {isSidebarOpen && "Finance"}
          </button>
          <button onClick={() => setFilter('Promotions')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${filter === 'Promotions' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'} ${!isSidebarOpen && 'justify-center'}`} title="Promotions">
            <Megaphone size={18} className="text-yellow-400" /> {isSidebarOpen && "Promotions"}
          </button>
          <div className="mt-8">
            <button onClick={fetchStats} className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Analytics">
              <ChartIcon size={16} /> {isSidebarOpen && "Analytics"}
            </button>
          </div>
          <div className={`mt-4 space-y-2 border-t border-gray-800 pt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
            {isSidebarOpen && <div className="text-xs font-bold text-gray-500 uppercase mb-2">Exports</div>}
            <button onClick={exportCSV} className={`w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg flex items-center gap-2 text-sm transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Export CSV">
              <FileText size={16} /> {isSidebarOpen && "CSV"}
            </button>
            <button onClick={exportPDF} className={`w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg flex items-center gap-2 text-sm transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Export PDF">
              <Download size={16} /> {isSidebarOpen && "PDF"}
            </button>
            <button onClick={fetchLogs} className={`w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg flex items-center gap-2 text-sm transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Audit Logs">
              <ClipboardList size={16} /> {isSidebarOpen && "Audit Logs"}
            </button>
          </div>

          <div className={`mt-4 space-y-2 border-t border-gray-800 pt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
            {isSidebarOpen && <div className="text-xs font-bold text-gray-500 uppercase mb-2">Maintenance</div>}
            
            <button onClick={cleanPromotions} className={`w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 py-2 rounded-lg flex items-center gap-2 text-sm transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Clean Promotions">
              <Trash2 size={16} /> {isSidebarOpen && "Clean Promotions"}
            </button>
            
            <button onClick={runRetention} className={`w-full bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 py-2 rounded-lg flex items-center gap-2 text-sm transition ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`} title="Run Retention">
              <ShieldAlert size={16} /> {isSidebarOpen && "Prune Old Data"}
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-800">
           <button className={`flex items-center gap-2 text-sm hover:text-red-400 transition ${!isSidebarOpen && 'justify-center'}`} onClick={() => window.location.href='/'} title="Logout">
            <LogOut size={16} /> {isSidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      <div className="w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
          <form onSubmit={(e) => handleSearch(e, searchQuery)} className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search emails..." 
              value={searchQuery}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide truncate max-w-[200px]">
              {searchQuery ? 'Results' : filter} ({filteredEmails.length})
            </h2>
            <button onClick={() => handleManualSync(false,true)} disabled={loading} className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.map(email => (
            <div 
              key={email.gmailId}
              onClick={() => { setSelectedEmail(email); setShowContent(false); }}
              className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition ${selectedEmail?.gmailId === email.gmailId ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-900 truncate w-32">{getSenderName(email.sender)}</span>
                {email.priority === 'High' && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">HIGH</span>}
              </div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1 truncate">{email.subject}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{email.snippet}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 bg-white flex flex-col h-full overflow-hidden relative">
        {selectedEmail ? (
          <div className="h-full flex flex-col overflow-y-auto">
            {selectedEmail.isSensitive && (
              <div className="bg-red-50 border-b border-red-100 p-4 flex items-center gap-3 animate-pulse">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-red-800 font-bold text-sm">Data Leakage Warning</h3>
                  <p className="text-red-600 text-xs">
                    This email contains sensitive data: <span className="font-bold underline">{selectedEmail.sensitiveType}</span>.
                    Do not share externally.
                  </p>
                </div>
              </div>
            )}
            <div className="p-8 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedEmail.subject}</h1>
              
              {selectedEmail.topics && selectedEmail.topics.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {selectedEmail.topics.map((topic, i) => (
                    <span key={i} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">
                      #{topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-gray-800 text-base font-medium mb-2">
                From: <span className="text-gray-600">{selectedEmail.sender}</span>
              </div>

              <div className="text-gray-500 text-sm mb-4 flex items-center gap-2">
                <Clock size={14} />
                {new Date(selectedEmail.receivedDate).toLocaleDateString()} at {new Date(selectedEmail.receivedDate).toLocaleTimeString()}
              </div>

              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  selectedEmail.category === 'Work' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                  selectedEmail.category === 'Finance' ? 'bg-green-50 text-green-600 border-green-200' : 
                  'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {selectedEmail.category || 'General'}
                </span>

                {selectedEmail.priority === 'High' && (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-red-200">
                    High Priority
                  </span>
                )}
              </div>
            </div>

            <div className="px-8 py-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700 font-bold mb-3">
                  <Sparkles size={20} /> <span>Smart Summary</span>
                </div>
                <p className="text-indigo-900 text-sm leading-relaxed whitespace-pre-line">
                  {selectedEmail.aiSummary || "Generating summary..."}
                </p>
              </div>
            </div>

            {/* ATTACHMENT FIX: Added safety check using '?' */}
            {selectedEmail.attachments?.length > 0 && (
                <div className="px-8 pb-4">
                  <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                    <Paperclip size={16} /> Attachments ({selectedEmail.attachments.length})
                  </h4>
                  <div className="flex gap-3 flex-wrap">
                    {selectedEmail.attachments.map((att, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleAttachmentClick(selectedEmail.gmailId, att.id, att.name)}
                        className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-3 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer group"
                      >
                         <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 transition">
                           {getAttachmentIcon(att.type || att.name.split('.').pop() || 'Other')}
                         </div>
                         <div>
                           <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition">{att.name}</p>
                           <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{att.type}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}

            <div className="px-8 py-4 text-center">
               <button onClick={() => setShowContent(!showContent)} className="text-sm font-bold text-blue-600 hover:underline">
                 {showContent ? "Hide Content" : "View Full Email Content"}
               </button>
            </div>

            {showContent && (
              <div className="p-8 bg-gray-50 border-t border-gray-100 min-h-[300px]">
                <div className="prose max-w-none text-sm bg-white p-6 rounded-xl shadow-sm" dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml || selectedEmail.bodyText || "" }} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <Mail size={80} className="mb-4" />
            <p>Select an email</p>
          </div>
        )}
      </main>

      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
               <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <ChartIcon className="text-indigo-600"/> Analytics Dashboard
               </h2>
               <button onClick={() => setShowStats(false)} className="text-gray-500 hover:text-red-500"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto bg-gray-100 grid grid-cols-2 gap-6">
               {/* Stats content same as before */}
               <div className="col-span-2 grid grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-gray-500 text-sm font-bold uppercase">Total Emails</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                     <p className="text-gray-500 text-sm font-bold uppercase">High Priority</p>
                     <p className="text-3xl font-bold text-gray-800">{stats.priorities?.find((p:any) => p.name === 'High')?.value || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                     <p className="text-gray-500 text-sm font-bold uppercase">Work Emails</p>
                     <p className="text-3xl font-bold text-gray-800">{stats.categories?.find((c:any) => c.name === 'Work')?.value || 0}</p>
                  </div>
               </div>
               {/* Graphs (Check for null stats here as well if needed) */}
               <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4">Email Categories</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.categories || []} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                          {stats.categories.map((_:any, index:number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4">Sentiment Analysis</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.sentiments || []}>
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#82ca9d" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

            </div>
          </div>
        </div>
      )}
      {/* === AUDIT LOG MODAL === */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
               <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <ClipboardList className="text-indigo-600"/> Audit Logs
               </h2>
               <button onClick={() => setShowLogs(false)} className="text-gray-500 hover:text-red-500"><X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-bold text-indigo-700">
                        <span className="bg-indigo-50 px-2 py-1 rounded">{log.action}</span>
                      </td>
                      <td className="p-4 text-gray-800">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <div className="p-8 text-center text-gray-400">No logs found yet.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
}