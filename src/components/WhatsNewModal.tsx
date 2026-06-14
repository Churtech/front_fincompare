import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the v1.1.1 release notes
    const hasSeen = localStorage.getItem('cifra_seen_v1.1.1');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('cifra_seen_v1.1.1', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-wide">CIFRA TERMINAL v1.1.1 - Red</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-8 text-slate-600">
          <p className="text-base leading-relaxed">
            Hemos desplegado un hotfix importante enfocado en la estabilidad, seguridad y precisión del sistema:
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 bg-slate-50 p-2.5 rounded-lg text-slate-900 h-fit border border-slate-200 shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Corrección Crítica (Portafolios)</h3>
                <p className="text-sm mt-1">Resolvimos un fallo de rendimiento en la vista comparativa que causaba bloqueos de memoria (infinite loops).</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-slate-50 p-2.5 rounded-lg text-slate-900 h-fit border border-slate-200 shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Precisión Financiera (Backend)</h3>
                <p className="text-sm mt-1">El esquema de base de datos y motores de cálculo ahora utilizan precisión decimal (NUMERIC/float64) para las inversiones totales, evitando truncamientos.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-emerald-50/50 p-2.5 rounded-lg text-emerald-600 h-fit border border-emerald-100 shadow-sm">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Higiene y Seguridad</h3>
                <p className="text-sm mt-1">Eliminamos código muerto (comparison_service) y reforzamos la validación de credenciales en tareas automáticas.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 pt-0">
          <button 
            onClick={handleClose}
            className="w-full bg-primary hover:bg-slate-800 text-white font-medium tracking-wide py-3 px-4 rounded-xl transition-colors shadow-md"
          >
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
