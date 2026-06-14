import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Zap, Shield, Award } from 'lucide-react';
import { useCompareAnalysis } from '../../hooks/useFinance';
import { cn } from '../../lib/utils';
import { Portfolio, AssetDetail, CDTDetail, AnalysisReport } from '../../types';

interface ComparisonPortfoliosModalProps {
  portfolioIds: number[];
  isOpen: boolean;
  onClose: () => void;
  allPortfolios: Portfolio[];
  assets?: AssetDetail[];
  cdts?: CDTDetail[];
}

export const ComparisonPortfoliosModal: React.FC<ComparisonPortfoliosModalProps> = ({ 
  portfolioIds, 
  isOpen, 
  onClose, 
  allPortfolios 
}) => {
  const compareAnalysis = useCompareAnalysis();
  const [comparisonReport, setComparisonReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && portfolioIds.length >= 2) {
      setError(null);
      setComparisonReport(null);
      compareAnalysis.mutate({
        portfolio_ids: portfolioIds,
        currency: 'COP',
        lookback_days: 252,
        initial_amount: 10000000,
        monthly_contribution: 500000,
        projection_years: 5
      }, {
        onSuccess: (res) => {
          setComparisonReport(res);
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || err.message || 'Error comparando portafolios.');
        }
      });
    }
  }, [isOpen, portfolioIds.join(',')]); // Fix: Stable dependency to prevent infinite loops

  if (!isOpen) return null;

  const comparisonSummary = comparisonReport?.technical_analysis?.comparison_summary;
  const humanAnalysis = comparisonReport?.human_analysis;

  const getPortfolioName = (idStr: string) => {
    const id = Number(idStr);
    const p = allPortfolios.find(item => item.id === id);
    return p ? p.name : `Portafolio ${id}`;
  };

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-[120] flex items-center justify-center p-4'>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className='relative w-full max-w-[1000px] max-h-[85vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20 p-8 z-10'
        >
          <div className='flex justify-between items-center mb-6 pb-4 border-b border-slate-100'>
            <div>
              <h3 className='text-2xl font-serif font-bold text-slate-900 tracking-tight'>Comparativa Cruzada de Portafolios</h3>
              <p className='text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold flex items-center gap-2'>
                <span className='w-4 h-[1px] bg-slate-200'></span>
                Análisis de Eficiencia en Lote (Markowitz & Sharpe)
              </p>
            </div>
            <button onClick={onClose} className='p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900'><X size={20} /></button>
          </div>

          <div className='overflow-y-auto custom-scrollbar flex-1 pr-1'>
            {compareAnalysis.isPending ? (
              <div className='py-20 text-center flex flex-col items-center gap-4'>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className='w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full' />
                <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>Ejecutando cálculos de optimización cruzada...</p>
              </div>
            ) : error ? (
              <div className='p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 my-10'>
                <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                <p className='text-xs text-rose-600 font-medium'>{error}</p>
              </div>
            ) : comparisonSummary ? (
              <div className='space-y-6'>
                <div className='overflow-x-auto custom-scrollbar pb-4'>
                  <table className='w-full border-collapse'>
                    <thead>
                      <tr className='border-b border-slate-100 bg-slate-50/50'>
                        <th className='p-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Métrica / Portafolio</th>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr]) => (
                          <th key={idStr} className='p-4 text-right text-xs font-bold text-primary font-serif'>{getPortfolioName(idStr)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Retorno Esperado E.A.</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => {
                          const isBest = idStr === comparisonSummary.best_return_portfolio_id;
                          return (
                            <td key={idStr} className='p-4 text-right font-mono text-sm font-bold'>
                              <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                                {isBest && <Award size={12} />}
                                {((ta.expected_return || 0) * 100).toFixed(2)}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Volatilidad Anual</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => (
                          <td key={idStr} className='p-4 text-right font-mono text-sm font-bold text-slate-700'>
                            {((ta.volatility || 0) * 100).toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Sharpe Ratio</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => {
                          const isBest = idStr === comparisonSummary.best_sharpe_portfolio_id;
                          return (
                            <td key={idStr} className='p-4 text-right font-mono text-sm font-bold'>
                              <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                                {isBest && <Zap size={12} fill='currentColor' />}
                                {(ta.sharpe_ratio || 0).toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Máximo Drawdown</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => (
                          <td key={idStr} className='p-4 text-right font-mono text-sm font-bold text-rose-500'>
                            {((ta.maximum_drawdown || 0) * 100).toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Score de Diversificación</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => {
                          const isBest = idStr === comparisonSummary.best_diversification_portfolio_id;
                          return (
                            <td key={idStr} className='p-4 text-right font-mono text-sm font-bold'>
                              <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                                {isBest && <Shield size={12} />}
                                {(ta.diversification_score || 0)}/100
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className='p-4 text-xs font-medium text-slate-500'>Composición de Activos</td>
                        {Object.entries(comparisonSummary.portfolios).map(([idStr, ta]) => (
                          <td key={idStr} className='p-4 text-right text-xs'>
                            <div className='flex flex-col gap-1 items-end max-w-[250px] ml-auto'>
                              {ta.allocations?.map((alloc, idx) => (
                                <span key={idx} className='bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-[9px] text-slate-500 font-mono'>
                                  {alloc.ticker || alloc.name || `Activo ${idx + 1}`}: {alloc.weight_percentage}%
                                </span>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {humanAnalysis && (
                  <div className='mt-8 pt-6 border-t border-slate-100 space-y-4 bg-slate-50/50 p-6 rounded-2xl'>
                    <h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest'>Análisis Cualitativo Comparativo</h4>
                    <p className='text-sm text-slate-700 leading-relaxed font-serif italic'>{humanAnalysis.summary}</p>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2'>
                      <div className='p-4 bg-white rounded-xl border border-slate-100'>
                        <span className='font-bold text-slate-500 block mb-1'>Retorno y Eficiencia</span>
                        <p className='text-slate-600'>{humanAnalysis.return_explanation} {humanAnalysis.sharpe_explanation}</p>
                      </div>
                      <div className='p-4 bg-white rounded-xl border border-slate-100'>
                        <span className='font-bold text-slate-500 block mb-1'>Riesgo y Diversificación</span>
                        <p className='text-slate-600'>{humanAnalysis.risk_explanation} {humanAnalysis.diversification_explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
