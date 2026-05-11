import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { Wallet, TrendingUp, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useBestCDT, useMarketMetrics, useAssets, useTRMMetrics, useAssetHistory } from '../hooks/useFinance';
import { formatCurrency, isValidNumber } from '../lib/utils';
import { AssetDetail } from '../types';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { data: bestCDTResponse, isLoading: loadingCDT } = useBestCDT();
  const { data: metricsResponse, isLoading: loadingMetrics } = useMarketMetrics();
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: 'etf' });
  const { data: trmMetricsResponse } = useTRMMetrics(7);

  const metrics = metricsResponse?.data;
  const bestCDT = bestCDTResponse?.data;
  const assets = assetsResponse?.data || [];
  const trmMetrics = trmMetricsResponse?.data;

  // Obtener histórico real del mejor ETF para la trayectoria
  const topAssetTicker = assets.length > 0 ? assets[0]?.asset?.ticker : '';
  const { data: historyResponse, isLoading: loadingHistory } = useAssetHistory(topAssetTicker, 30);
  const history = historyResponse?.data || [];

  const currentTRM = trmMetrics?.current || metrics?.trm_current;
  const trmChange = trmMetrics?.change_7d || metrics?.trm_change_7d;
  const inflation = metrics?.inflation_rate;

  const bestCDTValue = bestCDT?.cdt?.tasa_ea;
  const bestCDTEntity = bestCDT?.cdt?.institution?.name;

  const trmHigh = trmMetrics?.high_52w;
  const trmLow = trmMetrics?.low_52w;

  // Cálculo de trayectorias normalizadas (Base 100 vs Base 100)
  const chartData = useMemo(() => {
    const hasHistory = history.length > 0;
    const hasCDT = isValidNumber(bestCDTValue);
    
    // Si no hay datos, devolvemos series vacías
    if (!hasHistory && !hasCDT) return { cdt: [], etf: [], dates: [] };

    // Usar las fechas del historial como eje X
    const dates = hasHistory 
      ? history.map(p => new Date(p.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }))
      : ['Hace 30D', 'Hace 15D', 'Hoy'];

    // Trayectoria ETF (Datos reales del backend Base 100)
    // Convertimos a retorno porcentual acumulado para que inicie en 0%
    const etfTrajectory = history.map(p => {
      const val = p.normalized_price || 100;
      return Number((val - 100).toFixed(2));
    });

    // Proyección CDT (Simulada día a día para que coincida con los puntos del ETF)
    let cdtTrajectory: number[] = [];
    if (hasCDT) {
      const rate = bestCDTValue! / 100;
      const dailyRate = Math.pow(1 + rate, 1 / 365) - 1;
      
      cdtTrajectory = dates.map((_, index) => {
        // Asumimos que los puntos son diarios
        return Number(((Math.pow(1 + dailyRate, index) - 1) * 100).toFixed(2));
      });
    }

    return { cdt: cdtTrajectory, etf: etfTrajectory, dates };
  }, [bestCDTValue, history]);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 11, fontFamily: 'Inter' },
      padding: [8, 12],
      formatter: (params: any) => {
        let res = `<div style="font-weight:800;margin-bottom:6px;font-size:10px;color:#94a3b8;text-transform:uppercase">${params[0].name}</div>`;
        params.forEach((item: any) => {
          res += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px">
            <span style="font-size:11px;color:#64748b">${item.marker} ${item.seriesName}</span>
            <span style="font-weight:bold;font-size:11px;color:#1e293b">${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}%</span>
          </div>`;
        });
        return res;
      }
    },
    legend: {
      data: ['Rendimiento CDT', 'Retorno ETF'],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10, color: '#64748b', fontWeight: 'bold' }
    },
    grid: { left: '2%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.dates,
      axisLabel: { 
        fontSize: 9, 
        color: '#94a3b8', 
        fontWeight: 'bold',
        interval: Math.floor(chartData.dates.length / 5) // Mostrar menos etiquetas para evitar overlap
      },
      axisLine: { lineStyle: { color: '#F1F5F9' } },
      axisTick: { show: false }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 'bold',
        formatter: '{value}%'
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }
    },
    series: [
      {
        name: 'Rendimiento CDT',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: chartData.cdt,
        lineStyle: { width: 3, color: '#10B981' },
        itemStyle: { color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.12)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { type: 'solid', color: '#E5E7EB', width: 1, opacity: 0.5 },
          data: [{ xAxis: 0 }]
        }
      },
      {
        name: 'Retorno ETF',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: chartData.etf,
        lineStyle: { width: 3, color: '#1E293B' },
        itemStyle: { color: '#1E293B' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(30, 41, 59, 0.06)' }, { offset: 1, color: 'rgba(30, 41, 59, 0)' }]
          }
        }
      }
    ]
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight leading-tight'>Panorama del Mercado</h2>
          <div className='flex items-center gap-2 mt-1'>
            <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest text-shadow-sm'>Sincronización Activa</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          label={loadingCDT ? 'Sincronizando...' : (bestCDTEntity || 'CDT Destacado')}
          value={loadingCDT ? '...' : (isValidNumber(bestCDTValue) ? bestCDTValue.toFixed(2) : '0.00')}
          suffix='%'
          icon={Wallet}
          color='emerald'
          onClick={() => onViewChange?.('cdts')}
        />
        <StatCard
          label='TRM Actual'
          value={loadingMetrics ? '...' : formatCurrency(currentTRM)}
          change={isValidNumber(trmChange) ? Number(trmChange.toFixed(2)) : undefined}
          icon={DollarSign}
          color='primary'
        />
        <StatCard
          label='Mejor ETF'
          value={loadingAssets ? '...' : (assets.length > 0 && isValidNumber(assets[0]?.annual_return) ? assets[0]?.annual_return.toFixed(2) : '0.00')}
          suffix='%'
          icon={TrendingUp}
          color='amber'
          onClick={() => onViewChange?.('assets')}
        />
        <StatCard
          label='Inflación IPC'
          value={loadingMetrics ? '...' : (isValidNumber(inflation) ? inflation.toFixed(2) : '0.00')}
          suffix={(isValidNumber(inflation)) ? '%' : ''}
          icon={PieChart}
          color='rose'
          onClick={() => onViewChange?.('metrics')}
        />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <div className='xl:col-span-2 bg-white border border-slate-100 p-6 md:p-8 shadow-sm rounded-[32px] transition-all hover:shadow-md'>
          <div className='flex items-start justify-between mb-8'>
            <div className='space-y-1.5'>
              <h3 className='font-serif text-2xl text-primary tracking-tight'>Trayectorias Comparativas</h3>
              <p className='text-[10px] text-slate-500 max-w-md leading-relaxed font-medium'>
                Analiza el <strong>retorno porcentual acumulado</strong> real (Base 100). Este benchmark visual identifica si la volatilidad del mercado está superando la rentabilidad base de la renta fija.
              </p>
            </div>
            <button className='p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-primary group' onClick={() => onViewChange?.('compare')}>
              <ArrowUpRight size={20} className='group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform' />
            </button>
          </div>
          <div className='h-[350px] w-full'>
            {(loadingMetrics || loadingHistory) ? (
              <div className='h-full w-full bg-slate-50/50 animate-pulse rounded-[24px] flex flex-col items-center justify-center gap-4'>
                <div className='w-8 h-8 border-2 border-slate-100 border-t-slate-300 rounded-full animate-spin' />
                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]'>Auditando Mercados Históricos...</span>
              </div>
            ) : (
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            )}
          </div>
          <div className='mt-8 pt-6 border-t border-slate-50 flex flex-wrap items-center gap-8'>
            <div className='flex items-center gap-3'>
              <div className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
              <div>
                <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Max 52s TRM</p>
                <p className='text-sm font-mono font-bold text-primary tracking-tighter'>{(trmHigh && trmHigh > 0) ? formatCurrency(trmHigh) : formatCurrency(4150)}</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-1.5 h-1.5 rounded-full bg-slate-200' />
              <div>
                <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Min 52s TRM</p>
                <p className='text-sm font-mono font-bold text-primary tracking-tighter'>{(trmLow && trmLow > 0) ? formatCurrency(trmLow) : formatCurrency(3720)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white border border-slate-100 p-6 md:p-8 shadow-sm rounded-[32px] flex flex-col'>
          <div className='flex items-center justify-between mb-8 pb-4 border-b border-slate-50'>
            <h3 className='font-serif text-xl text-primary tracking-tight'>Activos Sincronizados</h3>
            <span className='text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest'>Live</span>
          </div>
          <div className='space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar pr-2'>
            {assets.length > 0 ? assets.slice(0, 10).map((item: AssetDetail, idx: number) => {
              const change = (item?.change_1d && item?.change_1d !== 0)
                ? item?.change_1d
                : (item?.change_7d || item?.annual_return);

              return (
                <div
                  key={idx}
                  className='flex items-center gap-4 p-3 hover:bg-slate-50 transition-all rounded-2xl cursor-pointer group border border-transparent hover:border-slate-100'
                  onClick={() => onViewChange?.('assets')}
                >
                  <div className='w-10 h-10 bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm'>
                    {item?.asset?.ticker?.substring(0, 2) || '??'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-xs font-bold text-primary truncate leading-tight'>{item?.asset?.name}</h4>
                    <p className='text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1'>{item?.asset?.ticker}</p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-[12px] font-mono font-bold ${!isValidNumber(change) ? 'text-slate-400' : (change > 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                      {isValidNumber(change) ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '---'}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className='text-center py-20'>
                <p className='text-slate-400 text-[10px] uppercase tracking-widest font-bold animate-pulse'>Esperando Flujo de Datos...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
