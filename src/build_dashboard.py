"""Build the Deployment Readiness Dashboard from the sample Excel data.

Usage:  python src/build_dashboard.py
Output: docs/index.html (interactive dashboard, ready for GitHub Pages)
"""
from datetime import date
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio
from plotly.offline import get_plotlyjs

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "Deployment_Readiness_Sample_Data.xlsx"
OUT = ROOT / "docs" / "index.html"
TODAY = pd.Timestamp(date(2026, 10, 23))  # snapshot date used in the sample data

RAG = {"Green": "#2e7d32", "Amber": "#f9a825", "Red": "#c62828", "Not due": "#9e9e9e"}
INK, MUTED, GRID = "#1f2328", "#57606a", "#e5e7eb"


def load():
    x = pd.read_excel(DATA, sheet_name=None)
    sites, tasks, risks, ai = x["Sites"], x["ReadinessTasks"], x["Risks"], x["AI_Report_Checks"]
    for df, cols in [(sites, ["PlannedGoLive"]), (tasks, ["PlannedDate", "CompletedDate"]),
                     (risks, ["RaisedDate", "ClosedDate"]), (ai, ["ReportDate"])]:
        for c in cols:
            df[c] = pd.to_datetime(df[c])
    return sites, tasks, risks, ai


def site_scorecard(sites, tasks, risks):
    t = tasks.assign(Done=tasks.Status.eq("Complete"), Due=tasks.PlannedDate.le(TODAY))
    g = t.groupby("SiteID")
    card = pd.DataFrame({
        "Tasks": g.size(),
        "Complete": g.Done.sum(),
        "DueToDate": g.Due.sum(),
        "DoneOfDue": t[t.Due].groupby("SiteID").Done.sum(),
        "Overdue": g.Status.apply(lambda s: s.eq("Overdue").sum()),
    }).fillna(0)
    card["Readiness %"] = card.Complete / card.Tasks
    card["On-plan %"] = (card.DoneOfDue / card.DueToDate).where(card.DueToDate > 0)
    open_hi = risks[(risks.Status == "Open") & (risks.Severity == "High")].groupby("SiteID").size()
    card["Open high risks"] = open_hi.reindex(card.index).fillna(0).astype(int)
    card = sites.set_index("SiteID").join(card)
    card["Days to go-live"] = (card.PlannedGoLive - TODAY).dt.days

    def rag(r):
        if pd.isna(r["On-plan %"]):
            return "Not due"
        if r["On-plan %"] >= 0.9 and r["Open high risks"] == 0:
            return "Green"
        if r["On-plan %"] >= 0.75:
            return "Amber"
        return "Red"

    card["RAG"] = card.apply(rag, axis=1)
    return card.reset_index()


def style(fig, title, height=360):
    fig.update_layout(
        title=dict(text=title, x=0, font=dict(size=15, color=INK)),
        font=dict(family="Inter, Segoe UI, Arial, sans-serif", size=12, color=INK),
        paper_bgcolor="white", plot_bgcolor="white", height=height,
        margin=dict(l=10, r=10, t=50, b=10), legend=dict(orientation="h", y=-0.15),
    )
    fig.update_xaxes(gridcolor=GRID, zeroline=False)
    fig.update_yaxes(gridcolor=GRID, zeroline=False)
    return fig


