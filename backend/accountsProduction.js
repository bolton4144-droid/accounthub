const express = require('express');

const router = express.Router();
const round = (v) => Math.round(Number(v || 0) * 100) / 100;
const money = (v) => round(v);

const entity = {
  id: 'cli_klop',
  name: 'KLOP PROPERTIES LTD',
  companyNumber: '12849210',
  periodStart: '2025-04-01',
  periodEnd: '2026-03-31',
  accountsType: 'micro-entity',
  status: 'working_papers_open',
  sicCodes: ['68209'],
  registeredOffice: '7 Bell Yard, London, WC2A 2JR',
  authenticationCodeStatus: 'not_stored',
  corporationTaxUtrStatus: 'encrypted_field_required'
};

const accountsMenus = [
  { name: 'File', items: ['Client details', 'Companies House profile', 'Import trial balance', 'Export accounts pack', 'Lock period'] },
  { name: 'Accounts', items: ['Trial balance', 'Statutory profit and loss', 'Balance sheet', 'Notes to the accounts', 'Director report', 'Members approval'] },
  { name: 'Tax', items: ['Corporation tax computation', 'CT600 preparation', 'Tax adjustments', 'Capital allowances', 'Losses and reliefs'] },
  { name: 'Review', items: ['Disclosure checklist', 'Review points', 'Variance analysis', 'Going concern', 'Related parties'] },
  { name: 'Filing', items: ['Companies House filing', 'HMRC iXBRL filing', 'Submission receipts', 'Filing history'] },
  { name: 'Tools', items: ['Chart mapping', 'Journals', 'Working papers', 'PDF accounts', 'iXBRL readiness'] }
];

const trialBalance = [
  { code:'1000', name:'Sales / Turnover', type:'income', section:'turnover', debit:0, credit:124000, mapping:'P&L: Turnover' },
  { code:'2000', name:'Direct costs', type:'expense', section:'cost_of_sales', debit:38000, credit:0, mapping:'P&L: Cost of sales' },
  { code:'2200', name:'Administrative expenses', type:'expense', section:'admin_expenses', debit:22000, credit:0, mapping:'P&L: Administrative expenses' },
  { code:'2300', name:'Wages and salaries', type:'expense', section:'staff_costs', debit:12570, credit:0, mapping:'P&L: Staff costs' },
  { code:'2310', name:'Employer National Insurance', type:'expense', section:'staff_costs', debit:431, credit:0, mapping:'P&L: Staff costs' },
  { code:'2320', name:'Employer pension contributions', type:'expense', section:'staff_costs', debit:377, credit:0, mapping:'P&L: Staff costs' },
  { code:'2500', name:'Bank fees', type:'expense', section:'admin_expenses', debit:420, credit:0, mapping:'P&L: Administrative expenses' },
  { code:'2520', name:'Depreciation', type:'expense', section:'admin_expenses', debit:3500, credit:0, mapping:'P&L: Depreciation' },
  { code:'2530', name:'Corporation tax charge', type:'expense', section:'tax_charge', debit:8950, credit:0, mapping:'P&L: Tax on profit' },
  { code:'3000', name:'Tangible fixed assets', type:'asset', section:'fixed_assets', debit:45000, credit:0, mapping:'BS: Tangible fixed assets' },
  { code:'3090', name:'Accumulated depreciation', type:'asset', section:'fixed_assets', debit:0, credit:12500, mapping:'BS: Accumulated depreciation' },
  { code:'3200', name:'Inventory / stock', type:'asset', section:'current_assets', debit:8500, credit:0, mapping:'BS: Stocks' },
  { code:'3300', name:'Trade debtors', type:'asset', section:'current_assets', debit:18500, credit:0, mapping:'BS: Debtors' },
  { code:'3400', name:'Prepayments', type:'asset', section:'current_assets', debit:2100, credit:0, mapping:'BS: Prepayments' },
  { code:'1200', name:'Cash at bank', type:'asset', section:'current_assets', debit:39750, credit:0, mapping:'BS: Cash at bank' },
  { code:'4000', name:'Trade creditors', type:'liability', section:'current_liabilities', debit:0, credit:14300, mapping:'BS: Creditors due within one year' },
  { code:'4100', name:'VAT liability', type:'liability', section:'current_liabilities', debit:0, credit:6200, mapping:'BS: Taxation and social security' },
  { code:'4110', name:'Corporation tax liability', type:'liability', section:'current_liabilities', debit:0, credit:8950, mapping:'BS: Corporation tax' },
  { code:'4200', name:'PAYE / payroll taxes', type:'liability', section:'current_liabilities', debit:0, credit:1141, mapping:'BS: Taxation and social security' },
  { code:'4300', name:'Accruals', type:'liability', section:'current_liabilities', debit:0, credit:3600, mapping:'BS: Accruals' },
  { code:'5000', name:'Long term loan', type:'liability', section:'long_term_liabilities', debit:0, credit:18000, mapping:'BS: Creditors due after one year' },
  { code:'7000', name:'Called up share capital', type:'equity', section:'capital_reserves', debit:0, credit:100, mapping:'BS: Called up share capital' },
  { code:'7100', name:'Profit and loss account', type:'equity', section:'capital_reserves', debit:0, credit:11307, mapping:'BS: Profit and loss account' }
];

