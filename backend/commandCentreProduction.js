const express = require('express');

const router = express.Router();
const DAY = 24 * 60 * 60 * 1000;
const baseDate = () => new Date(new Date().toISOString().slice(0, 10));
const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * DAY);
const daysUntil = (date) => Math.ceil((new Date(date) - baseDate()) / DAY);

const sectors = ['Property', 'Consulting', 'Retail', 'Construction', 'Healthcare', 'Hospitality', 'Ecommerce', 'Creative', 'Technology', 'Transport'];
const towns = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Liverpool', 'Sheffield', 'Nottingham', 'Reading', 'Cambridge'];
const managers = ['Aisha Patel', 'Daniel Hughes', 'Maya Khan', 'Oliver Grant', 'Sophie Williams', 'Imran Shah', 'Charlotte Evans', 'Ryan Cooper'];
const bookkeepers = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Offshore Review', 'Partner Queue'];
const statuses = ['not_started', 'records_requested', 'in_progress', 'client_query', 'ready_for_review', 'filed'];

function statusFor(days) {
  if (days < 0) return 'overdue';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'due_soon';
  return 'ok';
}

function deadlineObject(label, date, owner, statusSeed = 0) {
  const dueIn = daysUntil(date);
  return { label, date, dueIn, risk:statusFor(dueIn), status:statuses[Math.abs(statusSeed) % statuses.length], owner };
}

function buildClients(count = 1000) {
  const today = baseDate();
  return Array.from({ length:count }, (_, i) => {
    const n = i + 1;
    const sector = sectors[i % sectors.length];
    const yearEndMonth = (i % 12) + 1;
    const manager = managers[i % managers.length];
    const bookkeeper = bookkeepers[i % bookkeepers.length];
    const baseOffset = ((i * 17) % 210) - 55;
    const companyNumber = String(10000000 + n).padStart(8, '0');
    const accountsDue = iso(addDays(today, baseOffset));
    const confirmationDue = iso(addDays(today, ((i * 11) % 365) - 90));
    const vatDue = iso(addDays(today, ((i * 7) % 95) - 22));
    const payrollDue = iso(addDays(today, ((i * 5) % 35) - 8));
    const bookkeepingDue = iso(addDays(today, ((i * 3) % 45) - 12));
    const deadlines = {
      accounts:deadlineObject('Companies House accounts', accountsDue, manager, i),
      confirmation:deadlineObject('Confirmation statement', confirmationDue, manager, i + 1),
      vat:deadlineObject('VAT return', vatDue, bookkeeper, i + 2),
      payroll:deadlineObject('Payroll filing', payrollDue, 'Payroll bureau', i + 3),
      bookkeeping:deadlineObject('Bookkeeping', bookkeepingDue, bookkeeper, i + 4)
    };
    const next = Object.entries(deadlines).map(([type, d]) => ({ type, ...d })).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    const openTasks = Object.values(deadlines).filter((d) => d.status !== 'filed').length;
    return {
      id:`client_${String(n).padStart(4, '0')}`,
      name:`${sector} ${towns[i % towns.length]} ${n} Ltd`,
      companyNumber,
      sector,
      town:towns[i % towns.length],
      manager,
      bookkeeper,
      yearEnd:`2026-${String(yearEndMonth).padStart(2, '0')}-${String(new Date(2026, yearEndMonth, 0).getDate()).padStart(2, '0')}`,
      vatScheme:i % 7 === 0 ? 'flat-rate' : i % 5 === 0 ? 'cash' : 'standard',
      payrollFrequency:i % 6 === 0 ? 'weekly' : 'monthly',
      bookkeepingFrequency:i % 4 === 0 ? 'weekly' : 'monthly',
      openTasks,
      nextDeadline:next,
      deadlines
    };
  });
}

const clients = buildClients(1000);