def charts(card, tasks, risks, ai):
    figs = {}

    c = card.sort_values("PlannedGoLive")
    f = go.Figure(go.Bar(
        x=c.SiteName, y=c["On-plan %"].fillna(0), marker_color=[RAG[r] for r in c.RAG],
        text=[("n/a" if pd.isna(v) else f"{v:.0%}") for v in c["On-plan %"]], textposition="outside",
        customdata=c[["Wave", "RAG", "Overdue"]],
        hovertemplate="%{x}<br>%{customdata[0]}<br>On-plan: %{text}<br>RAG: %{customdata[1]}"
                      "<br>Overdue tasks: %{customdata[2]}<extra></extra>"))
    f.update_yaxes(tickformat=".0%", range=[0, 1.15])
    figs["onplan"] = style(f, "On-plan readiness by site (tasks done ÷ tasks due to date), in go-live order")

    t = tasks.assign(Done=tasks.Status.eq("Complete"))
    hm = t.groupby(["Workstream", "SiteID"]).Done.mean().unstack().reindex(columns=c.SiteID)
    f = go.Figure(go.Heatmap(
        z=hm.values, x=c.SiteName, y=hm.index, colorscale=[[0, "#f3f4f6"], [1, "#1f6feb"]],
        zmin=0, zmax=1, text=[[f"{v:.0%}" for v in row] for row in hm.values], texttemplate="%{text}",
        hovertemplate="%{y} · %{x}<br>Complete: %{text}<extra></extra>", showscale=False))
    figs["heatmap"] = style(f, "Overall completion by workstream and site", 330)

    o = risks[risks.Status == "Open"]
    sev = ["High", "Medium", "Low"]
    colors = {"High": "#c62828", "Medium": "#f9a825", "Low": "#9e9e9e"}
    f = go.Figure([go.Bar(name=s, y=sorted(risks.Workstream.unique()),
                          x=[len(o[(o.Severity == s) & (o.Workstream == w)]) for w in sorted(risks.Workstream.unique())],
                          orientation="h", marker_color=colors[s]) for s in sev])
    f.update_layout(barmode="stack")
    figs["risks"] = style(f, "Open risks by workstream and severity", 320)

    a = ai.assign(Month=ai.ReportDate.dt.to_period("M").dt.to_timestamp())
    m = a.groupby("Month")[["ErrorsFound", "ClaimsChecked"]].sum()
    m["rate"] = m.ErrorsFound / m.ClaimsChecked
    f = go.Figure(go.Scatter(x=m.index, y=m.rate, mode="lines+markers+text",
                             text=[f"{v:.1%}" for v in m.rate], textposition="top center",
                             line=dict(color="#1f6feb", width=2)))
    f.update_yaxes(tickformat=".0%", range=[0, m.rate.max() * 1.35])
    f.update_xaxes(tickformat="%b %Y", dtick="M1")
    figs["ai_trend"] = style(f, "AI-generated report error rate by month (errors ÷ claims checked)", 300)

    e = ai[ai.ErrorsFound > 0].groupby("MainErrorType").ErrorsFound.sum().sort_values()
    f = go.Figure(go.Bar(x=e.values, y=e.index, orientation="h", marker_color="#57606a",
                         text=e.values, textposition="outside"))
    figs["ai_types"] = style(f, "Errors found in AI reports, by type", 300)
    return figs


def kpis(card, tasks, risks, ai):
    due = tasks[tasks.PlannedDate.le(TODAY)]
    return [
        ("Overall readiness", f"{tasks.Status.eq('Complete').mean():.0%}", "of all readiness tasks complete"),
        ("On-plan readiness", f"{due.Status.eq('Complete').mean():.0%}", "of tasks due to date complete"),
        ("Overdue tasks", f"{tasks.Status.eq('Overdue').sum()}", "past planned date, not complete"),
        ("Open high risks", f"{((risks.Status == 'Open') & (risks.Severity == 'High')).sum()}", "need management attention"),
        ("AI report error rate", f"{ai.ErrorsFound.sum() / ai.ClaimsChecked.sum():.1%}", f"across {len(ai)} reports checked"),
    ]


def table_html(card):
    c = card.sort_values("PlannedGoLive")
    rows = []
    for _, r in c.iterrows():
        onplan = "n/a" if pd.isna(r["On-plan %"]) else f"{r['On-plan %']:.0%}"
        rows.append(
            f"<tr><td>{r.SiteName}</td><td>{r.Region}</td><td>{r.Wave}</td>"
            f"<td>{r.PlannedGoLive:%d %b %Y}</td><td class=num>{int(r['Days to go-live'])}</td>"
            f"<td class=num>{r['Readiness %']:.0%}</td><td class=num>{onplan}</td>"
            f"<td class=num>{int(r.Overdue)}</td><td class=num>{int(r['Open high risks'])}</td>"
            f"<td><span class=pill style='background:{RAG[r.RAG]}'>{r.RAG}</span></td></tr>")
    head = ("<tr><th>Site</th><th>Region</th><th>Wave</th><th>Go-live</th><th>Days to go-live</th>"
            "<th>Overall</th><th>On-plan</th><th>Overdue</th><th>Open high risks</th><th>RAG</th></tr>")
    return f"<table><thead>{head}</thead><tbody>{''.join(rows)}</tbody></table>"