const journals = [
  { id:'adj_dep', date:'2026-03-31', reference:'DEP-2026', description:'Depreciation charge', status:'posted', lines:[{ code:'2520', debit:3500, credit:0 }, { code:'3090', debit:0, credit:3500 }] },
  { id:'adj_ct', date:'2026-03-31', reference:'CT-2026', description:'Corporation tax provision', status:'reviewed', lines:[{ code:'2200', debit:8950, credit:0 }, { code:'4110', debit:0, credit:8950 }] },
  { id:'adj_payroll', date:'2026-03-31', reference:'PAYROLL-M12', description:'Payroll costs from payroll module', status:'posted', lines:[{ code:'2300', debit:12570, credit:0 }, { code:'2310', debit:431, credit:0 }, { code:'4200', debit:0, credit:1141 }, { code:'4000', debit:0, credit:11860 }] }
];

const disclosureNotes = [
  { id:'accounting-policies', title:'Accounting policies', status:'draft', text:'The accounts are prepared under the historical cost convention and FRS 105 micro-entities regime unless changed by the preparer.' },
  { id:'employees', title:'Employees', status:'ready', text:'Average monthly number of employees during the period: 2.' },
  { id:'directors-advances', title:'Directors advances, credits and guarantees', status:'needs_review', text:'Confirm director loan account position and any section 413 disclosure.' },
  { id:'fixed-assets', title:'Tangible fixed assets', status:'ready', text:'Cost, depreciation and net book value roll-forward generated from mapped accounts.' },
  { id:'called-up-share-capital', title:'Called up share capital', status:'ready', text:'100 ordinary shares of GBP 1 each are allotted, called up and fully paid.' }
];

function tbSummary() {
  const debitTotal = round(trialBalance.reduce((s, r) => s + Number(r.debit || 0), 0));
  const creditTotal = round(trialBalance.reduce((s, r) => s + Number(r.credit || 0), 0));
  return { debitTotal, creditTotal, balanced: debitTotal === creditTotal, difference: round(debitTotal - creditTotal), rows: trialBalance };
}

function sectionTotal(section) {
  return round(trialBalance.filter((r) => r.section === section).reduce((s, r) => s + Number(r.debit || 0) - Number(r.credit || 0), 0));
}

function profitAndLoss() {
  const turnover = Math.abs(sectionTotal('turnover'));
  const costOfSales = sectionTotal('cost_of_sales');
  const adminExpenses = sectionTotal('admin_expenses');
  const staffCosts = sectionTotal('staff_costs');
  const grossProfit = round(turnover - costOfSales);
  const operatingProfit = round(grossProfit - adminExpenses - staffCosts);
  const corporationTax = sectionTotal('tax_charge');
  return { turnover, costOfSales, grossProfit, adminExpenses, staffCosts, operatingProfit, corporationTax, profitAfterTax: round(operatingProfit - corporationTax) };
}

function balanceSheet() {
  const fixedAssets = sectionTotal('fixed_assets');
  const currentAssets = sectionTotal('current_assets');
  const currentLiabilities = Math.abs(sectionTotal('current_liabilities'));
  const longTermLiabilities = Math.abs(sectionTotal('long_term_liabilities'));
  const netCurrentAssets = round(currentAssets - currentLiabilities);
  const netAssets = round(fixedAssets + netCurrentAssets - longTermLiabilities);
  const capitalAndReserves = round(Math.abs(sectionTotal('capital_reserves')) + profitAndLoss().profitAfterTax);
  return { fixedAssets, currentAssets, currentLiabilities, netCurrentAssets, longTermLiabilities, netAssets, capitalAndReserves, balanceCheck:{ balanced: netAssets === capitalAndReserves, difference: round(netAssets - capitalAndReserves) } };
}

