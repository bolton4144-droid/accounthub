const express = require('express');
const { addCommandCentreClient } = require('./commandCentreProduction');

const router = express.Router();
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const onboardedClients = [];
const demoCompany = {
  companyNumber:'12849210',
  companyName:'KLOP PROPERTIES LTD',
  companyStatus:'active',
  companyType:'ltd',
  registeredOfficeAddress:'7 Bell Yard, London, WC2A 2JR',
  accountsDue:'2026-12-31',
  confirmationStatementDue:'2026-09-30',
  incorporationDate:'2020-08-19',
  sicCodes:['68209'],
  directors:[
    { name:'MOHAMMAD SHAAN IQBAL', role:'director', appointedOn:'2020-08-19', nationality:'British', occupation:'Director' },
    { name:'MAYA KHAN', role:'director', appointedOn:'2024-05-01', nationality:'British', occupation:'Accountant' }
  ],
  source:'demo_fallback_companies_house_credentials_required'
};

function authHeader() {
  return `Basic ${Buffer.from(`${process.env.COMPANIES_HOUSE_API_KEY}:`).toString('base64')}`;
}

function addressText(address = {}) {
  if (typeof address === 'string') return address;
  return [address.address_line_1, address.address_line_2, address.locality, address.region, address.postal_code, address.country].filter(Boolean).join(', ');
}

async function companiesHouse(path) {
  if (!process.env.COMPANIES_HOUSE_API_KEY) return null;
  const response = await fetch(`https://api.company-information.service.gov.uk${path}`, { headers:{ Authorization:authHeader() } });
  if (!response.ok) throw new Error(`Companies House API returned ${response.status}`);
  return response.json();
}

async function profileFor(number) {
  const profile = await companiesHouse(`/company/${encodeURIComponent(number)}`);
  if (!profile) return null;
  let officers = { items:[] };
  try { officers = await companiesHouse(`/company/${encodeURIComponent(number)}/officers?items_per_page=25`) || officers; } catch (_err) {}
  return {
    companyNumber:profile.company_number,
    companyName:profile.company_name,
    companyStatus:profile.company_status,
    companyType:profile.type,
    registeredOfficeAddress:addressText(profile.registered_office_address),
    accountsDue:profile.accounts?.next_due || '',
    confirmationStatementDue:profile.confirmation_statement?.next_due || '',
    incorporationDate:profile.date_of_creation || '',
    sicCodes:profile.sic_codes || [],
    directors:(officers.items || []).filter((o) => !o.resigned_on).slice(0, 20).map((o) => ({ name:o.name, role:o.officer_role, appointedOn:o.appointed_on, nationality:o.nationality || '', occupation:o.occupation || '' })),
    source:'companies_house_api'
  };
}

async function searchCompanies(query = '') {
  const q = String(query || '').trim();
  if (!q) return [];
  if (/^\d{6,8}$/.test(q)) {
    const profile = await profileFor(q);
    return profile ? [profile] : [];
  }
  const results = await companiesHouse(`/search/companies?q=${encodeURIComponent(q)}&items_per_page=10`);
  if (!results) return [];
  return (results.items || []).map((item) => ({
    companyNumber:item.company_number,
    companyName:item.title,
    companyStatus:item.company_status,
    companyType:item.company_type,
    registeredOfficeAddress:addressText(item.address),
    accountsDue:'',
    confirmationStatementDue:'',
    incorporationDate:item.date_of_creation || '',
    sicCodes:[],
    directors:[],
    source:'companies_house_search_result'
  }));
}

function readiness() {
  return {
    status:process.env.COMPANIES_HOUSE_API_KEY ? 'credentials_configured_live_search_ready' : 'adapter_ready_credentials_required_demo_fallback',
    requiredSecrets:['COMPANIES_HOUSE_API_KEY'],
    supported:['company search by name','company lookup by number','registered office address','accounts next due date','confirmation statement next due date','active officers/directors']
  };
}

function onboardingHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Add Client</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d)}.app{min-height:100vh;display:grid;grid-template-columns:360px 1fr 360px}.side,.review{background:white;padding:16px;border-right:1px solid var(--l)}.review{border-right:0;border-left:1px solid var(--l)}.main{padding:16px;min-width:0}.panel,.card{background:white;border:1px solid var(--l);border-radius:8px;padding:13px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.form{display:grid;gap:10px}label{display:grid;gap:6px;color:var(--m);font-size:12px;font-weight:900;text-transform:uppercase}input,select,textarea{border:1px solid var(--l);border-radius:6px;min-height:38px;padding:0 10px;font:inherit;background:white}textarea{padding:9px;min-height:90px}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:38px;padding:0 12px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.muted,.card span{color:var(--m);font-size:12px}.pill{border-radius:999px;padding:4px 8px;background:#e8f4ee;color:#3f7358;font-size:12px;font-weight:900}.pill.warning{background:#fff2d8;color:var(--warn)}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}.result{cursor:pointer}.result.active{border-color:var(--p);box-shadow:inset 4px 0 0 var(--p)}@media(max-width:1100px){.app{grid-template-columns:1fr}.side,.review{border:0}.grid{grid-template-columns:1fr}}</style></head><body><div class="app"><aside class="side"><h2>Add client</h2><p class="muted">Choose entity type first. Limited companies can be pulled from Companies House.</p><div class="form"><label>Entity type<select id="entityType"><option value="limited_company">Limited company</option><option value="sole_trader">Sole trader</option></select></label><label>Search Companies House<input id="query" value="KLOP PROPERTIES LTD" placeholder="Company name or number"></label><button class="btn p" id="search">Search</button><div id="readiness"></div></div><h3>Search results</h3><div id="results"></div></aside><main class="main"><div class="panel"><h2>Client onboarding details</h2><div class="grid"><label>Client / company name<input id="name"></label><label>Company number<input id="companyNumber"></label><label>Registered office<textarea id="registeredOffice"></textarea></label><label>Director / proprietor personal address<textarea id="personalAddress"></textarea></label><label>Companies House authentication code<input id="authCode" type="password" placeholder="Stored encrypted in production"></label><label>Accounts due<input id="accountsDue" type="date"></label><label>Confirmation statement due<input id="confirmationDue" type="date"></label><label>VAT return due<input id="vatDue" type="date"></label><label>Payroll filing date<input id="payrollDue" type="date"></label><label>Bookkeeping deadline<input id="bookkeepingDue" type="date"></label><label>Manager<input id="manager" value="Aisha Patel"></label><label>Bookkeeper<input id="bookkeeper" value="Team Alpha"></label></div><p><label><input type="checkbox" id="amlComplete"> AML complete</label> <label><input type="checkbox" id="hmrcAgentRegistration"> HMRC agent registration complete</label></p><button class="btn p" id="create">Create client and populate Command Centre</button></div><div class="panel"><h2>Directors / officers</h2><div id="directors"></div></div></main><aside class="review"><h2>Command Centre preview</h2><div id="preview"></div><h3>Created clients</h3><div id="created"></div></aside></div><script>
let selected=null, created=[];async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function card(a,b,c=''){return '<div class="card"><strong>'+a+'</strong><br><span>'+b+'</span><br><small class="muted">'+c+'</small></div>'}function fill(x){selected=x;name.value=x.companyName||'';companyNumber.value=x.companyNumber||'';registeredOffice.value=x.registeredOfficeAddress||'';accountsDue.value=x.accountsDue||'';confirmationDue.value=x.confirmationStatementDue||'';directors.innerHTML=(x.directors||[]).length?'<table><tr><th>Name</th><th>Role</th><th>Appointed</th><th>Occupation</th></tr>'+x.directors.map(d=>'<tr><td>'+d.name+'</td><td>'+d.role+'</td><td>'+(d.appointedOn||'')+'</td><td>'+(d.occupation||'')+'</td></tr>').join('')+'</table>':'<p class="muted">Select a company profile to load officers.</p>';renderPreview()}function renderPreview(){preview.innerHTML=card(name.value||'New client','Accounts due '+(accountsDue.value||'not set'),'Confirmation due '+(confirmationDue.value||'not set'))+card('Compliance','AML '+(amlComplete.checked?'complete':'not complete'),'HMRC agent registration '+(hmrcAgentRegistration.checked?'complete':'not complete'))}async function init(){const r=await api('/api/client-onboarding/companies-house/readiness');readiness.innerHTML='<span class="pill '+(r.status.includes('required')?'warning':'')+'">'+r.status+'</span>'}search.onclick=async()=>{if(entityType.value==='sole_trader'){fill({companyName:query.value||'New sole trader',companyNumber:'',registeredOfficeAddress:'',directors:[],source:'sole_trader_manual'});results.innerHTML=card('Sole trader manual setup','Companies House not applicable','Enter personal address and HMRC details manually.');return}const r=await api('/api/client-onboarding/companies-house/search?q='+encodeURIComponent(query.value));results.innerHTML=r.results.map((x,i)=>'<div class="card result" data-i="'+i+'"><strong>'+x.companyName+'</strong><br><span>'+x.companyNumber+' | '+x.companyStatus+'</span><br><small class="muted">'+x.registeredOfficeAddress+'</small></div>').join('');window.lastResults=r.results};results.onclick=e=>{const c=e.target.closest('[data-i]');if(c)fill(window.lastResults[Number(c.dataset.i)])};[name,accountsDue,confirmationDue,vatDue,payrollDue,bookkeepingDue,amlComplete,hmrcAgentRegistration].forEach(x=>x.oninput=renderPreview);create.onclick=async()=>{const payload={entityType:entityType.value,name:name.value,companyNumber:companyNumber.value,registeredOffice:registeredOffice.value,personalAddress:personalAddress.value,companiesHouseAuthCode:authCode.value,accountsDue:accountsDue.value,confirmationDue:confirmationDue.value,vatDue:vatDue.value,payrollDue:payrollDue.value,bookkeepingDue:bookkeepingDue.value,manager:manager.value,bookkeeper:bookkeeper.value,amlComplete:amlComplete.checked,hmrcAgentRegistration:hmrcAgentRegistration.checked,directors:selected?selected.directors:[]};const r=await api('/api/client-onboarding/clients',{method:'POST',body:JSON.stringify(payload)});created.unshift(r.client);created=created.slice(0,5);created.innerHTML=created.map(c=>card(c.name,c.companyNumber||'sole trader','Inserted into Command Centre')).join('')};init().then(()=>search.click());
</script></body></html>`;
}

router.get('/client-onboarding-workspace', (_req, res) => res.type('html').send(onboardingHtml()));
router.get('/api/client-onboarding/companies-house/readiness', (_req, res) => res.json(readiness()));
router.get('/api/client-onboarding/companies-house/search', async (req, res) => {
  try {
    let results = await searchCompanies(req.query.q);
    if (!results.length && !process.env.COMPANIES_HOUSE_API_KEY) results = [demoCompany];
    res.json({ readiness:readiness(), results });
  } catch (error) {
    res.status(502).json({ error:'Companies House lookup failed', detail:error.message, readiness:readiness(), fallback:[demoCompany] });
  }
});
router.get('/api/client-onboarding/companies-house/company/:number', async (req, res) => {
  try {
    const profile = await profileFor(req.params.number);
    res.json(profile || { ...demoCompany, companyNumber:req.params.number });
  } catch (error) {
    res.status(502).json({ error:'Companies House company profile failed', detail:error.message, fallback:{ ...demoCompany, companyNumber:req.params.number } });
  }
});
router.post('/api/client-onboarding/clients', (req, res) => {
  const client = {
    id:uid('onboarded'),
    entityType:req.body.entityType || 'limited_company',
    name:req.body.name,
    companyNumber:req.body.companyNumber,
    registeredOffice:req.body.registeredOffice,
    personalAddress:req.body.personalAddress,
    companiesHouseAuthCodeStatus:req.body.companiesHouseAuthCode ? 'captured_sensitive_demo_memory_encrypt_in_production' : 'not_captured',
    amlComplete:!!req.body.amlComplete,
    hmrcAgentRegistration:!!req.body.hmrcAgentRegistration,
    directors:req.body.directors || [],
    createdAt:new Date().toISOString()
  };
  onboardedClients.unshift(client);
  const commandCentreClient = addCommandCentreClient(req.body);
  res.status(201).json({ client, commandCentreClient, message:'Client onboarded and Command Centre populated.' });
});
router.get('/api/client-onboarding/clients', (_req, res) => res.json(onboardedClients));

module.exports = { clientOnboardingProductionRouter: router };