def findings(card, tasks, risks, ai):
    out = []
    red = card[card.RAG == "Red"]
    amber = card[card.RAG == "Amber"]
    if len(red):
        out.append(f"{', '.join(red.SiteName)} {'is' if len(red) == 1 else 'are'} Red: under 75% of tasks due to date are complete.")
    if len(amber):
        out.append(f"{', '.join(amber.SiteName)} {'is' if len(amber) == 1 else 'are'} Amber and should be watched before go-live.")
    od = tasks[tasks.Status == "Overdue"].Workstream.value_counts()
    if len(od):
        out.append(f"Most overdue tasks sit in {od.index[0]} ({od.iloc[0]} of {od.sum()}).")
    o = risks[(risks.Status == "Open") & (risks.Severity == "High")].Workstream.value_counts()
    if len(o):
        out.append(f"{o.index[0]} has the most open high-severity risks ({o.iloc[0]}).")
    e = ai[ai.ErrorsFound > 0].groupby("MainErrorType").ErrorsFound.sum().sort_values(ascending=False)
    out.append(f"{(ai.ErrorsFound > 0).mean():.0%} of AI-generated reports contained at least one error; "
               f"the most common was '{e.index[0]}', so these reports still need a human check before use.")
    return out


def build():
    sites, tasks, risks, ai = load()
    card = site_scorecard(sites, tasks, risks)
    figs = charts(card, tasks, risks, ai)
    div = {k: pio.to_html(v, include_plotlyjs=False, full_html=False, config={"displayModeBar": False})
           for k, v in figs.items()}
    k = "".join(f"<div class=kpi><div class=kl>{a}</div><div class=kv>{b}</div><div class=ks>{c}</div></div>"
                for a, b, c in kpis(card, tasks, risks, ai))
    f = "".join(f"<li>{x}</li>" for x in findings(card, tasks, risks, ai))
    html = f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Deployment Readiness Dashboard</title>
<script>{get_plotlyjs()}</script>
<style>
body{{margin:0;background:#f6f8fa;color:{INK};font-family:Inter,"Segoe UI",Arial,sans-serif}}
.wrap{{max-width:1180px;margin:0 auto;padding:24px 16px 48px}}
h1{{margin:0 0 4px;font-size:24px}} .sub{{color:{MUTED};margin:0 0 20px;font-size:14px}}
h2{{font-size:17px;margin:28px 0 10px}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}}
.kpi,.card{{background:#fff;border:1px solid {GRID};border-radius:10px;padding:14px 16px}}
.kl{{font-size:12px;color:{MUTED};text-transform:uppercase;letter-spacing:.04em}}
.kv{{font-size:30px;font-weight:700;margin:4px 0}} .ks{{font-size:12px;color:{MUTED}}}
.grid2{{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px}}
.card{{margin-top:12px;overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:13px}}
th,td{{padding:8px 10px;border-bottom:1px solid {GRID};text-align:left;white-space:nowrap}}
th{{color:{MUTED};font-weight:600}} td.num{{text-align:right}}
.pill{{color:#fff;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}}
ul{{margin:0;padding-left:20px;line-height:1.7;font-size:14px}}
footer{{margin-top:28px;font-size:12px;color:{MUTED}}}
@media(max-width:520px){{.grid2{{grid-template-columns:1fr}}}}
</style></head><body><div class=wrap>
<h1>Deployment Readiness Dashboard</h1>
<p class=sub>Readiness, risk and AI report quality across an 8-site system rollout · snapshot {TODAY:%d %B %Y} · synthetic sample data</p>
<div class=kpis>{k}</div>
<h2>Key findings</h2><div class=card><ul>{f}</ul></div>
<h2>Site scorecard</h2><div class=card>{table_html(card)}</div>
<h2>Readiness</h2><div class=card>{div['onplan']}</div><div class=card>{div['heatmap']}</div>
<h2>Risks</h2><div class=card>{div['risks']}</div>
<h2>AI-generated report checks</h2><div class=grid2><div class=card>{div['ai_trend']}</div><div class=card>{div['ai_types']}</div></div>
<footer>Built by S M Nitish Kumar Naik with Python (pandas, Plotly). Data is synthetic and for portfolio use only.
RAG rule: Green = on-plan ≥ 90% and no open high risks; Amber = on-plan ≥ 75%; Red = below 75%; Not due = no tasks due yet.</footer>
</div></body></html>"""
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print("Wrote", OUT)
    print(card[["SiteName", "Readiness %", "On-plan %", "Overdue", "Open high risks", "RAG"]].to_string(index=False))
    for x in findings(card, tasks, risks, ai):
        print("-", x)


if __name__ == "__main__":
    build()