function addCommandCentreClient(input = {}) {
  const today = baseDate();
  const companyNumber = input.companyNumber || `MAN${String(clients.length + 1).padStart(5, '0')}`;
  const name = input.name || input.companyName || `New Client ${clients.length + 1}`;
  const manager = input.manager || managers[0];
  const bookkeeper = input.bookkeeper || bookkeepers[0];
  const deadlines = {
    accounts:deadlineObject('Companies House accounts', input.accountsDue || iso(addDays(today, 90)), manager, 1),
    confirmation:deadlineObject('Confirmation statement', input.confirmationDue || iso(addDays(today, 120)), manager, 2),
    vat:deadlineObject('VAT return', input.vatDue || iso(addDays(today, 35)), bookkeeper, 3),
    payroll:deadlineObject('Payroll filing', input.payrollDue || iso(addDays(today, 7)), 'Payroll bureau', 4),
    bookkeeping:deadlineObject('Bookkeeping', input.bookkeepingDue || iso(addDays(today, 14)), bookkeeper, 5)
  };
  const next = Object.entries(deadlines).map(([type, d]) => ({ type, ...d })).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const client = {
    id:input.id || `client_${String(clients.length + 1).padStart(4, '0')}`,
    name,
    companyNumber,
    sector:input.entityType === 'sole_trader' ? 'Sole trader' : 'Limited company',
    town:input.town || 'Unassigned',
    manager,
    bookkeeper,
    yearEnd:input.yearEnd || '',
    vatScheme:input.vatScheme || 'standard',
    payrollFrequency:input.payrollFrequency || 'monthly',
    bookkeepingFrequency:input.bookkeepingFrequency || 'monthly',
    openTasks:Object.values(deadlines).filter((d) => d.status !== 'filed').length,
    nextDeadline:next,
    deadlines,
    onboarding:{ entityType:input.entityType || 'limited_company', personalAddress:input.personalAddress || '', companiesHouseAuthCodeStatus:input.companiesHouseAuthCode ? 'captured_sensitive_demo_memory' : 'not_captured', amlComplete:!!input.amlComplete, hmrcAgentRegistration:!!input.hmrcAgentRegistration }
  };
  clients.unshift(client);
  return client;
}

function filteredClients(query = {}) {
  const search = String(query.search || '').toLowerCase();
  const risk = String(query.risk || 'all');
  const deadlineType = String(query.deadlineType || 'next');
  const manager = String(query.manager || 'all');
  const status = String(query.status || 'all');
  const sort = String(query.sort || 'nextDeadlineDate');
  const direction = String(query.direction || 'asc') === 'desc' ? -1 : 1;
  let rows = clients.filter((c) => {
    const selectedDeadline = deadlineType === 'next' ? c.nextDeadline : c.deadlines[deadlineType];
    return (!search || `${c.name} ${c.companyNumber} ${c.manager} ${c.bookkeeper}`.toLowerCase().includes(search))
      && (risk === 'all' || selectedDeadline?.risk === risk)
      && (manager === 'all' || c.manager === manager)
      && (status === 'all' || selectedDeadline?.status === status);
  });
  rows = rows.sort((a, b) => {
    const av = sort === 'clientName' ? a.name : sort === 'manager' ? a.manager : sort === 'accountsDue' ? a.deadlines.accounts.date : sort === 'confirmationDue' ? a.deadlines.confirmation.date : sort === 'vatDue' ? a.deadlines.vat.date : sort === 'payrollDue' ? a.deadlines.payroll.date : sort === 'bookkeepingDue' ? a.deadlines.bookkeeping.date : a.nextDeadline.date;
    const bv = sort === 'clientName' ? b.name : sort === 'manager' ? b.manager : sort === 'accountsDue' ? b.deadlines.accounts.date : sort === 'confirmationDue' ? b.deadlines.confirmation.date : sort === 'vatDue' ? b.deadlines.vat.date : sort === 'payrollDue' ? b.deadlines.payroll.date : sort === 'bookkeepingDue' ? b.deadlines.bookkeeping.date : b.nextDeadline.date;
    return String(av).localeCompare(String(bv)) * direction;
  });
  const limit = Math.min(Number(query.limit || 1000), 1000);
  return rows.slice(0, limit);
}

function summary(rows = clients) {
  const deadlineRows = rows.flatMap((c) => Object.entries(c.deadlines).map(([type, d]) => ({ clientId:c.id, type, ...d })));
  const byRisk = deadlineRows.reduce((a, d) => { a[d.risk] = (a[d.risk] || 0) + 1; return a; }, {});
  const byType = deadlineRows.reduce((a, d) => { a[d.type] = (a[d.type] || 0) + 1; return a; }, {});
  const next30 = deadlineRows.filter((d) => d.dueIn >= 0 && d.dueIn <= 30).length;
  const overdue = deadlineRows.filter((d) => d.dueIn < 0).length;
  return { totalClients:rows.length, totalDeadlines:deadlineRows.length, overdue, urgent:byRisk.urgent || 0, dueSoon:byRisk.due_soon || 0, next30, byRisk, byType, generatedAt:new Date().toISOString() };
}

