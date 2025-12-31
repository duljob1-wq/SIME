import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTrainingById, getResponses } from '../services/storageService';
import { Training, Response, QuestionType, Question } from '../types';
import { ArrowLeft, User, Layout, Quote, Calculator } from 'lucide-react';

export const ResultsView: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const [training, setTraining] = useState<Training>();
  const [responses, setResponses] = useState<Response[]>([]);
  const [activeTab, setActiveTab] = useState<'facilitator' | 'process'>('facilitator');

  useEffect(() => {
    if (trainingId) {
      setTraining(getTrainingById(trainingId));
      setResponses(getResponses(trainingId));
    }
  }, [trainingId]);

  if (!training) return <div className="p-8 text-center">Loading...</div>;

  const filteredResponses = responses.filter(r => r.type === activeTab);
  const questions = activeTab === 'facilitator' ? training.facilitatorQuestions : training.processQuestions;

  // Group by target
  const groupedResponses: Record<string, Response[]> = {};
  filteredResponses.forEach(r => {
    const key = r.targetName || 'Umum';
    if (!groupedResponses[key]) groupedResponses[key] = [];
    groupedResponses[key].push(r);
  });

  const getAverage = (responses: Response[], qId: string) => {
    const valid = responses.filter(r => typeof r.answers[qId] === 'number');
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, curr) => acc + (curr.answers[qId] as number), 0);
    return Number((sum / valid.length).toFixed(1));
  };

  const getTextAnswers = (responses: Response[], qId: string) => {
      return responses
        .map(r => r.answers[qId])
        .filter(a => typeof a === 'string' && a.trim() !== '') as string[];
  }

  // Helper for progress bar width
  const getPercentage = (val: number, type: QuestionType) => {
      if (type === 'text') return 0;
      const max = type === 'star' ? 5 : 100;
      return (val / max) * 100;
  }

  // Helper: Calculate Overall Averages
  const calculateOverall = (items: Response[], qs: Question[]) => {
      // Star Calculation
      const starQs = qs.filter(q => q.type === 'star');
      let starAvg = 0;
      if (starQs.length > 0) {
          let totalScore = 0;
          let totalCount = 0;
          starQs.forEach(q => {
             const valid = items.filter(r => typeof r.answers[q.id] === 'number');
             if(valid.length) {
                 totalScore += valid.reduce((a,b) => a + (b.answers[q.id] as number), 0);
                 totalCount += valid.length;
             }
          });
          starAvg = totalCount ? Number((totalScore / totalCount).toFixed(2)) : 0;
      }

      // Slider Calculation
      const sliderQs = qs.filter(q => q.type === 'slider');
      let sliderAvg = 0;
      if (sliderQs.length > 0) {
          let totalScore = 0;
          let totalCount = 0;
          sliderQs.forEach(q => {
             const valid = items.filter(r => typeof r.answers[q.id] === 'number');
             if(valid.length) {
                 totalScore += valid.reduce((a,b) => a + (b.answers[q.id] as number), 0);
                 totalCount += valid.length;
             }
          });
          sliderAvg = totalCount ? Number((totalScore / totalCount).toFixed(2)) : 0;
      }

      return { starAvg, sliderAvg, hasStar: starQs.length > 0, hasSlider: sliderQs.length > 0 };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link to="/admin/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Laporan Hasil Evaluasi</h1>
                    <p className="text-xs text-slate-500">{training.title}</p>
                </div>
            </div>
            
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                <button
                    onClick={() => setActiveTab('facilitator')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'facilitator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Fasilitator
                </button>
                <button
                    onClick={() => setActiveTab('process')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'process' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Penyelenggaraan
                </button>
            </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {Object.keys(groupedResponses).length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                    <Layout size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Belum Ada Data</h3>
                <p className="text-slate-500 text-sm">Belum ada responden yang mengisi kategori ini.</p>
             </div>
        ) : (
            <div className="space-y-8">
                {Object.entries(groupedResponses).map(([target, items]) => {
                    const overall = calculateOverall(items, questions);

                    return (
                    <div key={target} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeTab === 'facilitator' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {activeTab === 'facilitator' ? <User size={20}/> : <Layout size={20}/>}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{target}</h3>
                                    {items[0].targetSubject && <p className="text-xs text-slate-500">{items[0].targetSubject}</p>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Overall Score Badge */}
                                <div className="flex gap-2">
                                    {overall.hasStar && (
                                        <div className="px-4 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-bold text-yellow-600 tracking-wider">Rata-rata Bintang</span>
                                            <span className="text-sm font-bold text-slate-800">★ {overall.starAvg} <span className="text-slate-400 text-xs">/ 5.0</span></span>
                                        </div>
                                    )}
                                    {overall.hasSlider && (
                                        <div className="px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Rata-rata Skala</span>
                                            <span className="text-sm font-bold text-slate-800">{overall.sliderAvg} <span className="text-slate-400 text-xs">/ 100</span></span>
                                        </div>
                                    )}
                                </div>
                                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 h-fit">
                                    {items.length} Responden
                                </span>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {questions.map(q => {
                                const avg = getAverage(items, q.id);
                                const pct = getPercentage(avg, q.type);
                                
                                return (
                                <div key={q.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-indigo-100 transition">
                                    <p className="text-sm font-semibold text-slate-700 mb-3 min-h-[40px]">{q.label}</p>
                                    
                                    {q.type === 'text' ? (
                                        <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-3 custom-scrollbar">
                                            {getTextAnswers(items, q.id).length > 0 ? (
                                                getTextAnswers(items, q.id).map((ans, idx) => (
                                                    <div key={idx} className="flex gap-2 text-xs text-slate-600">
                                                        <Quote size={12} className="text-slate-400 min-w-[12px] mt-0.5" />
                                                        <p className="italic">{ans}</p>
                                                    </div>
                                                ))
                                            ) : ( <span className="text-xs text-slate-400">Tidak ada jawaban</span> )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-3xl font-bold text-slate-800">{avg}</span>
                                                <span className="text-xs text-slate-400 mb-1">dari {q.type === 'star' ? 5 : 100}</span>
                                            </div>
                                            {/* Bar Chart Visualization */}
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${pct > 75 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>
    </div>
  );
};