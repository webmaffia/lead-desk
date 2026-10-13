(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const user = id => TEAM.find(t => t.id === id) || { name: '—' };
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const state = { role: 'admin', view: 'overview', filters: { q: '', project: '', city: '', status: '', source: '' }, convo: 'c1', events: [] };
const ME = { admin: 'u6', head: 'u5', exec: 'u1' };

const ICONS = {
  overview: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  leads: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0z',
  pipeline: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v6h-4z',
  engage: 'M4 4h16v12H8l-4 4z',
  ai: 'M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z',
  reports: 'M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2 .6-.5 1.2 1 1.8-1.8 1.8-1.8-1-1.2.5L14 21h-4l-.6-2-1.2-.5-1.8 1-1.8-1.8 1-1.8L5 13.6 3 12v-0l2-.6.5-1.2-1-1.8 1.8-1.8 1.8 1 1.2-.5L10 3h4l.6 2 1.2.5 1.8-1 1.8 1.8-1 1.8.5 1.2z',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${ICONS[n]}"/></svg>`;

const VIEWS = {
  overview: { label: 'Overview', sub: 'Real-time view of enquiries and response health', roles: ['admin', 'head', 'exec'] },
  leads: { label: 'Leads', sub: 'Every enquiry across all channels', roles: ['admin', 'head', 'exec'] },
  pipeline: { label: 'Pipeline', sub: 'Drag leads between stages', roles: ['admin', 'head', 'exec'] },
  engage: { label: 'Engagement', sub: 'Email, WhatsApp and SMS acknowledgements', roles: ['admin', 'head'] },
  ai: { label: 'AI Assistant', sub: 'Web chat and WhatsApp conversations, 24×7', roles: ['admin', 'head'] },
  reports: { label: 'Reports', sub: 'Source, campaign, project, city and team performance', roles: ['admin', 'head'] },
  settings: { label: 'Settings', sub: 'Routing rules, SLA, alerts, access and compliance', roles: ['admin'] },
};

// ---------- helpers ----------
const scoped = () => state.role === 'exec' ? LEADS.filter(l => l.owner === ME.exec) : state.role === 'head' ? LEADS.filter(l => l.city !== 'Mumbai' && l.city !== 'Bengaluru') : LEADS;
function ago(ts) {
  const m = Math.round((NOW + (Date.now() - NOW) - ts) / MIN);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago'; return Math.round(m / 1440) + ' d ago';
}
const nowTs = () => Date.now();
function sla(l) {
  if (l.firstResponse) { const m = Math.round((l.firstResponse - l.created) / MIN); return { m, cls: m <= SLA_MINUTES ? 'ok' : 'bad', txt: m + ' min' }; }
  if (['won', 'lost'].includes(l.status)) return { m: null, cls: '', txt: '—' };
  const m = Math.round((nowTs() - l.created) / MIN);
  return { m, cls: m > SLA_MINUTES ? 'bad' : m > SLA_MINUTES * .6 ? 'warn' : 'ok', txt: m > 1440 ? 'Untouched · ' + Math.round(m / 1440) + 'd' : 'Waiting ' + m + ' min' };
}
const pill = s => `<span class="pill ${s}">${STATUS_LABEL[s]}</span>`;
const owner = id => `<span class="avatar">${initials(user(id).name)}</span>${esc(user(id).name)}`;
function chans(l) {
  const c = v => v === 'failed' ? 'bad' : 'ok';
  return `<span class="chan"><span class="${c(l.ack.email)}" title="Email ${l.ack.email}">E</span><span class="${c(l.ack.whatsapp)}" title="WhatsApp ${l.ack.whatsapp}">W</span><span class="${c(l.ack.sms)}" title="SMS ${l.ack.sms}">S</span></span>`;
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const kpi = (label, value, delta, cls = '') => `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="delta">${delta}</div></div>`;

function barRows(rows, max) {
  max = max || Math.max(...rows.map(r => r[1]), 1);
  return `<div class="bars">${rows.map(r => `<div class="bar-row"><span>${esc(r[0])}</span><div class="bar"><i style="width:${r[1] / max * 100}%"></i></div><b class="mono">${r[2] ?? r[1]}</b></div>`).join('')}</div>`;
}
function dailyChart(leads) {
  const days = 14, W = 640, H = 200, p = 28, bw = (W - p * 2) / days;
  const buckets = Array.from({ length: days }, () => 0);
  leads.forEach(l => { const d = Math.floor((nowTs() - l.created) / 864e5); if (d < days) buckets[days - 1 - d]++; });
  const max = Math.max(...buckets, 1);
  const bars = buckets.map((v, i) => {
    const h = (H - p * 2) * v / max, x = p + i * bw + 4, y = H - p - h;
    const dt = new Date(nowTs() - (days - 1 - i) * 864e5);
    return `<rect x="${x}" y="${y}" width="${bw - 8}" height="${h}" rx="3" fill="${i === days - 1 ? '#7a6958' : '#cbbba0'}"><title>${v} leads</title></rect><text x="${x + (bw - 8) / 2}" y="${H - 8}" text-anchor="middle">${dt.getDate()}</text><text x="${x + (bw - 8) / 2}" y="${y - 5}" text-anchor="middle">${v || ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Leads per day, last 14 days"><line x1="${p}" x2="${W - p}" y1="${H - p}" y2="${H - p}" stroke="#e4ded3"/>${bars}</svg>`;
}
function donut(parts) {
  const total = parts.reduce((a, p) => a + p[1], 0) || 1, cols = ['#7a6958', '#cbbba0', '#353e4a', '#606f83', '#b9a98f', '#d9d4ca'];
  let off = 0; const r = 52, c = 2 * Math.PI * r;
  const arcs = parts.map((p, i) => { const len = p[1] / total * c; const s = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${cols[i % 6]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${p[0]}: ${p[1]}</title></circle>`; off += len; return s; }).join('');
  return `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 140 140" width="140">${arcs}<text x="70" y="75" text-anchor="middle" style="font:600 20px Bitter,serif;fill:var(--ink)">${total}</text></svg><div class="legend" style="flex-direction:column;gap:6px">${parts.map((p, i) => `<span><i style="background:${cols[i % 6]}"></i>${esc(p[0])} · ${p[1]}</span>`).join('')}</div></div>`;
}
const countBy = (arr, f) => { const m = {}; arr.forEach(x => m[f(x)] = (m[f(x)] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1]); };

// ---------- views ----------
function overview() {
  const L = scoped(), today = L.filter(l => nowTs() - l.created < 864e5);
  const resp = L.filter(l => l.firstResponse).map(l => (l.firstResponse - l.created) / MIN);
  const avg = resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length) : 0;
  const delivered = L.filter(l => Object.values(l.ack).every(v => v !== 'failed')).length;
  const breaches = L.filter(l => sla(l).cls === 'bad' && !['won', 'lost'].includes(l.status) && !l.firstResponse);
  const wip = L.filter(l => l.status === 'new' && !l.firstResponse && nowTs() - l.created < 864e5 * 2);
  return `
  <div class="grid g4">
    ${kpi('New leads · 24h', today.length, `<span class="up">▲ 12%</span> vs yesterday`)}
    ${kpi('Avg first response', avg + ' min', `Target ≤ ${SLA_MINUTES} min`, avg <= SLA_MINUTES ? 'ok' : 'bad')}
    ${kpi('Acknowledged on all channels', pct(delivered, L.length) + '%', `${delivered} of ${L.length} leads`, 'ok')}
    ${kpi('SLA breaches open', breaches.length, 'Escalated to managers', breaches.length ? 'bad' : 'ok')}
  </div>
  <div class="grid g-main mt">
    <div class="card"><h3>Leads per day</h3><div class="hint">Last 14 days</div>${dailyChart(L)}</div>
    <div class="card"><h3>Live activity</h3><div class="hint">New leads, acknowledgements and escalations</div><ul class="feed">${feed(L)}</ul></div>
  </div>
  <div class="grid g3 mt">
    <div class="card"><h3>By source</h3><div class="hint">Where enquiries come from</div>${donut(countBy(L, l => l.source))}</div>
    <div class="card"><h3>By city</h3><div class="hint">Routed per Intellion rules</div>${barRows(countBy(L, l => l.city))}</div>
    <div class="card"><h3>Needs attention</h3><div class="hint">Untouched beyond ${SLA_MINUTES} minutes</div>
      ${wip.length ? `<table><tbody>${wip.slice(0, 5).map(l => `<tr class="click" data-lead="${l.id}"><td><b>${esc(l.name)}</b><br><small class="muted">${l.project}</small></td><td class="sla ${sla(l).cls}">${sla(l).txt}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">All recent leads have been contacted. 🎉</p>'}
    </div>
  </div>`;
}
function feed(L) {
  const ev = [...state.events];
  L.slice(0, 10).forEach(l => {
    ev.push({ t: l.created + 1, cls: 'ok', h: `Acknowledgement sent to ${esc(l.name)}`, s: `${l.id} · Email, WhatsApp, SMS` });
    ev.push({ t: l.created, cls: '', h: `New ${esc(l.source)} lead · ${esc(l.project)}`, s: `${esc(l.name)}, ${esc(l.company)} → ${esc(user(l.owner).name)}` });
    if (l.escalated) ev.push({ t: l.created + SLA_MINUTES * MIN, cls: 'bad', h: `Escalated: ${l.id} untouched ${SLA_MINUTES}+ min`, s: 'Manager alerted by email and WhatsApp' });
  });
  return ev.sort((a, b) => b.t - a.t).slice(0, 14).map(e => `<li><span class="dot ${e.cls}"></span><div>${e.h}<small>${e.s} · ${ago(e.t)}</small></div></li>`).join('');
}

function filtered() {
  const f = state.filters, q = f.q.toLowerCase();
  return scoped().filter(l => (!f.project || l.project === f.project) && (!f.city || l.city === f.city) && (!f.status || l.status === f.status) && (!f.source || l.source === f.source)
    && (!q || [l.name, l.company, l.id, l.email].some(v => v.toLowerCase().includes(q))));
}
const opts = (arr, v, label) => `<option value="">${label}</option>` + arr.map(a => `<option ${a === v ? 'selected' : ''}>${esc(a)}</option>`).join('');
function leadRows(rows) {
  return rows.map(l => { const s = sla(l); return `<tr class="click" data-lead="${l.id}">
    <td class="mono">${l.id}</td><td><b>${esc(l.name)}</b><br><small class="muted">${esc(l.company)}</small></td>
    <td>${esc(l.project)}<br><small class="muted">${l.city}</small></td><td>${esc(l.source)}</td><td>${pill(l.status)}</td>
    <td style="white-space:nowrap">${owner(l.owner)}</td><td class="sla ${s.cls}">${s.txt}</td><td>${chans(l)}</td><td class="muted">${ago(l.created)}</td></tr>`; }).join('');
}
function leads() {
  const f = state.filters;
  return `<div class="card">
  <div class="filters">
    <input type="search" id="fq" placeholder="Search name, company, reference…" value="${esc(f.q)}">
    <select data-f="project">${opts(PROJECTS, f.project, 'All projects')}</select>
    <select data-f="city">${opts(CITIES, f.city, 'All cities')}</select>
    <select data-f="status">${STATUSES.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).reduce((a, b) => a + b, `<option value="">All statuses</option>`)}</select>
    <select data-f="source">${opts(SOURCES, f.source, 'All sources')}</select>
    <span class="spacer" style="flex:1"></span><button class="btn sm" id="export">Export to Excel (CSV)</button>
  </div>
  <div class="table-wrap"><table><thead><tr><th>Ref</th><th>Lead</th><th>Project</th><th>Source</th><th>Status</th><th>Assigned</th><th>Response</th><th>Ack E·W·S</th><th>Received</th></tr></thead>
  <tbody id="leadBody">${leadRows(filtered().slice(0, 60))}</tbody></table></div></div>`;
}
function pipeline() {
  const L = scoped();
  return `<div class="kanban">${STATUSES.map(s => { const items = L.filter(l => l.status === s);
    return `<div class="col" data-col="${s}"><h4>${STATUS_LABEL[s]} <span>${items.length}</span></h4>${items.slice(0, 8).map(l => `<div class="kcard" draggable="true" data-lead="${l.id}"><b>${esc(l.name)}</b><small>${esc(l.company)}</small>
      <div class="row"><span>${esc(l.project)}</span><span class="sla ${sla(l).cls}">${sla(l).txt}</span></div></div>`).join('')}${items.length > 8 ? `<small class="muted">+${items.length - 8} more</small>` : ''}</div>`; }).join('')}</div>`;
}
function engage() {
  const L = scoped(), n = L.length, c = k => L.filter(l => l.ack[k] !== 'failed').length;
  const failed = L.filter(l => Object.values(l.ack).includes('failed'));
  return `<div class="grid g4">
    ${kpi('Email delivered', pct(c('email'), n) + '%', `${pct(L.filter(l => l.ack.email === 'opened').length, n)}% opened`, 'ok')}
    ${kpi('WhatsApp delivered', pct(c('whatsapp'), n) + '%', `${pct(L.filter(l => l.ack.whatsapp === 'read').length, n)}% read`, 'ok')}
    ${kpi('SMS delivered', pct(c('sms'), n) + '%', 'Registered sender ID', 'ok')}
    ${kpi('Auto-retried / failed over', failed.length, 'Other channel used automatically', failed.length ? '' : 'ok')}
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3>Message templates</h3><div class="hint">WhatsApp (Meta), SMS (DLT/TRAI) and email</div>
      <div class="table-wrap"><table><thead><tr><th>Template</th><th>Channel</th><th>Status</th><th>Sent</th></tr></thead><tbody>
      ${TEMPLATES.map(t => `<tr><td class="mono">${t.name}</td><td>${t.channel}</td><td><span class="pill ${['Approved', 'Live'].includes(t.status) ? 'ok' : 'warn'}">${t.status}</span></td><td class="mono">${t.used}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>Delivery failures</h3><div class="hint">Failed messages are retried; customer is reached on another channel</div>
      ${failed.length ? `<table><tbody>${failed.slice(0, 8).map(l => `<tr class="click" data-lead="${l.id}"><td><b>${esc(l.name)}</b><br><small class="muted mono">${l.id}</small></td><td>${chans(l)}</td><td><span class="pill warn">Retried</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No failures.</p>'}
    </div>
  </div>
  <div class="card mt"><h3>Consent &amp; spam protection</h3><div class="hint">Controls active on all forms</div>
    <div class="grid g3"><div><b>${pct(L.filter(l => l.consent).length, n)}%</b><br><span class="muted">leads with WhatsApp/SMS consent recorded</span></div>
    <div><b>187</b><br><span class="muted">bot submissions blocked this month</span></div><div><b>0</b><br><span class="muted">acknowledgements lost (auto-retry)</span></div></div></div>`;
}
function ai() {
  const c = CONVOS.find(x => x.id === state.convo) || CONVOS[0];
  return `<div class="grid g4">
    ${kpi('Conversations · 7d', 238, '<span class="up">▲ 18%</span> vs last week')}
    ${kpi('Leads captured by AI', 61, '25.6% conversion', 'ok')}
    ${kpi('Handed to live agent', 34, 'During business hours')}
    ${kpi('Guardrail escalations', 19, 'Pricing / availability asked')}
  </div>
  <div class="split mt">
    <div class="card" style="padding:0"><div style="padding:16px 16px 4px"><h3>Conversations</h3></div><div class="convo-list">${CONVOS.map(x => `<div class="convo ${x.id === c.id ? 'active' : ''}" data-convo="${x.id}"><b>${esc(x.who)}</b> <span class="pill" style="float:right">${x.channel}</span><br><small class="muted">${x.state} · ${x.ago} min ago</small></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><div><h3>${esc(c.who)}</h3><div class="hint">${c.channel} · ${c.state}</div></div>${c.lead ? `<button class="btn sm" data-lead="${c.lead}">Open lead ${c.lead}</button>` : ''}</div>
      <div class="chat">${c.msgs.map(m => `<div class="msg ${m[0]}">${esc(m[1])}</div>`).join('')}</div></div>
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3>Knowledge base</h3><div class="hint">Built from Intellion content</div><table><tbody>${KB.map(k => `<tr><td>${k.topic}</td><td class="muted">${k.items} entries</td><td class="muted">${k.updated}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Assistant settings</h3><div class="hint">Handover and guardrails</div>
      <div class="check"><input type="checkbox" class="switch" checked><span>Live agent handover (Mon–Sat, 9:30–18:30)</span></div>
      <div class="check"><input type="checkbox" class="switch" checked><span>After hours: book callback request</span></div>
      <div class="check"><input type="checkbox" class="switch" checked><span>Never quote price or availability — escalate to sales</span></div>
      <div class="check"><input type="checkbox" class="switch" checked><span>Same assistant on WhatsApp number</span></div></div>
  </div>`;
}
function reports() {
  const L = scoped();
  const table = (title, keyFn) => { const g = {}; L.forEach(l => { const k = keyFn(l); (g[k] = g[k] || []).push(l); });
    return `<div class="card"><h3>${title}</h3><div class="table-wrap"><table><thead><tr><th>${title.replace('By ', '')}</th><th>Leads</th><th>Won</th><th>Conv.</th><th>Avg resp.</th></tr></thead><tbody>${Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => {
      const r = a.filter(l => l.firstResponse).map(l => (l.firstResponse - l.created) / MIN), w = a.filter(l => l.status === 'won').length;
      return `<tr><td>${esc(k)}</td><td class="mono">${a.length}</td><td class="mono">${w}</td><td class="mono">${pct(w, a.length)}%</td><td class="mono">${r.length ? Math.round(r.reduce((x, y) => x + y, 0) / r.length) + ' min' : '—'}</td></tr>`; }).join('')}</tbody></table></div></div>`; };
  return `<div class="filters"><button class="btn primary sm" id="export">Export all leads to Excel (CSV)</button></div>
  <div class="grid g2">${table('By source', l => l.source)}${table('By campaign', l => l.campaign)}${table('By project', l => l.project)}${table('By city', l => l.city)}${table('By team member', l => user(l.owner).name)}
  <div class="card"><h3>Response-time distribution</h3><div class="hint">Time to first contact</div>${(() => { const b = [['≤ 5 min', 0], ['6–15 min', 0], ['16–30 min', 0], ['> 30 min', 0], ['Untouched', 0]];
    L.forEach(l => { if (!l.firstResponse) return b[4][1]++; const m = (l.firstResponse - l.created) / MIN; b[m <= 5 ? 0 : m <= 15 ? 1 : m <= 30 ? 2 : 3][1]++; }); return barRows(b); })()}</div></div>`;
}
function settings() {
  return `<div class="grid g2">
  <div class="card"><h3>Lead routing rules</h3><div class="hint">Automatic assignment by project and city</div><table><thead><tr><th>Project</th><th>City</th><th>Owner</th><th>Escalate to</th></tr></thead><tbody>
    ${ROUTING.map(r => `<tr><td>${r.project}</td><td>${r.city}</td><td>${owner(r.owner)}</td><td>${esc(user(r.backup).name)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h3>Response SLA &amp; alerts</h3><div class="hint">Escalation if a lead is untouched beyond the target time</div>
    <div class="check"><span style="flex:1">Target first response</span><input type="number" value="${SLA_MINUTES}" style="width:80px"> min</div>
    <div class="check"><input type="checkbox" class="switch" checked><span>New-lead alert · Email</span></div>
    <div class="check"><input type="checkbox" class="switch" checked><span>New-lead alert · WhatsApp group</span></div>
    <div class="check"><input type="checkbox" class="switch"><span>New-lead alert · Microsoft Teams</span></div>
    <div class="check"><input type="checkbox" class="switch" checked><span>Escalate to manager on SLA breach</span></div>
    <div style="margin-top:12px"><button class="btn primary sm" id="save">Save changes</button></div></div>
  <div class="card"><h3>Users &amp; access</h3><div class="hint">Separate logins by role</div><table><tbody>${TEAM.map(t => `<tr><td>${owner(t.id)}</td><td>${t.role}</td><td class="muted">${t.region}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h3>Security &amp; compliance</h3><div class="hint">DPDP Act 2023 · TRAI · Meta</div>${COMPLIANCE.map(c => `<div class="check"><span class="pill ${c[1] ? 'ok' : 'warn'}">${c[1] ? 'Done' : 'Pending'}</span><span>${c[0]}</span></div>`).join('')}</div></div>`;
}

// ---------- drawer ----------
function openLead(id) {
  const l = LEADS.find(x => x.id === id); if (!l) return;
  const s = sla(l), ch = (n, v) => `<span class="pill ${v === 'failed' ? 'bad' : 'ok'}">${n}: ${v}</span> `;
  const tl = [[l.created, `Enquiry received via ${l.source}`], [l.created + 2000, 'Spam check passed · reference ' + l.id], [l.created + 4000, `Routed to ${user(l.owner).name} (${l.project}, ${l.city})`], [l.created + 6000, 'Acknowledgement sent on email, WhatsApp and SMS'], [l.created + 9000, 'Team alerted by email and WhatsApp group']];
  if (l.firstResponse) tl.push([l.firstResponse, `First contact by ${user(l.owner).name}`]);
  if (l.escalated) tl.push([l.created + SLA_MINUTES * MIN, 'Escalated to manager (SLA breach)']);
  (l.log || []).forEach(x => tl.push(x));
  $('#drawer').innerHTML = `<button class="btn sm close" id="dclose">Close ✕</button><small class="muted mono">${l.id}</small><h2>${esc(l.name)}</h2><div class="muted">${esc(l.company)}</div>
  <div style="margin-top:10px">${pill(l.status)} <span class="sla ${s.cls}">${s.txt}</span></div>
  <dl class="kv"><dt>Project</dt><dd>${l.project}, ${l.city}</dd><dt>Requirement</dt><dd>${l.seats} · ${l.timeline}</dd><dt>Phone</dt><dd>${l.phone}</dd><dt>Email</dt><dd>${esc(l.email)}</dd>
  <dt>Source</dt><dd>${l.source} · ${l.campaign}</dd><dt>Consent</dt><dd>${l.consent ? 'Recorded' : '<span class="down">Missing</span>'}</dd><dt>Acknowledgement</dt><dd>${ch('Email', l.ack.email)}${ch('WhatsApp', l.ack.whatsapp)}${ch('SMS', l.ack.sms)}</dd></dl>
  <div class="filters"><select id="dstatus">${STATUSES.map(x => `<option value="${x}" ${x === l.status ? 'selected' : ''}>${STATUS_LABEL[x]}</option>`).join('')}</select>
  <select id="downer">${TEAM.map(t => `<option value="${t.id}" ${t.id === l.owner ? 'selected' : ''}>${t.name}</option>`).join('')}</select><button class="btn primary sm" id="dsave">Update</button></div>
  <h4>Activity</h4><ul class="timeline">${tl.sort((a, b) => a[0] - b[0]).map(t => `<li>${esc(t[1])}<small>${new Date(t[0]).toLocaleString()}</small></li>`).join('')}</ul>`;
  $('#drawerBg').classList.add('open');
  $('#dclose').onclick = closeDrawer;
  $('#dsave').onclick = () => {
    const ns = $('#dstatus').value, no = $('#downer').value;
    l.log = l.log || [];
    if (ns !== l.status) { l.log.push([nowTs(), `Status changed to ${STATUS_LABEL[ns]}`]); if (!l.firstResponse && ns !== 'new') l.firstResponse = nowTs(); }
    if (no !== l.owner) l.log.push([nowTs(), `Reassigned to ${user(no).name}`]);
    l.status = ns; l.owner = no; closeDrawer(); render(); toast(`Lead ${l.id} updated`);
  };
}
const closeDrawer = () => $('#drawerBg').classList.remove('open');

// ---------- shell ----------
function exportCsv() {
  const rows = [['Ref', 'Name', 'Company', 'Email', 'Phone', 'Project', 'City', 'Source', 'Campaign', 'Status', 'Owner', 'Received', 'First response (min)']];
  scoped().forEach(l => rows.push([l.id, l.name, l.company, l.email, l.phone, l.project, l.city, l.source, l.campaign, STATUS_LABEL[l.status], user(l.owner).name, new Date(l.created).toISOString(), l.firstResponse ? Math.round((l.firstResponse - l.created) / MIN) : '']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'intellion-leads.csv'; a.click();
}
function simulate() {
  const route = pick(ROUTING), n = pick(NAMES), src = pick(SOURCES);
  const l = { id: 'ILN-' + (24000 + LEADS.length), name: n, company: pick(COMPANIES), email: 'new' + LEADS.length + '@example.com', phone: '+91 98' + Math.floor(10000000 + rnd() * 89999999), project: route.project, city: route.city, source: src, campaign: pick(CAMPAIGNS), seats: '50–100 seats', timeline: '1–3 months', status: 'new', owner: route.owner, created: nowTs(), firstResponse: null, ack: { email: 'delivered', whatsapp: 'delivered', sms: 'delivered' }, escalated: false, consent: true };
  LEADS.unshift(l);
  state.events.push({ t: nowTs(), cls: 'ok', h: `New ${src} lead · ${esc(route.project)}`, s: `${esc(n)} → ${esc(user(route.owner).name)} · acknowledged on 3 channels` });
  toast(`New lead ${l.id} → ${user(route.owner).name}`); render();
}
function renderNav() {
  const open = scoped().filter(l => sla(l).cls === 'bad' && !l.firstResponse && !['won', 'lost'].includes(l.status)).length;
  $('#nav').innerHTML = Object.entries(VIEWS).filter(([, v]) => v.roles.includes(state.role)).map(([k, v]) =>
    `<a href="#${k}" class="${state.view === k ? 'active' : ''}">${icon(k)}${v.label}${k === 'leads' && open ? `<span class="badge">${open}</span>` : ''}</a>`).join('');
}
function render() {
  if (!VIEWS[state.view].roles.includes(state.role)) state.view = 'overview';
  const v = VIEWS[state.view];
  $('#title').textContent = v.label; $('#subtitle').textContent = v.sub;
  $('#view').innerHTML = { overview, leads, pipeline, engage, ai, reports, settings }[state.view]();
  renderNav(); bind(); $('#sidebar').classList.remove('open');
}
function bind() {
  $$('[data-lead]').forEach(e => e.addEventListener('click', ev => { if (!ev.target.closest('.kcard') || ev.detail) openLead(e.dataset.lead); }));
  $$('[data-convo]').forEach(e => e.onclick = () => { state.convo = e.dataset.convo; render(); });
  $$('[data-f]').forEach(e => e.onchange = () => { state.filters[e.dataset.f] = e.value; render(); });
  const q = $('#fq'); if (q) q.oninput = () => { state.filters.q = q.value; $('#leadBody').innerHTML = leadRows(filtered().slice(0, 60)); $$('#leadBody [data-lead]').forEach(e => e.onclick = () => openLead(e.dataset.lead)); };
  const ex = $('#export'); if (ex) ex.onclick = exportCsv;
  const sv = $('#save'); if (sv) sv.onclick = () => toast('Settings saved');
  $$('.kcard').forEach(c => c.ondragstart = e => e.dataTransfer.setData('text', c.dataset.lead));
  $$('.col').forEach(c => { c.ondragover = e => { e.preventDefault(); c.classList.add('over'); }; c.ondragleave = () => c.classList.remove('over');
    c.ondrop = e => { e.preventDefault(); const l = LEADS.find(x => x.id === e.dataTransfer.getData('text')); if (!l) return; l.status = c.dataset.col; if (!l.firstResponse && l.status !== 'new') l.firstResponse = nowTs(); render(); toast(`${l.id} moved to ${STATUS_LABEL[l.status]}`); }; });
}

$('#role').onchange = e => { state.role = e.target.value; render(); };
$('#simulate').onclick = simulate;
$('#menu').onclick = () => $('#sidebar').classList.toggle('open');
$('#drawerBg').onclick = e => { if (e.target.id === 'drawerBg') closeDrawer(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
$('#theme').onclick = () => { const d = document.documentElement; const dark = d.dataset.theme !== 'dark'; d.dataset.theme = dark ? 'dark' : 'light'; $('#theme').textContent = dark ? 'Light mode' : 'Dark mode'; };
const route = () => { const h = location.hash.slice(1); state.view = VIEWS[h] ? h : 'overview'; render(); };
window.addEventListener('hashchange', route); route();
})();
