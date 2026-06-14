import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ShieldCheck } from 'lucide-react';

import changelogData from '../data/changelog.json';

// Definir el tipo del JSON
type Changelog = Record<string, {
  title: string;
  description: string;
  features: {
    icon: string;
    title: string;
    desc: string;
  }[];
}>;

const changelog = changelogData as Changelog;

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Obtenemos las notas de la versión actual
  const currentVersionData = changelog[__APP_VERSION__];

  useEffect(() => {
    // Si no hay notas para esta versión, no mostramos nada
    if (!currentVersionData) return;

    // Check if the user has already seen the release notes for this version
    const hasSeen = localStorage.getItem(`cifra_seen_v${__APP_VERSION__}`);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [currentVersionData]);

  const handleClose = () => {
    localStorage.setItem(`cifra_seen_v${__APP_VERSION__}`, 'true');
    setIsOpen(false);
  };

  if (!isOpen || !currentVersionData) return null;

  // Componente de ícono dinámico
  const IconComponent = ({ name }: { name: string }) => {
    if (name === 'Zap') return <Zap size={20} />;
    if (name === 'Sparkles') return <Sparkles size={20} />;
    if (name === 'ShieldCheck') return <ShieldCheck size={20} />;
    return <Sparkles size={20} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-wide">CIFRA TERMINAL v{__APP_VERSION__} - Red</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-8 text-slate-600">
          <p className="text-base leading-relaxed">
            {currentVersionData.description}
          </p>

          <div className="space-y-6">
            {currentVersionData.features.map((feature, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="mt-1 bg-slate-50 p-2.5 rounded-lg text-slate-900 h-fit border border-slate-200 shadow-sm">
                  <IconComponent name={feature.icon} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 tracking-tight">{feature.title}</h3>
                  <p className="text-sm mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
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
