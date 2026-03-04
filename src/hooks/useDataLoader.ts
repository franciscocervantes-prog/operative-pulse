import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyAgentRecord, AgentKPI, OverallKPIs, fetchDailyRecords, aggregateAgents, calculateKPIsFromAgents, fetchOverallKPIs } from '@/lib/csvParser';

export interface LoadProgress {
  stage: 'idle' | 'fetching' | 'parsing' | 'aggregating' | 'done' | 'error';
  percent: number;
  totalRows?: number;
  processedRows?: number;
  message?: string;
}

interface WorkerResult {
  records: DailyAgentRecord[];
  agents: AgentKPI[];
  overall: OverallKPIs;
}

const LARGE_FILE_THRESHOLD = 50000; // rows — use worker above this

export function useDataLoader() {
  const [dailyRecords, setDailyRecords] = useState<DailyAgentRecord[]>([]);
  const [overallRaw, setOverallRaw] = useState<OverallKPIs | null>(null);
  const [progress, setProgress] = useState<LoadProgress>({ stage: 'idle', percent: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const workerRef = useRef<Worker | null>(null);

  const loadData = useCallback(async () => {
    try {
      setProgress({ stage: 'fetching', percent: 5 });

      // Try preprocessed JSON first (instant load)
      try {
        const [dailyRes, agentsRes, overallRes] = await Promise.all([
          fetch('/data/preprocessed_daily.json?t=' + Date.now()),
          fetch('/data/preprocessed_agents.json?t=' + Date.now()),
          fetch('/data/preprocessed_overall.json?t=' + Date.now()),
        ]);

        if (dailyRes.ok && agentsRes.ok && overallRes.ok) {
          const [records, , overall] = await Promise.all([
            dailyRes.json() as Promise<DailyAgentRecord[]>,
            agentsRes.json(),
            overallRes.json() as Promise<OverallKPIs>,
          ]);
          setDailyRecords(records);
          setOverallRaw(overall);
          setLastUpdate(new Date());
          setProgress({ stage: 'done', percent: 100, message: 'Cargado desde datos preprocesados' });
          return;
        }
      } catch {
        // Preprocessed files not available, fall through
      }

      // Fetch raw CSV
      const res = await fetch('/data/df_daily_kpis.csv?t=' + Date.now());
      const csvText = await res.text();
      const lineCount = csvText.split('\n').length - 1;

      setProgress({ stage: 'fetching', percent: 15, totalRows: lineCount });

      if (lineCount > LARGE_FILE_THRESHOLD) {
        // Use Web Worker for large files
        await loadWithWorker(csvText);
      } else {
        // Small file — process on main thread
        setProgress({ stage: 'parsing', percent: 30, totalRows: lineCount });
        const records = await fetchDailyRecords();
        setDailyRecords(records);

        setProgress({ stage: 'aggregating', percent: 70 });
        const agents = aggregateAgents(records);
        const overall = calculateKPIsFromAgents(agents);
        setOverallRaw(overall);
        setLastUpdate(new Date());
        setProgress({ stage: 'done', percent: 100 });
      }

      // Also fetch static overall KPIs as fallback
      try {
        const staticOverall = await fetchOverallKPIs();
        if (!overallRaw) setOverallRaw(staticOverall);
      } catch { /* ignore */ }

    } catch (error) {
      console.error('Error loading data:', error);
      setProgress({ stage: 'error', percent: 0, message: String(error) });
    }
  }, []);

  const loadWithWorker = useCallback((csvText: string) => {
    return new Promise<void>((resolve, reject) => {
      // Terminate existing worker
      if (workerRef.current) workerRef.current.terminate();

      const worker = new Worker('/workers/csvWorker.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'PROGRESS') {
          setProgress({
            stage: payload.stage,
            percent: payload.percent,
            totalRows: payload.totalRows,
            processedRows: payload.processedRows,
          });
        } else if (type === 'RESULT') {
          const result = payload as WorkerResult;
          setDailyRecords(result.records);
          setOverallRaw(result.overall);
          setLastUpdate(new Date());
          setProgress({ stage: 'done', percent: 100, totalRows: result.records.length });
          worker.terminate();
          workerRef.current = null;
          resolve();
        } else if (type === 'ERROR') {
          setProgress({ stage: 'error', percent: 0, message: payload.message });
          worker.terminate();
          workerRef.current = null;
          reject(new Error(payload.message));
        }
      };

      worker.onerror = (err) => {
        setProgress({ stage: 'error', percent: 0, message: err.message });
        worker.terminate();
        workerRef.current = null;
        reject(err);
      };

      worker.postMessage({ type: 'PARSE_CSV', payload: { csvText } });
    });
  }, []);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  return { dailyRecords, overallRaw, progress, lastUpdate, loadData };
}
