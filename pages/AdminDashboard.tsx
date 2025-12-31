import React, { useEffect, useState, useRef } from 'react';
import { getTrainings, deleteTraining, getResponses, getGlobalQuestions, saveGlobalQuestion, deleteGlobalQuestion, getContacts, saveContact, deleteContact, getSettings, saveSettings, resetApplicationData, saveTraining, exportAllData, importAllData } from '../services/storageService';
import { exportToPDF, exportToExcel, exportToWord } from '../services/exportService';
import { Training, GlobalQuestion, QuestionType, Contact, AppSettings } from '../types';
// Added Copy as CopyIcon to imports from lucide-react
import { Plus, Trash2, Eye, Share2, LogOut, X, Check, Users, Calendar, Hash, Database, Pencil, LayoutDashboard, FileText, Settings, Search, Contact as ContactIcon, Phone, RotateCcw, Download, FileSpreadsheet, File as FileIcon, Printer, ChevronDown, MessageSquare, Upload, CloudDownload, AlertCircle, Copy as CopyIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

type MenuTab = 'management' | 'variables' | 'reports' | 'contacts';
type SettingsTab = 'training' | 'whatsapp' | 'backup' | 'reset';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MenuTab>('management');
  const navigate = useNavigate();

  // Management State
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [mgmtSearch, setMgmtSearch] = useState('');
  const [mgmtDateStart, setMgmtDateStart] = useState('');
  const [mgmtDateEnd, setMgmtDateEnd] = useState('');

  // Delete Confirmation State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Variables State
  const [globalQuestions, setGlobalQuestions] = useState<GlobalQuestion[]>([]);
  const [newQVar, setNewQVar] = useState<{label: string, type: QuestionType, category: 'facilitator'|'process', isDefault: boolean}>({
      label: '', type: 'star', category: 'facilitator', isDefault: false
  });

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<{name: string, whatsapp: string}>({ name: '', whatsapp: '' });
  const [contactSearch, setContactSearch] = useState('');

  // Reports State
  const [exportDropdownId, setExportDropdownId] = useState<string | null>(null); 
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; title: string; token: string; accessCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareTab, setShareTab] = useState<'link' | 'code' | 'token'>('link');

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('training');
  const [appSettings, setAppSettings] = useState<AppSettings>({ waApiKey: '', waBaseUrl: '', waHeader: '', waFooter: '', defaultTrainingDescription: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshData = () => {
    setTrainings(getTrainings());
    setGlobalQuestions(getGlobalQuestions());
    setContacts(getContacts());
    setAppSettings(getSettings()); 
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    navigate('/admin');
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      deleteTraining(deleteTargetId);
      refreshData();
      setDeleteTargetId(null);
    } catch (err) {
      alert('Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyTraining = (source: Training) => {
    const copiedTraining: Training = {
      ...source,
      id: uuidv4(),
      accessCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
      title: `${source.title} (Salinan)`,
      createdAt: Date.now(),
      reportedTargets: {}
    };
    saveTraining(copiedTraining);
    refreshData();
  };

  const handleSaveVariable = () => {
      if(!newQVar.label) return;
      saveGlobalQuestion({
          id: uuidv4(),
          label: newQVar.label,
          type: newQVar.type,
          category: newQVar.category,
          isDefault: newQVar.isDefault
      });
      setNewQVar({ ...newQVar, label: '' }); 
      refreshData();
  };

  const handleUpdateGlobalType = (q: GlobalQuestion, newType: QuestionType) => {
      saveGlobalQuestion({ ...q, type: newType });
      refreshData();
  };

  const handleSaveContact = () => {
      if(!newContact.name) return;
      saveContact({ id: uuidv4(), name: newContact.name, whatsapp: newContact.whatsapp });
      setNewContact({ name: '', whatsapp: '' });
      refreshData();
  };

  const handleSaveSettings = () => {
      saveSettings(appSettings);
      setShowSettingsModal(false);
      refreshData();
  };

  const filteredMgmtTrainings = trainings
    .filter(t => {
      const matchSearch = t.title.toLowerCase().includes(mgmtSearch.toLowerCase());
      let matchDate = true;
      if (mgmtDateStart && mgmtDateEnd) {
        matchDate = (t.startDate <= mgmtDateEnd) && (t.endDate >= mgmtDateStart);
      }
      return matchSearch && matchDate;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const filteredContacts = contacts
    .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.whatsapp.includes(contactSearch))
    .sort((a, b) => a.name.localeCompare(b.name));

  const openShareModal = (training: Training) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(training))));
    const url = `${baseUrl}#/evaluate/${training.id}?data=${token}`;
    setShareData({ url, title: training.title, token, accessCode: training.accessCode || 'N/A' });
    setCopied(false);
    setShareTab('link');
    setShowShareModal(true);
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">S</div>
                      <span className="font-bold text-lg hidden md:block">SIMEP<span className="text-indigo-400">Admin</span></span>
                  </div>
                  <div className="flex space-x-2 overflow-x-auto mx-4">
                      {(['management', 'variables', 'contacts', 'reports'] as MenuTab[]).map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                              {tab === 'management' && <LayoutDashboard size={18}/>}
                              {tab === 'variables' && <Database size={18}/>}
                              {tab === 'contacts' && <ContactIcon size={18}/>}
                              {tab === 'reports' && <FileText size={18}/>}
                              <span className="capitalize">{tab === 'management' ? 'Manajemen' : tab === 'variables' ? 'Variabel' : tab === 'contacts' ? 'Kontak' : 'Laporan'}</span>
                          </button>
                      ))}
                  </div>
                  <div className="flex items-center gap-1">
                     <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"><Settings size={20} /></button>
                     <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-slate-800"><LogOut size={18} /></button>
                  </div>
              </div>
          </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {activeTab === 'management' && (
            <div className="animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Manajemen Pelatihan</h2>
                        <p className="text-slate-500 text-sm">Kelola daftar pelatihan aktif anda.</p>
                    </div>
                    <Link to="/admin/create" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 font-medium">
                        <Plus size={18} /> Buat Baru
                    </Link>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cari Pelatihan</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input type="text" value={mgmtSearch} onChange={e => setMgmtSearch(e.target.value)} placeholder="Nama pelatihan..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dari Tanggal</label>
                            <input type="date" value={mgmtDateStart} onChange={e => setMgmtDateStart(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Hingga Tanggal</label>
                            <input type="date" value={mgmtDateEnd} onChange={e => setMgmtDateEnd(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="md:col-span-1">
                            <button onClick={() => {setMgmtSearch(''); setMgmtDateStart(''); setMgmtDateEnd('')}} className="p-2 text-slate-400 hover:text-red-500"><RotateCcw size={20}/></button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredMgmtTrainings.map(t => (
                        <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-slate-100 px-3 py-1.5 rounded-bl-xl border-l border-b border-slate-200">
                                <span className="text-indigo-600 font-mono font-bold text-sm">{t.accessCode}</span>
                            </div>
                            <div className="p-6 pt-10 flex-1">
                                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{t.title}</h3>
                                <div className="space-y-2 mt-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-2"><Calendar size={14} /> <span>{new Date(t.startDate).toLocaleDateString('id-ID')}</span></div>
                                    <div className="flex items-center gap-2"><Users size={14} /> <span>{t.facilitators.length} Fasilitator</span></div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <button onClick={() => openShareModal(t)} className="text-indigo-600 text-sm font-semibold flex items-center gap-1"><Share2 size={16}/> Bagikan</button>
                                <div className="flex gap-1">
                                    <Link to={`/admin/results/${t.id}`} className="p-2 text-slate-400 hover:text-indigo-600 transition"><Eye size={18}/></Link>
                                    <button onClick={() => handleCopyTraining(t)} className="p-2 text-slate-400 hover:text-blue-600 transition"><CopyIcon size={18}/></button>
                                    <Link to={`/admin/edit/${t.id}`} className="p-2 text-slate-400 hover:text-amber-600 transition"><Pencil size={18}/></Link>
                                    <button onClick={() => setDeleteTargetId(t.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'variables' && (
            <div className="animate-in fade-in duration-300 max-w-4xl mx-auto">
                 <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">Variabel Pelatihan</h2>
                    <p className="text-slate-500 text-sm">Kelola database pertanyaan default untuk evaluasi baru.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5">
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Pertanyaan</label>
                            <input type="text" value={newQVar.label} onChange={e => setNewQVar({...newQVar, label: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Penguasaan Materi" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipe</label>
                            <select value={newQVar.type} onChange={e => setNewQVar({...newQVar, type: e.target.value as QuestionType})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                <option value="star">Bintang</option>
                                <option value="slider">Skala 100</option>
                                <option value="text">Teks</option>
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <button onClick={handleSaveVariable} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium">Tambah</button>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border divide-y">
                    {globalQuestions.map(q => (
                        <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50 gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{q.label}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{q.category}</span>
                            </div>

                            {/* Dropdown for Type */}
                            <div className="relative">
                                 <select
                                    value={q.type}
                                    onChange={(e) => handleUpdateGlobalType(q, e.target.value as QuestionType)}
                                    className="appearance-none bg-slate-100 border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all w-32"
                                >
                                    <option value="star">★ Bintang</option>
                                    <option value="slider">⸺ Skala</option>
                                    <option value="text">¶ Teks</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                    <ChevronDown size={14} />
                                </div>
                            </div>

                            <button onClick={() => { deleteGlobalQuestion(q.id); refreshData(); }} className="text-slate-300 hover:text-red-500 p-2 transition"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'contacts' && (
             <div className="animate-in fade-in duration-300 max-w-4xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">Kontak Fasilitator</h2>
                    <p className="text-slate-500 text-sm">Kelola buku telepon fasilitator untuk kemudahan input data.</p>
                </div>

                {/* Tambah Kontak Baru */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 grid md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Nama Lengkap</label>
                        <input type="text" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">WhatsApp (628...)</label>
                        <input type="text" value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <button onClick={handleSaveContact} className="bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Simpan Kontak</button>
                </div>

                {/* Pencarian */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
                    <Search className="text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari nama atau nomor WhatsApp..."
                        className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                    />
                    {contactSearch && (
                         <button onClick={() => setContactSearch('')} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                    )}
                </div>

                {/* Daftar Kontak */}
                <div className="mb-4 flex justify-between items-end">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Buku Kontak (A-Z)</h3>
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">{filteredContacts.length} Kontak ditemukan</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {filteredContacts.length > 0 ? (
                        filteredContacts.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-indigo-300 transition shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm uppercase">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{c.name}</p>
                                        <p className="text-xs text-slate-500 font-mono"><Phone size={10} className="inline mr-1"/> {c.whatsapp}</p>
                                    </div>
                                </div>
                                <button onClick={() => { deleteContact(c.id); refreshData(); }} className="text-slate-300 hover:text-red-500 p-2 transition"><Trash2 size={18}/></button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Search size={32} className="mx-auto mb-2 opacity-50"/>
                            <p className="text-sm">Tidak ada kontak ditemukan dengan kata kunci "{contactSearch}".</p>
                        </div>
                    )}
                </div>
             </div>
        )}

        {activeTab === 'reports' && (
             <div className="animate-in fade-in duration-300 space-y-6">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">Laporan Akhir</h2>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 first:rounded-tl-2xl">Judul Pelatihan</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Responden</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-700 last:rounded-tr-2xl">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trainings.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-4 font-medium text-slate-800">{t.title}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">
                                            {getResponses(t.id).length} Respon
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3" ref={dropdownRef}>
                                            <Link to={`/admin/results/${t.id}`} className="text-indigo-600 font-bold hover:underline">Buka Hasil</Link>
                                            <div className="relative">
                                                <button onClick={() => setExportDropdownId(exportDropdownId === t.id ? null : t.id)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200">
                                                    <Printer size={16}/> Cetak <ChevronDown size={14} />
                                                </button>
                                                {exportDropdownId === t.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden">
                                                        <button onClick={() => { exportToPDF(t); setExportDropdownId(null); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100">
                                                            <div className="w-8 h-8 bg-red-100 text-red-600 flex items-center justify-center rounded"><FileIcon size={16}/></div> PDF
                                                        </button>
                                                        <button onClick={() => { exportToExcel(t); setExportDropdownId(null); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100">
                                                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded"><FileSpreadsheet size={16}/> Excel
                                                            </div>
                                                        </button>
                                                        <button onClick={() => { exportToWord(t); setExportDropdownId(null); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-slate-50 flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-100 text-blue-600 flex items-center justify-center rounded"><FileText size={16}/> Word
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="p-6 text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
                <p className="text-slate-500 text-sm mb-6">Hapus data pelatihan ini secara permanen?</p>
                <div className="flex gap-3">
                   <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold">Batal</button>
                   <button onClick={executeDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                     {isDeleting ? <RotateCcw size={18} className="animate-spin" /> : 'Hapus'}
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Bagikan Akses</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setShareTab('link')} className={`flex-1 py-2 rounded text-xs font-bold ${shareTab === 'link' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>LINK</button>
                    <button onClick={() => setShareTab('code')} className={`flex-1 py-2 rounded text-xs font-bold ${shareTab === 'code' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>KODE</button>
                </div>
                {shareTab === 'link' ? (
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-50 border rounded-xl text-xs break-all font-mono text-slate-600">{shareData.url}</div>
                        <button onClick={() => copyToClipboard(shareData.url)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                            {copied ? <Check size={18}/> : <CopyIcon size={18}/>}
                            {copied ? 'Tersalin' : 'Salin Tautan'}
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="text-4xl font-mono font-bold tracking-widest text-indigo-600">{shareData.accessCode}</div>
                        <button onClick={() => copyToClipboard(shareData.accessCode)} className="text-xs text-indigo-600 font-bold hover:underline">Salin Kode</button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-64 bg-slate-50 border-r flex flex-col p-4 space-y-2">
                    <h3 className="font-bold text-slate-800 mb-4 px-4 flex items-center gap-2"><Settings size={18}/> Pengaturan</h3>
                    <button onClick={() => setActiveSettingsTab('training')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition ${activeSettingsTab === 'training' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>Dasar</button>
                    <button onClick={() => setActiveSettingsTab('whatsapp')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition ${activeSettingsTab === 'whatsapp' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>WhatsApp</button>
                    <button onClick={() => setActiveSettingsTab('backup')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition ${activeSettingsTab === 'backup' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>Data</button>
                </div>
                <div className="flex-1 p-8 relative overflow-y-auto bg-white">
                    <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition"><X size={20}/></button>
                    {activeSettingsTab === 'training' && (
                        <div className="space-y-6">
                            <h4 className="text-xl font-bold text-slate-800">Pengaturan Pelatihan</h4>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Deskripsi Default</label>
                                <textarea value={appSettings.defaultTrainingDescription} onChange={e => setAppSettings({...appSettings, defaultTrainingDescription: e.target.value})} className="w-full border border-slate-300 rounded-xl p-4 h-32 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Simpan</button>
                        </div>
                    )}
                    {activeSettingsTab === 'whatsapp' && (
                        <div className="space-y-4">
                            <h4 className="text-xl font-bold text-slate-800">WhatsApp Gateway</h4>
                            
                            {/* Base URL */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Gateway</label>
                                <input 
                                    type="text" 
                                    value={appSettings.waBaseUrl} 
                                    onChange={e => setAppSettings({...appSettings, waBaseUrl: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="https://api.fonnte.com/send"
                                />
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Fonnte)</label>
                                <input 
                                    type="text" 
                                    value={appSettings.waApiKey} 
                                    onChange={e => setAppSettings({...appSettings, waApiKey: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="Contoh: EK2Ef..."
                                />
                            </div>

                            {/* Header */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Header Pesan</label>
                                <textarea 
                                    value={appSettings.waHeader} 
                                    onChange={e => setAppSettings({...appSettings, waHeader: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none" 
                                    placeholder="Judul laporan..."
                                />
                            </div>

                            {/* Footer */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Footer Pesan</label>
                                <textarea 
                                    value={appSettings.waFooter} 
                                    onChange={e => setAppSettings({...appSettings, waFooter: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none" 
                                    placeholder="Pesan penutup..."
                                />
                            </div>

                            <div className="pt-4">
                                <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition w-full md:w-auto">Simpan Konfigurasi</button>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'backup' && (
                        <div className="space-y-8">
                            <h4 className="text-xl font-bold text-slate-800">Cadangan & Pulihkan</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={() => { const data = exportAllData(); const blob = new Blob([data], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click(); }} className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl text-center hover:bg-indigo-100 transition">
                                    <Download className="mx-auto mb-2 text-indigo-600" size={32}/>
                                    <p className="font-bold text-indigo-700">Ekspor Data</p>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center hover:bg-slate-100 transition">
                                    <Upload className="mx-auto mb-2 text-slate-600" size={32}/>
                                    <p className="font-bold text-slate-700">Impor Data</p>
                                </button>
                                <input type="file" ref={fileInputRef} onChange={e => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onload = (ev) => { if(importAllData(ev.target?.result as string)) window.location.reload(); }; reader.readAsText(file); } }} className="hidden" accept=".json" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};