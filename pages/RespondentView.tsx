
import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getTrainingById, saveResponse, saveTraining } from '../services/storageService';
import { checkAndSendAutoReport } from '../services/whatsappService';
import { Training, Response } from '../types';
import { StarRating } from '../components/StarRating';
import { SliderRating } from '../components/SliderRating';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, AlertOctagon, User, Layout, ChevronRight, Home, ArrowLeft, Lock, Calendar } from 'lucide-react';

type Tab = 'facilitator' | 'process';

export const RespondentView: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const location = useLocation();
  const [training, setTraining] = useState<Training | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('facilitator');
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [facilitatorMode, setFacilitatorMode] = useState<'select' | 'custom'>('select');
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState('');
  const [customFacName, setCustomFacName] = useState('');
  const [customFacSubject, setCustomFacSubject] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const loadTraining = () => {
      if (!trainingId) return;

      // 1. Try to find in local storage
      let data = getTrainingById(trainingId);

      // 2. Data extraction from URL for portability (Direct Access)
      const params = new URLSearchParams(location.search);
      const dataStr = params.get('data');
      if (dataStr) {
        try {
          const decodedJson = decodeURIComponent(escape(atob(dataStr)));
          const decodedTraining = JSON.parse(decodedJson);
          if (decodedTraining.id === trainingId) {
            data = decodedTraining as Training;
            // Crucial: Save to respondent's local storage so they don't need a code next time
            saveTraining(data);
          }
        } catch (e) {
          console.error("Failed to parse training data from token", e);
        }
      }

      setTraining(data);
      setLoading(false);
    };

    loadTraining();
  }, [trainingId, location.search]);

  // Check if Process Evaluation is available
  const isProcessAvailable = () => {
    if (!training) return false;
    const targetDateStr = training.processEvaluationDate || training.endDate;
    if (!targetDateStr) return true;

    const today = new Date().toISOString().split('T')[0];
    return today >= targetDateStr;
  };

  const handleTabChange = (tab: Tab) => {
      if (tab === 'process' && !isProcessAvailable()) {
          alert(`Evaluasi Penyelenggaraan baru dapat diisi mulai tanggal ${new Date(training?.processEvaluationDate || training?.endDate || '').toLocaleDateString('id-ID')}.`);
          return;
      }
      setActiveTab(tab);
      setAnswers({});
  };

  const handleAnswerChange = (qId: string, val: string | number) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const resetForm = () => {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!training) return;

    let targetName = '';
    let targetSubject = '';
    let facId = '';

    if (activeTab === 'facilitator') {
      if (facilitatorMode === 'select') {
        const fac = training.facilitators.find(f => f.id === selectedFacilitatorId);
        if (!fac) {
            alert('Mohon pilih fasilitator terlebih dahulu.');
            return;
        }
        targetName = fac.name;
        targetSubject = fac.subject;
        facId = fac.id;
      } else {
        if (!customFacName || !customFacSubject) {
            alert('Mohon lengkapi nama dan materi fasilitator.');
            return;
        }
        targetName = customFacName;
        targetSubject = customFacSubject;
      }
    } else {
      targetName = "Proses Penyelenggaraan";
    }

    const response: Response = {
      id: uuidv4(),
      trainingId: training.id,
      type: activeTab,
      targetName,
      targetSubject: activeTab === 'facilitator' ? targetSubject : undefined,
      answers,
      timestamp: Date.now()
    };

    saveResponse(response);
    
    if (activeTab === 'facilitator' && facId) {
        checkAndSendAutoReport(training.id, facId, targetName).catch(console.error);
    }
    
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Memuat data...</div>;

  if (!training) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <AlertOctagon size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Data Tidak Ditemukan</h1>
          <p className="text-slate-500 mb-6">Link yang Anda gunakan mungkin tidak lengkap atau kedaluwarsa.</p>
          <Link to="/" className="text-indigo-600 font-medium hover:underline">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6 shadow-sm">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Terima Kasih!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Masukan Anda sangat berharga bagi peningkatan kualitas pelatihan kami.</p>
          
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-black transition shadow-lg transform hover:-translate-y-1"
            >
              Isi Evaluasi Lainnya
            </button>
            <Link 
              to="/" 
              className="flex items-center justify-center w-full py-4 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition"
            >
              <Home size={18} className="mr-2" /> Kembali ke Halaman Depan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const questions = activeTab === 'facilitator' ? training.facilitatorQuestions : training.processQuestions;
  const processUnlocked = isProcessAvailable();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="bg-indigo-600 h-64 w-full absolute top-0 left-0 z-0"></div>
      
      {/* Top Nav */}
      <nav className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-2 flex justify-between items-center">
         <Link to="/" className="flex items-center gap-2 text-indigo-100 hover:text-white transition-colors group">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm group-hover:bg-white/20 transition">
              <ArrowLeft size={20} />
            </div>
            <span className="text-sm font-medium">Kembali</span>
         </Link>
         <div className="text-white/80 text-xs font-semibold tracking-wide uppercase">SIMEP - Monitoring & Evaluasi</div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-indigo-50">
           <h1 className="text-2xl font-bold text-slate-900 mb-1">{training.title}</h1>
           <p className="text-slate-500 text-sm mb-3">
              {new Date(training.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
           </p>
           {training.description && (
               <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                   {training.description}
               </div>
           )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm p-2 mb-6 flex gap-2 sticky top-4 z-20 border border-white/50">
           <button
             onClick={() => handleTabChange('facilitator')}
             className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'facilitator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-indigo-50'}`}
           >
             <User size={18} /> Fasilitator
           </button>
           <button
             onClick={() => handleTabChange('process')}
             className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'process' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : !processUnlocked 
                    ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-80' 
                    : 'text-slate-500 hover:bg-indigo-50'
              }`}
           >
             {processUnlocked ? <Layout size={18} /> : <Lock size={16} />} 
             Penyelenggaraan
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Context Input */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
             {activeTab === 'facilitator' ? (
               <div className="space-y-4">
                 <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
                    <button type="button" onClick={() => setFacilitatorMode('select')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${facilitatorMode === 'select' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pilih Nama</button>
                    <button type="button" onClick={() => setFacilitatorMode('custom')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${facilitatorMode === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Tulis Manual</button>
                 </div>

                 {facilitatorMode === 'select' ? (
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Siapa Fasilitatornya?</label>
                     <div className="relative">
                        <select
                            value={selectedFacilitatorId}
                            onChange={(e) => setSelectedFacilitatorId(e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 shadow-sm"
                        >
                            <option value="">-- Pilih Nama --</option>
                            {training.facilitators.map(f => (
                            <option key={f.id} value={f.id}>{f.name} - {f.subject}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={20}/>
                     </div>
                   </div>
                 ) : (
                    <div className="grid gap-4">
                        <input type="text" value={customFacName} onChange={(e) => setCustomFacName(e.target.value)} placeholder="Nama Lengkap Fasilitator" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 shadow-sm" />
                        <input type="text" value={customFacSubject} onChange={(e) => setCustomFacSubject(e.target.value)} placeholder="Materi yang diajarkan" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 shadow-sm" />
                    </div>
                 )}
               </div>
             ) : (
                <div className="text-center py-2">
                    <h3 className="font-bold text-lg text-slate-800">Evaluasi Proses</h3>
                    <p className="text-slate-500 text-sm">Berikan penilaian Anda mengenai fasilitas dan layanan.</p>
                </div>
             )}
          </div>

          {/* Questions List */}
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 transition-shadow hover:shadow-md">
                <div className="mb-4">
                    <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1 block">Pertanyaan {idx + 1}</span>
                    <h3 className="text-lg font-semibold text-slate-800">{q.label}</h3>
                </div>

                <div className="pt-2">
                    {q.type === 'star' && (
                        <StarRating 
                            value={answers[q.id] as number || 0} 
                            onChange={(val) => handleAnswerChange(q.id, val)} 
                        />
                    )}
                    {q.type === 'slider' && (
                        <SliderRating 
                            value={answers[q.id] as number || 0} 
                            onChange={(val) => handleAnswerChange(q.id, val)} 
                        />
                    )}
                    {q.type === 'text' && (
                        <textarea
                            rows={3}
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-none shadow-sm placeholder:text-slate-400"
                            placeholder="Ketik jawaban Anda disini..."
                        />
                    )}
                </div>
            </div>
          ))}

          <div className="pt-6 pb-12">
            <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-indigo-300 hover:bg-indigo-700 hover:shadow-2xl transition-all transform active:scale-95"
            >
                Kirim Evaluasi
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">SIMEP &copy; 2025</p>
          </div>

        </form>
      </main>
    </div>
  );
};
