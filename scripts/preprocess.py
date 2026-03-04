#!/usr/bin/env python3
"""
Preprocessing script for large CSV files.
Converts df_daily_kpis.csv (350k+ rows) into small, optimized JSON files
that the frontend can load in <1 second.

Usage:
  python scripts/preprocess.py

Input:  public/data/df_daily_kpis.csv
Output: public/data/preprocessed_daily.json   (daily records)
        public/data/preprocessed_agents.json   (aggregated agent KPIs)
        public/data/preprocessed_overall.json  (overall KPIs)

Run this script whenever df_daily_kpis.csv is updated.
"""

import csv
import json
import os
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
INPUT_FILE = DATA_DIR / "df_daily_kpis.csv"


def parse_csv():
    records = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = [h.strip().lower() for h in reader.fieldnames]
        reader.fieldnames = fieldnames

        for row in reader:
            def num(key):
                for k in row:
                    if key in k:
                        try:
                            return float(row[k])
                        except (ValueError, TypeError):
                            return 0.0
                return 0.0

            def s(key):
                for k in row:
                    if key in k:
                        return (row[k] or "").strip()
                return ""

            cols = list(row.values())
            records.append({
                "agente": cols[0].strip() if cols[0] else "",
                "fecha": cols[1].strip() if cols[1] else "",
                "area": s("area"),
                "gerente": s("gerente"),
                "coordinador": s("coordinador"),
                "supervisor": s("supervisor"),
                "adhBruta": num("adh_bruta"),
                "adhNeta": num("adh_neta"),
                "productividad": num("productividad"),
                "absentismo": num("absentismo"),
                "ventasHoy": num("ventas"),
                "novedad": s("novedad"),
                "novedadAjustada": cols[-1].strip() if cols[-1] else "",
            })
    return records


def adherencia_score(avg):
    return min(avg / 95 * 100, 100)

def productividad_score(avg):
    if 55 <= avg <= 72:
        return 100
    if avg < 55:
        return (avg / 55) * 100
    return max(0, 100 - ((avg - 72) / 28) * 100)

def absentismo_score(avg):
    if avg <= 10:
        return 100
    return max(0, 100 - ((avg - 10) / 90) * 100)

def ventas_score(total):
    return min((total / 10) * 100, 100)


def aggregate_agents(records):
    by_agent = defaultdict(list)
    for r in records:
        by_agent[r["agente"]].append(r)

    agents = []
    for agente, recs in by_agent.items():
        work_days = [r for r in recs if r["adhBruta"] > 0 or r["productividad"] > 0]
        count = len(work_days) or 1

        avg_adh_bruta = sum(r["adhBruta"] for r in work_days) / count
        avg_adh_neta = sum(r["adhNeta"] for r in work_days) / count
        avg_prod = sum(r["productividad"] for r in work_days) / count
        avg_abs = sum(r["absentismo"] for r in recs) / len(recs)
        total_ventas = sum(r["ventasHoy"] for r in recs)

        adh_s = adherencia_score((avg_adh_bruta + avg_adh_neta) / 2)
        prod_s = productividad_score(avg_prod)
        abs_s = absentismo_score(avg_abs)
        v_s = ventas_score(total_ventas)

        kpi_h = adh_s * 0.10 + prod_s * 0.20 + abs_s * 0.10
        kpi_c = 0 * 0.20 + v_s * 0.40
        kpi_total = kpi_h * 0.40 + kpi_c * 0.60

        agents.append({
            "agente": agente,
            "area": recs[0]["area"],
            "gerente": recs[0]["gerente"],
            "coordinador": recs[0]["coordinador"],
            "supervisor": recs[0]["supervisor"],
            "adherenciaBruta": round(avg_adh_bruta, 2),
            "adherenciaNeta": round(avg_adh_neta, 2),
            "productividad": round(avg_prod, 2),
            "absentismo": round(avg_abs, 2),
            "ventasTotales": total_ventas,
            "diasTrabajados": len(work_days),
            "kpiHigienicos": round(kpi_h, 2),
            "kpiComerciales": round(kpi_c, 2),
            "kpiTotal": round(kpi_total, 2),
        })
    return agents


def calculate_overall(agents):
    if not agents:
        return {"adhBrutaGeneral": 0, "adhNetaGeneral": 0, "productividadGeneral": 0, "absentismoGeneral": 0, "ventasTotales": 0}
    
    active = [a for a in agents if a["adherenciaBruta"] > 0 or a["productividad"] > 0]
    count = len(active) or 1
    
    return {
        "adhBrutaGeneral": round(sum(a["adherenciaBruta"] for a in active) / count, 2),
        "adhNetaGeneral": round(sum(a["adherenciaNeta"] for a in active) / count, 2),
        "productividadGeneral": round(sum(a["productividad"] for a in active) / count, 2),
        "absentismoGeneral": round(sum(a["absentismo"] for a in active) / count, 2),
        "ventasTotales": sum(a["ventasTotales"] for a in agents),
    }


def main():
    print(f"📂 Reading {INPUT_FILE}...")
    records = parse_csv()
    print(f"   ✅ {len(records):,} records loaded")

    print("🔄 Aggregating agents...")
    agents = aggregate_agents(records)
    print(f"   ✅ {len(agents):,} agents")

    print("📊 Calculating overall KPIs...")
    overall = calculate_overall(agents)

    # Write outputs
    daily_out = DATA_DIR / "preprocessed_daily.json"
    agents_out = DATA_DIR / "preprocessed_agents.json"
    overall_out = DATA_DIR / "preprocessed_overall.json"

    with open(daily_out, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
    print(f"   📁 {daily_out} ({os.path.getsize(daily_out) / 1024 / 1024:.1f} MB)")

    with open(agents_out, "w", encoding="utf-8") as f:
        json.dump(agents, f, ensure_ascii=False, indent=2)
    print(f"   📁 {agents_out} ({os.path.getsize(agents_out) / 1024:.0f} KB)")

    with open(overall_out, "w", encoding="utf-8") as f:
        json.dump(overall, f, ensure_ascii=False, indent=2)
    print(f"   📁 {overall_out}")

    print("\n✅ Preprocessing complete! Frontend will now load instantly.")


if __name__ == "__main__":
    main()
