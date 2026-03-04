/**
 * Web Worker for CSV parsing and aggregation.
 * Processes large CSV files in batches to avoid blocking the main thread.
 */

const BATCH_SIZE = 5000;

function parseCSVLines(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return { headers, dataLines: lines.slice(1).filter(l => l.trim()) };
}

function colIndex(headers, name) {
  return headers.findIndex(h => h.includes(name));
}

function parseDailyRecords(headers, dataLines) {
  const records = new Array(dataLines.length);
  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(',');
    const num = (name) => {
      const idx = colIndex(headers, name);
      return idx >= 0 ? parseFloat(cols[idx]) || 0 : 0;
    };
    const str = (name) => {
      const idx = colIndex(headers, name);
      return idx >= 0 ? (cols[idx] || '').trim() : '';
    };
    records[i] = {
      agente: (cols[0] || '').trim(),
      fecha: (cols[1] || '').trim(),
      area: str('area'),
      gerente: str('gerente'),
      coordinador: str('coordinador'),
      supervisor: str('supervisor'),
      adhBruta: num('adh_bruta'),
      adhNeta: num('adh_neta'),
      productividad: num('productividad'),
      absentismo: num('absentismo'),
      ventasHoy: num('ventas'),
      novedad: str('novedad'),
      novedadAjustada: cols[cols.length - 1]?.trim() || '',
    };
  }
  return records;
}

function adherenciaScore(avg) {
  return Math.min(avg / 95 * 100, 100);
}
function productividadScore(avg) {
  if (avg >= 55 && avg <= 72) return 100;
  if (avg < 55) return (avg / 55) * 100;
  return Math.max(0, 100 - ((avg - 72) / 28) * 100);
}
function absentismoScore(avg) {
  if (avg <= 10) return 100;
  return Math.max(0, 100 - ((avg - 10) / 90) * 100);
}
function ventasScore(total) {
  return Math.min((total / 10) * 100, 100);
}

function aggregateAgents(records) {
  const byAgent = new Map();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    let list = byAgent.get(r.agente);
    if (!list) { list = []; byAgent.set(r.agente, list); }
    list.push(r);
  }

  const result = [];
  for (const [agente, recs] of byAgent) {
    const workDays = recs.filter(r => r.adhBruta > 0 || r.productividad > 0);
    const count = workDays.length || 1;

    let sumAdhBruta = 0, sumAdhNeta = 0, sumProd = 0, sumAbs = 0, totalVentas = 0;
    for (const r of workDays) {
      sumAdhBruta += r.adhBruta;
      sumAdhNeta += r.adhNeta;
      sumProd += r.productividad;
    }
    for (const r of recs) {
      sumAbs += r.absentismo;
      totalVentas += r.ventasHoy;
    }

    const avgAdhBruta = sumAdhBruta / count;
    const avgAdhNeta = sumAdhNeta / count;
    const avgProd = sumProd / count;
    const avgAbs = sumAbs / recs.length;

    const adhScore = adherenciaScore((avgAdhBruta + avgAdhNeta) / 2);
    const prodScore = productividadScore(avgProd);
    const absScore = absentismoScore(avgAbs);
    const vScore = ventasScore(totalVentas);

    const kpiH = (adhScore * 0.10 + prodScore * 0.20 + absScore * 0.10);
    const kpiC = (0 * 0.20 + vScore * 0.40);
    const kpiTotal = kpiH * 0.40 + kpiC * 0.60;

    result.push({
      agente,
      area: recs[0].area,
      gerente: recs[0].gerente,
      coordinador: recs[0].coordinador,
      supervisor: recs[0].supervisor,
      adherenciaBruta: avgAdhBruta,
      adherenciaNeta: avgAdhNeta,
      productividad: avgProd,
      absentismo: avgAbs,
      ventasTotales: totalVentas,
      diasTrabajados: workDays.length,
      kpiHigienicos: kpiH,
      kpiComerciales: kpiC,
      kpiTotal,
    });
  }
  return result;
}

function calculateOverallFromAgents(agents) {
  if (agents.length === 0) {
    return { adhBrutaGeneral: 0, adhNetaGeneral: 0, productividadGeneral: 0, absentismoGeneral: 0, ventasTotales: 0 };
  }
  const active = agents.filter(a => a.adherenciaBruta > 0 || a.productividad > 0);
  const count = active.length || 1;
  const avg = (fn) => active.reduce((sum, a) => sum + fn(a), 0) / count;
  const total = (fn) => agents.reduce((sum, a) => sum + fn(a), 0);

  return {
    adhBrutaGeneral: avg(a => a.adherenciaBruta),
    adhNetaGeneral: avg(a => a.adherenciaNeta),
    productividadGeneral: avg(a => a.productividad),
    absentismoGeneral: avg(a => a.absentismo),
    ventasTotales: total(a => a.ventasTotales),
  };
}

// ── Main message handler ──
self.onmessage = async function(e) {
  const { type, payload } = e.data;

  if (type === 'PARSE_CSV') {
    try {
      const { csvText } = payload;
      
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'parsing', percent: 10 } });

      const { headers, dataLines } = parseCSVLines(csvText);
      const totalLines = dataLines.length;
      
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'parsing', percent: 20, totalRows: totalLines } });

      // Parse in batches
      const allRecords = [];
      for (let i = 0; i < totalLines; i += BATCH_SIZE) {
        const batch = dataLines.slice(i, i + BATCH_SIZE);
        const batchRecords = parseDailyRecords(headers, batch);
        allRecords.push(...batchRecords);
        
        const percent = 20 + Math.round((i / totalLines) * 50);
        self.postMessage({ type: 'PROGRESS', payload: { stage: 'parsing', percent, processedRows: Math.min(i + BATCH_SIZE, totalLines), totalRows: totalLines } });
      }

      self.postMessage({ type: 'PROGRESS', payload: { stage: 'aggregating', percent: 75 } });

      // Aggregate
      const agents = aggregateAgents(allRecords);
      
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'aggregating', percent: 90 } });

      const overall = calculateOverallFromAgents(agents);

      self.postMessage({ type: 'PROGRESS', payload: { stage: 'done', percent: 100 } });

      self.postMessage({
        type: 'RESULT',
        payload: { records: allRecords, agents, overall },
      });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: { message: err.message } });
    }
  }
};
