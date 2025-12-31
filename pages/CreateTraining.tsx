import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Facilitator, Question, Training, Contact } from '../types';
import { saveTraining, getTrainingById, getGlobalQuestions, getContacts, getSettings, getTrainings } from '../services/storageService';
import { QuestionBuilder } from '../components/QuestionBuilder';
import { ArrowLeft, Save, Plus, X, Calendar, UserPlus, Settings, CheckCircle, Lock, MessageSquare, Trash2, FileText } from 'lucide-react';

export const CreateTraining: React.FC = () => {
  const navigate = useNavigate();
  const { trainingId } = useParams<{ trainingId: string }>();

  // Steps: 1 = Date/Title, 2 = Facilitators/Questions
  const [step, setStep] = useState(1);

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Internal state
  const [currentId, setCurrentId] = useState<string>('');
  const [currentAccessCode, setCurrentAccessCode] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [currentReportedTargets, setCurrentReportedTargets] = useState<Record<string, boolean>>({});

  // Facilitators
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [facName, setFacName] = useState('');
  const [facSubject, setFacSubject] = useState('');
  const [facDate, setFacDate] = useState('');
  const [facWhatsapp, setFacWhatsapp] = useState(''); 
  
  // Contacts Database (for autocomplete)
  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);

  // Evaluation Config
  const [processDate, setProcessDate] = useState(''); 
  const [facilitatorQuestions, setFacilitatorQuestions] = useState<Question[]>([]);
  const [processQuestions, setProcessQuestions] = useState<Question[]>([]);

  // Automation Targets
  const [targets, setTargets] = useState<number[]>([]);
  const [newTargetInput, setNewTargetInput] = useState('');

  // INITIAL LOAD
  useEffect(() => {
    setSavedContacts(getContacts());
    if (trainingId) {
      const data = getTrainingById(trainingId);
      if (data) {
        setTitle(data.title);
        setDescription(data.description || ''); 
        setStartDate(data.startDate);
        setEndDate(data.endDate);
        setProcessDate(data.processEvaluationDate || data.endDate); 
        setFacilitators(data.facilitators);
        setFacilitatorQuestions(data.facilitatorQuestions);
        setProcessQuestions(data.processQuestions);
        setTargets(data.targets || []);
        setCurrentId(data.id);
        setCurrentAccessCode(data.accessCode);
        setCreatedAt(data.createdAt);
        setCurrentReportedTargets(data.reportedTargets || {});
        setStep(1); 
      }
    } else {
      const settings = getSettings();
      setDescription(settings.defaultTrainingDescription || ''); 
      const globals = getGlobalQuestions();
      const facDefaults = globals.filter(q => q.category === 'facilitator' && q.isDefault).map(q => ({ id: uuidv4(), label: q.label, type: q.type }));
      const procDefaults = globals.filter(q => q.category === 'process' && q.isDefault).map(q => ({ id: uuidv4(), label: q.label, type: q.type }));
      setFacilitatorQuestions(facDefaults);
      setProcessQuestions(procDefaults);
    }
  }, [trainingId]);

  const handleStep1Confirm = () => {
      if (!title || !startDate || !endDate) {
          alert("Mohon lengkapi judul dan rentang tanggal pelatihan.");
          return;
      }
      if (new Date(startDate) > new Date(endDate)) {
          alert("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
          return;
      }
      if (!processDate) setProcessDate(endDate);
      setStep(2);
  };

  const handleFacilitatorSelect = (name: string) => {
      setFacName(name);
      const contact = savedContacts.find(c => c.name === name);
      if (contact) setFacWhatsapp(contact.whatsapp);
      else setFacWhatsapp('');
  };

  const addFacilitator = () => {
    if (facName && facSubject && facDate) {
      setFacilitators([...facilitators, { 
          id: uuidv4(), 
          name: facName, 
          subject: facSubject, 
          sessionDate: facDate,
          whatsapp: facWhatsapp
      }]);
      setFacName(''); setFacSubject(''); setFacDate(''); setFacWhatsapp('');
    } else {
        alert("Lengkapi Nama, Materi, dan Tanggal Sesi.");
    }
  };

  const removeFacilitator = (id: string) => {
    setFacilitators(facilitators.filter(f => f.id !== id));
  };

  const addTarget = () => {
      const val = parseInt(newTargetInput);
      if (!isNaN(val) && val > 0 && !targets.includes(val)) {
          const newTargets = [...targets, val].sort((a,b) => a - b);
          setTargets(newTargets);
          setNewTargetInput('');
      }
  };

  const removeTarget = (val: number) => setTargets(targets.filter(t => t !== val));

  const handleSave = () => {
    const existingTrainings = getTrainings();
    const isDuplicate = existingTrainings.some(t => t.title.toLowerCase().trim() === title.toLowerCase().trim() && t.id !== currentId);

    if (isDuplicate) {
        if (!confirm(`Peringatan: Nama pelatihan "${title}" sudah ada dalam daftar. Tetap lanjutkan dengan nama yang sama?`)) {
            return;
        }
    }

    if (facilitators.length === 0) {
        if(!confirm("Anda belum menambahkan fasilitator. Tetap lanjutkan?")) return;
    }

    const newTraining: Training = {
      id: currentId || uuidv4(),
      accessCode: currentAccessCode || Math.random().toString(36).substring(2, 7).toUpperCase(),
      title,
      description,
      startDate,
      endDate,
      processEvaluationDate: processDate || endDate, 
      facilitators,
      facilitatorQuestions,
      processQuestions,
      createdAt: createdAt,
      targets: targets,
      reportedTargets: currentReportedTargets
    };

    saveTraining(newTraining);
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"><ArrowLeft size={20} /></button>
              <h1 className="text-lg font-bold text-slate-800">{trainingId ? 'Edit Pelatihan' : 'Buat Pelatihan Baru'}</h1>
           </div>
           {step === 2 && (<button onClick={handleSave} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md transition flex items-center gap-2"><Save size={18} /> Simpan Data</button>)}
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-center mb-8">
            <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                <div className={`w-16 h-1 bg-slate-200 mx-2 ${step >= 2 ? 'bg-indigo-600' : ''}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
            </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-300 ${step === 2 ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Calendar size={20} /></div><h2 className="font-semibold text-slate-800">Langkah 1: Informasi Dasar</h2></div>
            <div className="p-6 grid gap-6">
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Judul / Topik Pelatihan</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={step === 2} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:bg-slate-50" placeholder="Contoh: Digital Marketing Batch 5" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={step === 2} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Selesai</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={step === 2} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi Pelatihan</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={step === 2} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder="Contoh: Silakan isi evaluasi ini dengan objektif..." /></div>
                {step === 1 && (<div className="flex justify-end pt-4"><button onClick={handleStep1Confirm} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition flex items-center gap-2">Lanjut / Kunci Tanggal <CheckCircle size={18}/></button></div>)}
                {step === 2 && (<div className="flex justify-end pt-2"><button onClick={() => setStep(1)} className="text-slate-500 hover:text-indigo-600 text-sm font-medium underline">Ubah Informasi Dasar</button></div>)}
            </div>
        </div>
        {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3"><div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><UserPlus size={20} /></div><h2 className="font-semibold text-slate-800">Langkah 2A: Daftar Fasilitator</h2></div>
                    <div className="p-6"><div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="md:col-span-4"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama</label><input type="text" list="facilitator-contacts" value={facName} onChange={(e) => handleFacilitatorSelect(e.target.value)} placeholder="Nama Fasilitator" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /><datalist id="facilitator-contacts">{savedContacts.map(c => (<option key={c.id} value={c.name}>{c.whatsapp ? `WA: ${c.whatsapp}` : ''}</option>))}</datalist></div>
                        <div className="md:col-span-4"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Materi</label><input type="text" value={facSubject} onChange={(e) => setFacSubject(e.target.value)} placeholder="Topik Materi" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
                        <div className="md:col-span-3"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Sesi</label><input type="date" value={facDate} min={startDate} max={endDate} onChange={(e) => setFacDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
                        <div className="md:col-span-1"><button onClick={addFacilitator} disabled={!facName || !facSubject || !facDate} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center justify-center h-[38px]"><Plus size={16} /></button></div>
                        </div>
                        <div className="space-y-3">
                        {facilitators.length === 0 && <p className="text-center text-slate-400 text-sm py-4 italic">Belum ada fasilitator ditambahkan.</p>}
                        {facilitators.map((f) => (<div key={f.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition shadow-sm"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">{f.name.charAt(0)}</div><div><p className="font-semibold text-slate-800 text-sm">{f.name}</p><div className="flex items-center gap-3 text-xs text-slate-500 mt-1"><span className="bg-slate-100 px-2 py-0.5 rounded">{f.subject}</span><span className="flex items-center gap-1"><Calendar size={12}/> {new Date(f.sessionDate).toLocaleDateString('id-ID')}</span>{f.whatsapp && <span className="text-green-600">WA: {f.whatsapp}</span>}</div></div></div><button onClick={() => removeFacilitator(f.id)} className="text-slate-400 hover:text-red-500 p-2"><X size={18} /></button></div>))}
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3"><div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Settings size={20} /></div><h2 className="font-semibold text-slate-800">Langkah 2B: Pengaturan Evaluasi</h2></div>
                    <div className="p-6 space-y-8">
                        <QuestionBuilder title="A. Evaluasi Fasilitator" questions={facilitatorQuestions} onChange={setFacilitatorQuestions} />
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-4"><h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-2"><MessageSquare size={16}/> Target Otomatisasi Laporan (WhatsApp)</h3><p className="text-xs text-indigo-600 mb-3">Sistem mengirimkan laporan ke WA fasilitator sesuai target jumlah responden.</p><div className="flex gap-2 mb-3"><input type="number" value={newTargetInput} onChange={(e) => setNewTargetInput(e.target.value)} placeholder="Contoh: 10" className="w-24 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm" /><button onClick={addTarget} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">Tambah Target</button></div><div className="flex flex-wrap gap-2">{targets.length === 0 && <span className="text-xs text-slate-400 italic">Belum ada target.</span>}{targets.map(t => (<div key={t} className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">Target: {t} Orang<button onClick={() => removeTarget(t)} className="hover:text-red-500"><X size={12}/></button></div>))}</div></div>
                        <div className="border-t border-slate-100 pt-8"><div className="mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center justify-between"><div><label className="text-sm font-bold text-orange-800 flex items-center gap-2"><Calendar size={16}/> Tanggal Evaluasi Penyelenggaraan</label></div><input type="date" value={processDate} onChange={e => setProcessDate(e.target.value)} className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div><QuestionBuilder title="B. Evaluasi Penyelenggaraan" questions={processQuestions} onChange={setProcessQuestions} /></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};