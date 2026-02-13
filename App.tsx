
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Weight, Layers, AlertCircle, Info, Trash2, Plus, ArrowUpDown, Hash, Maximize2, Hash as HashIcon, Layers as LayersIcon, Download, Printer } from 'lucide-react';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Dimensions, Material } from './types';
import { calculateCounterweight } from './utils/calculator';

const App: React.FC = () => {
  const exportRef = useRef<HTMLDivElement>(null);
  
  // State for order number
  const [orderNumber, setOrderNumber] = useState<string>('');
  
  // State for dimensions - Default values
  const [dims, setDims] = useState<Dimensions>({ width: 600, depth: 100, height: 1800 });
  const [targetWeight, setTargetWeight] = useState<number>(780);
  const [frameWeight, setFrameWeight] = useState<number>(79);
  
  // State for material unit thicknesses (mm)
  const [unitThicknesses, setUnitThicknesses] = useState<Record<string, number>>({
    '1': 100, // Beton default 100mm
    '2': 10,  // Ocel default 10mm
  });
  
  // State for materials
  const [materials, setMaterials] = useState<Material[]>([
    { id: '1', name: 'Beton', density: 2400, priority: 1 },
    { id: '2', name: 'Ocel', density: 7850, priority: 2 },
  ]);

  // Dynamic Title
  useEffect(() => {
    document.title = orderNumber 
      ? `Protizávaží - Zakázka ${orderNumber}` 
      : 'Kalkulátor Protizávaží Výtahu';
  }, [orderNumber]);

  const updateDim = (key: keyof Dimensions, val: string) => {
    setDims(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const addMaterial = () => {
    const newId = Date.now().toString();
    setMaterials([...materials, { 
      id: newId, 
      name: `Materiál ${materials.length + 1}`, 
      density: 1000, 
      priority: materials.length + 1 
    }]);
    setUnitThicknesses(prev => ({ ...prev, [newId]: 50 }));
  };

  const removeMaterial = (id: string) => {
    if (materials.length <= 2) return; 
    const filtered = materials.filter(m => m.id !== id);
    setMaterials(filtered.map((m, idx) => ({ ...m, priority: idx + 1 })));
  };

  const updateMaterial = (id: string, field: keyof Material, val: any) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        if (field === 'density' && (m.name.toLowerCase() === 'ocel')) {
           return { ...m, density: 7850 };
        }
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const updateUnitThickness = (id: string, val: string) => {
    const num = parseFloat(val) || 0;
    setUnitThicknesses(prev => ({ ...prev, [id]: num }));
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newMaterials = [...materials];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMaterials.length) return;

    const temp = newMaterials[index];
    newMaterials[index] = newMaterials[targetIndex];
    newMaterials[targetIndex] = temp;

    setMaterials(newMaterials.map((m, idx) => ({ ...m, priority: idx + 1 })));
  };

  const handleHtmlExport = () => {
    if (!exportRef.current) return;
    const cloned = exportRef.current.cloneNode(true) as HTMLElement;
    
    // Remove no-print elements
    cloned.querySelectorAll('.no-print').forEach(el => el.remove());
    
    // Convert inputs to spans for static HTML
    cloned.querySelectorAll('input').forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value || '0';
      span.style.fontWeight = 'bold';
      input.parentElement?.replaceChild(span, input);
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>${document.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 2rem; }
      .print-card { background: white; border-radius: 1.5rem; padding: 1.5rem; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
    </style>
</head>
<body>
    <div style="max-width: 1200px; margin: 0 auto;">
      ${cloned.innerHTML}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = orderNumber ? `zakazka_${orderNumber}.html` : 'vypocet_protizavazi.html';
    link.click();
  };

  const result = useMemo(() => calculateCounterweight(dims, targetWeight, frameWeight, materials), [dims, targetWeight, frameWeight, materials]);

  const materialSegments = useMemo(() => {
    if (!result.isFeasible) return [];
    const areaM2 = (dims.width / 1000) * (dims.depth / 1000);
    return result.materials.map(m => {
      const segmentHeightMM = (m.volume / areaM2) * 1000;
      const t = unitThicknesses[m.material.id] || 1;
      const count = t > 0 ? segmentHeightMM / t : 0;
      // Single unit weight (Area * thickness * density / 10^9 to get kg from mm and kg/m3)
      const uWeight = (dims.width * dims.depth * t * m.material.density) / 1000000000;

      return {
        ...m,
        blockDims: { w: dims.width, d: dims.depth, h: segmentHeightMM },
        unitThickness: t,
        itemCount: count,
        unitWeight: uWeight
      };
    });
  }, [result, dims, unitThicknesses]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center">
      <div className="w-full max-w-6xl p-4 md:p-8" ref={exportRef}>
        <header className="w-full mb-8 flex flex-col gap-6 border-b border-slate-200 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl no-print shadow-lg shadow-blue-100 shrink-0">
                 <Layers className="text-white w-8 h-8 md:w-10 md:h-10" />
              </div>
              <h1 className="text-xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                Kalkulátor Protizávaží Výtahu na zakázku
              </h1>
            </div>
            
            <div className="no-print flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={handleHtmlExport} className="flex-1 sm:flex-none flex items-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg text-base justify-center">
                <Download className="w-6 h-6" /> Export HTML
              </button>
            </div>
          </div>

          <div className="w-full flex flex-col md:flex-row items-center gap-4 bg-white border-2 border-slate-200 rounded-3xl px-6 py-4 shadow-xl shadow-slate-50 transition-all focus-within:ring-8 focus-within:ring-blue-50 focus-within:border-blue-400">
            <div className="flex items-center gap-3 shrink-0">
              <HashIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600 no-print" />
              <span className="text-xl md:text-3xl font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">Zakázka č.:</span>
            </div>
            <input 
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Doplňte identifikátor..."
              className="text-xl md:text-3xl font-black text-slate-900 outline-none w-full bg-transparent placeholder:text-slate-100 placeholder:italic min-w-0"
            />
          </div>
        </header>

        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 print-card">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                <Settings className="w-6 h-6 text-blue-500 no-print" /> Rozměry (mm) a váhy (kg)
              </h2>
              <div className="space-y-5">
                <InputGroup label="Šířka (mm)" value={dims.width} onChange={(v) => updateDim('width', v)} />
                <InputGroup label="Hloubka (mm)" value={dims.depth} onChange={(v) => updateDim('depth', v)} />
                <InputGroup label="Výška (mm)" value={dims.height} onChange={(v) => updateDim('height', v)} />
                <div className="h-px bg-slate-100 my-2" />
                <InputGroup label="Cílová Váha (kg)" value={targetWeight} onChange={(v) => setTargetWeight(parseFloat(v) || 0)} highlight />
                <InputGroup label="Váha Rámu (kg)" value={frameWeight} onChange={(v) => setFrameWeight(parseFloat(v) || 0)} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 print-card no-print">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Weight className="w-6 h-6 text-green-500" /> Materiály</h2>
                <button onClick={addMaterial} className="bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-xl transition-all border border-slate-100"><Plus className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                {materials.map((m, idx) => {
                  const isSteel = m.name.toLowerCase() === 'ocel';
                  return (
                    <div key={m.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black text-white bg-slate-800 px-2.5 py-1 rounded-full uppercase tracking-tighter">P{m.priority}</span>
                        <div className="flex gap-1">
                          <button onClick={() => movePriority(idx, 'up')} className="p-1 hover:text-blue-600 disabled:opacity-10" disabled={idx === 0}><ArrowUpDown className="w-5 h-5" /></button>
                          <button onClick={() => removeMaterial(m.id)} className="p-1 hover:text-red-600 disabled:opacity-10" disabled={materials.length <= 2 || isSteel}><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-bold disabled:opacity-50" value={m.name} disabled={isSteel} onChange={(e) => updateMaterial(m.id, 'name', e.target.value)} />
                        <input type="number" className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-mono disabled:opacity-50" value={m.density} disabled={isSteel} onChange={(e) => updateMaterial(m.id, 'density', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="lg:col-span-8 flex flex-col gap-8">
            <div className={`p-6 md:p-8 rounded-3xl border-2 transition-all print-card ${result.isFeasible ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
               <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-xl no-print ${result.isFeasible ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                     {result.isFeasible ? <Weight className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-2xl font-black ${result.isFeasible ? 'text-green-900' : 'text-red-900'}`}>{result.isFeasible ? 'VÝPOČET ÚSPĚŠNÝ' : 'CHYBA'}</h3>
                    <p className={`mt-2 text-lg font-medium ${result.isFeasible ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
                  </div>
               </div>
            </div>

            {result.isFeasible && (
              <div className="space-y-8">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 print-card">
                  <h3 className="text-2xl font-black mb-8 text-slate-800 border-b border-slate-100 pb-4 uppercase tracking-tighter">Složení Výplně</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {materialSegments.map((m, idx) => (
                      <div key={idx} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-5">
                        <div className="flex justify-between items-start border-b border-slate-200/50 pb-4">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block text-2xl font-black text-slate-900 truncate">{m.material.name}</span>
                            <span className="text-xs font-black text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded tracking-widest">{m.material.density} KG/M³</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-2xl font-mono font-black text-slate-800">{m.weight.toFixed(1)} kg</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">celková hmotnost</span>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-inner">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Blok (ŠxHxV)</div>
                          <div className="font-mono text-base font-black text-slate-700">
                             {m.blockDims.w.toFixed(0)} × {m.blockDims.d.toFixed(0)} × <span className="text-emerald-600">{m.blockDims.h.toFixed(1)}</span> mm
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">Tloušťka (mm)</label>
                              <input type="number" value={m.unitThickness || ''} onChange={(e) => updateUnitThickness(m.material.id, e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                           </div>
                           <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-xs font-black text-blue-400 uppercase ml-1">Počet kusů</span>
                              <span className="text-2xl font-black text-blue-600 ml-1">{Math.ceil(m.itemCount)}</span>
                           </div>
                        </div>
                        
                        {/* New Section: Weight of single piece */}
                        <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                          <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Váha 1 kusu:</span>
                          <span className="text-xl font-black text-blue-700 font-mono">{(m.unitWeight || 0).toFixed(2)} kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-8 mt-8 border-t-4 border-slate-900 flex justify-between items-center">
                    <div className="min-w-0 pr-4">
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-1">Celková hmotnost protiváhy</span>
                      <span className="text-sm font-bold text-slate-400 italic">Rám: {frameWeight} kg | Výplň: {result.netTargetWeight.toFixed(1)} kg</span>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-black text-blue-600">{targetWeight.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 print-card">
                    <h3 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Vizuální skladba (Objem)</h3>
                    <div className="flex flex-col md:flex-row justify-center items-center gap-12">
                      <div className="relative flex flex-col items-center">
                        <div className="w-28 h-80 bg-slate-50 rounded-3xl flex flex-col-reverse overflow-hidden border-2 border-slate-200/50 p-2 shadow-inner">
                          {materialSegments.map((m, idx) => (
                            <div key={idx} className="w-full flex items-center justify-center text-xs font-black text-white transition-all border-y border-white/5" style={{ height: `${m.percentage}%`, backgroundColor: COLORS[idx % COLORS.length], boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)' }}>
                              {m.percentage > 10 ? `${m.material.name}` : ''}
                            </div>
                          ))}
                        </div>
                        <div className="absolute -left-14 h-full flex flex-col justify-between py-5 text-xs font-black text-slate-400 uppercase tracking-tighter">
                          <span>{dims.height} mm</span>
                          <span>0 mm</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-5 w-full md:max-w-[320px]">
                         <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                            <span className="text-xs font-black text-slate-400 uppercase block mb-1 tracking-widest">Výška výplně</span>
                            <span className="text-2xl font-black text-slate-800">{dims.height} mm</span>
                         </div>
                         
                         <div className="flex flex-col gap-3">
                           {[...materialSegments].reverse().map((m, idx) => {
                             const colorIdx = materialSegments.indexOf(m);
                             return (
                               <div key={idx} className="p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm" style={{ backgroundColor: `${COLORS[colorIdx % COLORS.length]}08` }}>
                                 <span className="text-sm font-black uppercase tracking-wider" style={{ color: COLORS[colorIdx % COLORS.length] }}>{m.material.name}:</span>
                                 <span className="text-lg font-black" style={{ color: COLORS[colorIdx % COLORS.length] }}>{m.blockDims.h.toFixed(1)} mm</span>
                               </div>
                             );
                           })}
                         </div>

                         <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 font-medium leading-relaxed italic">
                               Priorita 1 je vždy umístěna ve spodní části. Celkový objem výplně činí <strong>{result.totalVolume.toFixed(4)} m³</strong>.
                            </p>
                         </div>
                      </div>
                    </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="mt-12 text-slate-400 text-xs pb-12 flex flex-col items-center gap-3 no-print">
        <div className="w-32 h-0.5 bg-slate-200 rounded-full" />
        <p className="font-bold tracking-wider">&copy; {new Date().getFullYear()} IPS | Industrial Precision Systems</p>
      </footer>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; value: number; onChange: (v: string) => void; highlight?: boolean }> = ({ label, value, onChange, highlight }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-400 ml-2 tracking-widest uppercase">{label}</label>
    <div className="relative">
      <input 
        type="number"
        className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-lg font-bold outline-none transition-all shadow-sm
          ${highlight ? 'border-blue-100 text-blue-700 bg-blue-50/20 focus:border-blue-500' : 'border-slate-200 text-slate-800 focus:border-slate-400'}`}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none uppercase">
        {label.includes('mm') ? 'mm' : 'kg'}
      </div>
    </div>
  </div>
);

export default App;