function reviewChecks() {
  const tb = tbSummary();
  const bs = balanceSheet();
  const checks = [
    { id:'tb-balanced', label:'Trial balance balances', status:tb.balanced ? 'pass' : 'fail', detail:`Difference GBP ${money(tb.difference)}` },
    { id:'bs-balanced', label:'Balance sheet agrees to capital and reserves', status:bs.balanceCheck.balanced ? 'pass' : 'warning', detail:`Difference GBP ${money(bs.balanceCheck.difference)}` },
    { id:'coa-mapping', label:'All TB lines mapped to statutory headings', status:trialBalance.every((r) => r.mapping) ? 'pass' : 'fail', detail:'Every account has a Companies Act presentation mapping.' },
    { id:'notes-review', label:'Disclosure notes reviewed', status:disclosureNotes.some((n) => n.status === 'needs_review') ? 'warning' : 'pass', detail:'Director loan disclosure needs accountant review.' },
    { id:'companies-house', label:'Companies House live filing', status:'gated', detail:'Requires Companies House API credentials and presenter/authentication code handling.' },
    { id:'hmrc-ct600', label:'HMRC CT600/iXBRL filing', status:'gated', detail:'Requires HMRC credentials, iXBRL tagging engine and filing validation evidence.' }
  ];
  const summary = checks.reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
  return { summary, checks };
}

function accountsPack() {
  return { entity, trialBalance:tbSummary(), profitAndLoss:profitAndLoss(), balanceSheet:balanceSheet(), notes:disclosureNotes, journals, review:reviewChecks(), filing:{ companiesHouse:{ status:process.env.COMPANIES_HOUSE_API_KEY ? 'credentials_configured_ready_for_lookup' : 'credentials_required', liveFilingEnabled:false }, hmrcCorporationTax:{ status:'gated_ixbrl_and_credentials_required', liveFilingEnabled:false } } };
}

function accountsHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Company Accounts</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d;--fail:#a23838}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden}.app{height:100vh;display:grid;grid-template-rows:34px 58px 1fr}.menu{display:flex;gap:5px;background:white;border-bottom:1px solid var(--l);padding:4px 10px}.menu-group{position:relative}.menu-group>button{border:0;background:white;font-weight:900;padding:6px 9px;border-radius:6px}.menu-group:hover>button{background:#edf5f0}.drop{display:none;position:absolute;top:31px;left:0;background:white;border:1px solid var(--l);box-shadow:0 16px 40px #10181525;border-radius:8px;padding:6px;min-width:250px;z-index:10}.menu-group:hover .drop{display:block}.drop button{display:block;width:100%;text-align:left;border:0;background:white;border-radius:5px;padding:8px 10px;font:inherit}.drop button:hover{background:#edf5f0}.top{display:grid;grid-template-columns:1.2fr .8fr .8fr .8fr auto auto;gap:8px;align-items:center;padding:10px 12px;background:white;border-bottom:1px solid var(--l)}select,input,textarea{border:1px solid var(--l);border-radius:6px;min-height:34px;padding:0 9px;font:inherit;font-size:13px;background:white}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:34px;padding:0 11px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{min-height:0;display:grid;grid-template-columns:250px 1fr 350px}.rail,.main,.side{min-height:0;overflow:auto;background:white}.rail{border-right:1px solid var(--l);padding:12px}.main{background:var(--bg);display:grid;grid-template-rows:45px 1fr}.side{border-left:1px solid var(--l);padding:12px}.tabs{display:flex;gap:6px;align-items:center;overflow:auto;background:white;border-bottom:1px solid var(--l);padding:6px 10px}.tab{border:1px solid var(--l);background:white;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:900;white-space:nowrap;cursor:pointer}.tab.active{background:var(--p);border-color:var(--p);color:white}.panel{margin:10px;background:white;border:1px solid var(--l);border-radius:8px;padding:13px}.grid{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:10px}.kpi{border:1px solid var(--l);border-radius:8px;padding:12px;background:#fbfdfc}.kpi span,.muted{color:var(--m);font-size:12px}.kpi strong{display:block;font-size:24px;margin-top:6px}.card{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:10px;margin-bottom:8px;cursor:pointer}.card strong,.card span,.card small{display:block}.pill{border-radius:999px;padding:4px 8px;background:#e8f4ee;color:#3f7358;font-size:12px;font-weight:900}.pill.warning{background:#fff2d8;color:var(--warn)}.pill.fail{background:#ffe8e8;color:var(--fail)}.pill.gated{background:#edf0f3;color:#59646f}.check{border:1px solid var(--l);border-left:5px solid var(--p);border-radius:7px;background:white;padding:8px;margin:8px 0}.check.warning{border-left-color:var(--warn)}.check.fail{border-left-color:var(--fail)}.check.gated{border-left-color:#59646f}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}th{color:var(--m);text-transform:uppercase}.money{text-align:right}.accounts-page{max-height:calc(100vh - 137px);overflow:auto}.note{border:1px solid var(--l);border-radius:8px;padding:11px;background:#fbfdfc;margin-bottom:8px}@media(max-width:1200px){body{overflow:auto}.app{height:auto}.body,.top,.grid{grid-template-columns:1fr}.main{display:block}}</style></head><body><div class="app"><div class="menu" id="menus"></div><div class="top"><select id="entity"></select><select id="period"></select><select id="regime"></select><select id="status"></select><button class="btn p" id="reviewBtn">Run review</button><button class="btn" id="packBtn">Accounts pack</button></div><div class="body"><aside class="rail"><h3>Production workflow</h3><div id="workflow"></div><h3>Working papers</h3><div id="papers"></div></aside><main class="main"><div class="tabs" id="tabs"></div><div id="content" class="accounts-page"></div></main><aside class="side"><h3>Review</h3><div id="review"></div><h3>Filing gates</h3><div id="filing"></div></aside></div></div><script>
let S={}, active='Trial Balance';const fmt=n=>'GBP '+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function table(rows){if(!rows||!rows.length)return '<p class="muted">No rows yet.</p>';const cols=Object.keys(rows[0]);return '<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+cols.map(c=>'<td class="'+(typeof r[c]==='number'?'money':'')+'">'+(typeof r[c]==='number'?fmt(r[c]):r[c])+'</td>').join('')+'</tr>').join('')+'</table>'}function renderShell(){entity.innerHTML='<option>'+S.entity.name+'</option>';period.innerHTML='<option>'+S.entity.periodStart+' to '+S.entity.periodEnd+'</option>';regime.innerHTML=['micro-entity','small company FRS 102 1A','full FRS 102'].map(x=>'<option '+(x===S.entity.accountsType?'selected':'')+'>'+x+'</option>').join('');status.innerHTML='<option>'+S.entity.status+'</option>';menus.innerHTML=S.accountsMenus.map(g=>'<div class="menu-group"><button>'+g.name+'</button><div class="drop">'+g.items.map(i=>'<button data-action="'+i+'">'+i+'</button>').join('')+'</div></div>').join('');tabs.innerHTML=['Trial Balance','Accounts','Tax','Notes','Review','Filing'].map(t=>'<button class="tab '+(t===active?'active':'')+'" data-tab="'+t+'">'+t+'</button>').join('');workflow.innerHTML=['Import TB','Map accounts','Post adjustments','Review disclosures','Generate accounts','Prepare CT600','File when gated items are satisfied'].map(x=>'<div class="card"><strong>'+x+'</strong><span class="muted">Working screen</span></div>').join('');papers.innerHTML=S.journals.map(j=>'<div class="card"><strong>'+j.reference+'</strong><span>'+j.description+'</span><small>'+j.status+'</small></div>').join('');renderMain();renderSide()}function renderMain(){tabs.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===active));if(active==='Trial Balance')content.innerHTML='<div class="panel"><h2>Trial balance</h2><div class="grid"><div class="kpi"><span>Debits</span><strong>'+fmt(S.trialBalance.debitTotal)+'</strong></div><div class="kpi"><span>Credits</span><strong>'+fmt(S.trialBalance.creditTotal)+'</strong></div><div class="kpi"><span>Difference</span><strong>'+fmt(S.trialBalance.difference)+'</strong></div></div>'+table(S.trialBalance.rows)+'</div>';if(active==='Accounts')content.innerHTML='<div class="panel"><h2>Statutory profit and loss</h2>'+table([S.profitAndLoss])+'</div><div class="panel"><h2>Balance sheet</h2>'+table([S.balanceSheet])+'</div>';if(active==='Tax')content.innerHTML='<div class="panel"><h2>Corporation tax computation</h2><p class="muted">Computation engine scaffold. Live CT600 and iXBRL filing remain gated until credentials and tagging validation exist.</p>'+table([{profitBeforeTax:S.profitAndLoss.operatingProfit, addBacks:3500, capitalAllowances:2800, taxableProfit:S.profitAndLoss.operatingProfit+700, estimatedCorporationTax:S.profitAndLoss.corporationTax}])+'</div>';if(active==='Notes')content.innerHTML='<div class="panel"><h2>Notes to the accounts</h2>'+S.notes.map(n=>'<div class="note"><strong>'+n.title+'</strong> <span class="pill '+(n.status==='needs_review'?'warning':'')+'">'+n.status+'</span><p>'+n.text+'</p></div>').join('')+'</div>';if(active==='Review')content.innerHTML='<div class="panel"><h2>Accounts review checklist</h2>'+S.review.checks.map(c=>'<div class="check '+c.status+'"><strong>'+c.label+'</strong><br><span class="muted">'+c.detail+'</span></div>').join('')+'</div>';if(active==='Filing')content.innerHTML='<div class="panel"><h2>Filing readiness</h2>'+table([{destination:'Companies House',status:S.filing.companiesHouse.status,liveFilingEnabled:S.filing.companiesHouse.liveFilingEnabled},{destination:'HMRC Corporation Tax',status:S.filing.hmrcCorporationTax.status,liveFilingEnabled:S.filing.hmrcCorporationTax.liveFilingEnabled}])+'</div>'}function renderSide(){review.innerHTML=['pass','warning','fail','gated'].map(k=>'<div class="card"><strong>'+(S.review.summary[k]||0)+'</strong><span>'+k+'</span></div>').join('')+S.review.checks.map(c=>'<div class="check '+c.status+'"><strong>'+c.label+'</strong><br><span class="muted">'+c.detail+'</span></div>').join('');filing.innerHTML='<div class="card"><strong>Companies House</strong><span>'+S.filing.companiesHouse.status+'</span><small>Live filing disabled</small></div><div class="card"><strong>HMRC CT600/iXBRL</strong><span>'+S.filing.hmrcCorporationTax.status+'</span><small>Live filing disabled</small></div>'}tabs.onclick=e=>{if(e.target.dataset.tab){active=e.target.dataset.tab;renderMain()}};menus.onclick=e=>{if(e.target.dataset.action){const a=e.target.dataset.action;if(/trial balance/i.test(a))active='Trial Balance';else if(/balance|profit|accounts|director|members/i.test(a))active='Accounts';else if(/tax|ct600|capital|loss/i.test(a))active='Tax';else if(/checklist|review|variance|going|related/i.test(a))active='Review';else if(/filing|receipts|history|ixbrl/i.test(a))active='Filing';else if(/notes|disclosure/i.test(a))active='Notes';renderMain()}};reviewBtn.onclick=()=>{active='Review';renderMain()};packBtn.onclick=()=>api('/api/accounts-production/pack').then(x=>{content.innerHTML='<div class="panel"><h2>Accounts production pack JSON</h2><pre>'+JSON.stringify(x,null,2)+'</pre></div>'});api('/api/accounts-production/bootstrap').then(d=>{S=d;renderShell()});
</script></body></html>`;
}

router.get('/company-accounts-workspace', (_req, res) => res.type('html').send(accountsHtml()));
router.get('/api/accounts-production/bootstrap', (_req, res) => res.json({ accountsMenus, ...accountsPack() }));
router.get('/api/accounts-production/trial-balance', (_req, res) => res.json(tbSummary()));
router.get('/api/accounts-production/profit-and-loss', (_req, res) => res.json(profitAndLoss()));
router.get('/api/accounts-production/balance-sheet', (_req, res) => res.json(balanceSheet()));
router.get('/api/accounts-production/notes', (_req, res) => res.json(disclosureNotes));
router.get('/api/accounts-production/review', (_req, res) => res.json(reviewChecks()));
router.get('/api/accounts-production/pack', (_req, res) => res.json(accountsPack()));
router.post('/api/accounts-production/journals/validate', (req, res) => {
  const debitTotal = round((req.body.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0));
  const creditTotal = round((req.body.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0));
  res.json({ valid:debitTotal === creditTotal, debitTotal, creditTotal, difference:round(debitTotal - creditTotal), lines:req.body.lines || [] });
});
router.get('/api/accounts-production/companies-house/readiness', (_req, res) => res.json(accountsPack().filing.companiesHouse));
router.get('/api/accounts-production/hmrc-ct/readiness', (_req, res) => res.json(accountsPack().filing.hmrcCorporationTax));

module.exports = { accountsProductionRouter: router };