function workbookRows(rows) {
  return rows.map((c) => ({
    client:c.name,
    companyNumber:c.companyNumber,
    manager:c.manager,
    bookkeeper:c.bookkeeper,
    accountsDue:c.deadlines.accounts.date,
    accountsRisk:c.deadlines.accounts.risk,
    confirmationDue:c.deadlines.confirmation.date,
    confirmationRisk:c.deadlines.confirmation.risk,
    vatDue:c.deadlines.vat.date,
    vatRisk:c.deadlines.vat.risk,
    payrollDue:c.deadlines.payroll.date,
    payrollRisk:c.deadlines.payroll.risk,
    bookkeepingDue:c.deadlines.bookkeeping.date,
    bookkeepingRisk:c.deadlines.bookkeeping.risk,
    nextDeadline:c.nextDeadline.label,
    nextDeadlineDate:c.nextDeadline.date,
    nextDeadlineRisk:c.nextDeadline.risk,
    openTasks:c.openTasks
  }));
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Command Centre</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d;--fail:#a23838;--blue:#245c91}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden;text-rendering:optimizeLegibility}.app{height:100vh;display:grid;grid-template-rows:66px 64px 1fr}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;background:white;border-bottom:1px solid var(--l);padding:12px 16px}.brand strong{font-size:20px}.brand span,.muted{color:var(--m);font-size:12px}.filters{display:grid;grid-template-columns:1.4fr .8fr .8fr .8fr .9fr .7fr auto;gap:8px;align-items:center;background:white;border-bottom:1px solid var(--l);padding:10px 16px}select,input{border:1px solid var(--l);border-radius:6px;min-height:36px;padding:0 10px;font:inherit}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{display:grid;grid-template-columns:260px 1fr;min-height:0}.side{background:white;border-right:1px solid var(--l);padding:12px;overflow:auto}.main{min-width:0;overflow:hidden;padding:12px}.kpi{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:11px;margin-bottom:8px}.kpi span,.kpi strong{display:block}.kpi strong{font-size:25px;margin-top:5px}.table-wrap{border:1px solid var(--l);border-radius:8px;overflow-y:auto;overflow-x:hidden;background:white;max-height:calc(100vh - 168px)}table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;min-width:0}th,td{border-bottom:1px solid var(--l);border-right:1px solid #eef3ef;padding:7px 8px;font-size:11px;white-space:normal;overflow-wrap:anywhere;line-height:1.3;vertical-align:top}th{position:sticky;top:0;z-index:2;background:#f9fbfa;color:#4f5d56;text-transform:uppercase;font-size:11px;cursor:pointer}td:first-child,th:first-child{position:sticky;left:0;background:white;z-index:3;width:170px}th:first-child{background:#f9fbfa}.risk{border-radius:999px;padding:3px 7px;font-weight:900;font-size:11px}.ok{background:#e8f4ee;color:#3f7358}.due_soon{background:#e8f0fb;color:var(--blue)}.urgent{background:#fff2d8;color:var(--warn)}.overdue{background:#ffe8e8;color:var(--fail)}.row-overdue td:first-child{box-shadow:inset 4px 0 0 var(--fail)}.row-urgent td:first-child{box-shadow:inset 4px 0 0 var(--warn)}.legend{display:grid;gap:8px;margin-top:12px}.legend div{display:flex;justify-content:space-between;border:1px solid var(--l);border-radius:7px;padding:8px;background:#fbfdfc}@media(max-width:1050px){body{overflow:auto;overflow-x:hidden}.app{height:auto}.filters,.body{grid-template-columns:1fr}.table-wrap{max-height:none}.side{border-right:0}}</style></head><body><div class="app"><div class="top"><div class="brand"><strong>Command Centre</strong><br><span>1,000-client accountant deadline control room</span></div><button class="btn p" id="refresh">Refresh live view</button></div><div class="filters"><input id="search" placeholder="Search client, company number, manager"><select id="deadlineType"><option value="next">Next deadline</option><option value="accounts">Accounts due</option><option value="confirmation">Confirmation statement</option><option value="vat">VAT return</option><option value="payroll">Payroll filing</option><option value="bookkeeping">Bookkeeping</option></select><select id="risk"><option value="all">All risk</option><option value="overdue">Overdue</option><option value="urgent">Due in 7 days</option><option value="due_soon">Due in 30 days</option><option value="ok">OK</option></select><select id="manager"><option value="all">All managers</option></select><select id="status"><option value="all">All statuses</option><option>not_started</option><option>records_requested</option><option>in_progress</option><option>client_query</option><option>ready_for_review</option><option>filed</option></select><select id="sort"><option value="nextDeadlineDate">Sort: next date</option><option value="clientName">Sort: client</option><option value="accountsDue">Sort: accounts</option><option value="confirmationDue">Sort: confirmation</option><option value="vatDue">Sort: VAT</option><option value="payrollDue">Sort: payroll</option><option value="bookkeepingDue">Sort: bookkeeping</option><option value="manager">Sort: manager</option></select><button class="btn" id="exportBtn">Export JSON</button></div><div class="body"><aside class="side"><h3>Portfolio</h3><div id="kpis"></div><h3>Deadline legend</h3><div class="legend"><div><span class="risk overdue">overdue</span><strong id="lo">0</strong></div><div><span class="risk urgent">urgent</span><strong id="lu">0</strong></div><div><span class="risk due_soon">due soon</span><strong id="ld">0</strong></div><div><span class="risk ok">ok</span><strong id="lk">0</strong></div></div></aside><main class="main"><div class="table-wrap"><table id="grid"></table></div></main></div></div><script>
let S={rows:[],summary:{}};async function api(p){const r=await fetch(p);if(!r.ok)throw await r.json();return r.json()}function qs(){return '?search='+encodeURIComponent(search.value)+'&deadlineType='+deadlineType.value+'&risk='+risk.value+'&manager='+encodeURIComponent(manager.value)+'&status='+status.value+'&sort='+sort.value+'&limit=1000'}function risk(x){return '<span class="risk '+x+'">'+x+'</span>'}function tdDate(d){return d.date+'<br>'+risk(d.risk)+' <span class="muted">'+d.status+'</span>'}function render(){const s=S.summary;kpis.innerHTML='<div class="kpi"><span>Total clients</span><strong>'+s.totalClients+'</strong></div><div class="kpi"><span>Total deadlines</span><strong>'+s.totalDeadlines+'</strong></div><div class="kpi"><span>Due in next 30 days</span><strong>'+s.next30+'</strong></div><div class="kpi"><span>Filtered rows</span><strong>'+S.rows.length+'</strong></div>';lo.textContent=s.byRisk.overdue||0;lu.textContent=s.byRisk.urgent||0;ld.textContent=s.byRisk.due_soon||0;lk.textContent=s.byRisk.ok||0;grid.innerHTML='<tr>'+['Client','Company no','Manager','Bookkeeper','Accounts due','Confirmation due','VAT due','Payroll due','Bookkeeping due','Next deadline','Open tasks'].map((h,i)=>'<th data-i="'+i+'">'+h+'</th>').join('')+'</tr>'+S.rows.map(c=>'<tr class="row-'+c.nextDeadline.risk+'"><td><strong>'+c.name+'</strong><br><span class="muted">'+c.sector+' | '+c.town+'</span></td><td>'+c.companyNumber+'</td><td>'+c.manager+'</td><td>'+c.bookkeeper+'</td><td>'+tdDate(c.deadlines.accounts)+'</td><td>'+tdDate(c.deadlines.confirmation)+'</td><td>'+tdDate(c.deadlines.vat)+'</td><td>'+tdDate(c.deadlines.payroll)+'</td><td>'+tdDate(c.deadlines.bookkeeping)+'</td><td><strong>'+c.nextDeadline.label+'</strong><br>'+c.nextDeadline.date+' '+risk(c.nextDeadline.risk)+'</td><td>'+c.openTasks+'</td></tr>').join('')}async function load(){const data=await api('/api/command-centre/clients'+qs());S=data;if(manager.options.length===1){data.managers.forEach(m=>manager.innerHTML+='<option>'+m+'</option>')}render()}[search,deadlineType,risk,manager,status,sort].forEach(x=>x.oninput=load);refresh.onclick=load;exportBtn.onclick=()=>{const w=open();w.document.write('<pre>'+JSON.stringify(S.rows,null,2)+'</pre>')};load();
</script></body></html>`;
}

router.get('/command-centre-workspace', (_req, res) => res.type('html').send(pageHtml()));
router.get('/api/command-centre/clients', (req, res) => {
  const rows = filteredClients(req.query);
  res.json({ rows, summary:summary(rows), managers, query:req.query });
});
router.get('/api/command-centre/summary', (_req, res) => res.json(summary(clients)));
router.get('/api/command-centre/deadlines', (req, res) => {
  const selected = String(req.query.deadlineType || 'all');
  const rows = filteredClients(req.query).flatMap((c) => Object.entries(c.deadlines)
    .filter(([type]) => selected === 'all' || selected === 'next' || selected === type)
    .map(([type, d]) => ({ clientId:c.id, client:c.name, companyNumber:c.companyNumber, type, ...d })));
  res.json({ rows, count:rows.length });
});

module.exports = { commandCentreProductionRouter: router, addCommandCentreClient };
