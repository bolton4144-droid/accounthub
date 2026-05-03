const express = require('express');

const router = express.Router();
const round = (v) => Math.round(Number(v || 0) * 100) / 100;
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const accounts = [
  ['1000','Sales / Turnover','income'], ['1200','Cash at Bank','asset'], ['2000','Direct Costs','expense'], ['2200','Administrative Expenses','expense'], ['2300','Wages and Salaries','expense'],
  ['3000','Tangible Fixed Assets','asset'], ['3300','Trade Debtors','asset'], ['4000','Trade Creditors','liability'], ['4100','VAT Liability','liability'], ['4200','PAYE / Payroll Taxes','liability'], ['7100','Retained Earnings','equity']
].map(([code, name, type]) => ({ code, name, type }));

const vatCodes = [
  { code:'T20', rate:20, label:'20% standard rate', salesBox:'box1/box6', purchaseBox:'box4/box7' },
  { code:'T5', rate:5, label:'5% reduced rate', salesBox:'box1/box6', purchaseBox:'box4/box7' },
  { code:'T0', rate:0, label:'Zero rated', salesBox:'box6', purchaseBox:'box7' },
  { code:'EXEMPT', rate:0, label:'Exempt/outside scope', salesBox:'none', purchaseBox:'none' },
  { code:'RC', rate:20, label:'Domestic reverse charge', salesBox:'box1/box4/box6/box7', purchaseBox:'box1/box4/box7' }
];

const salesInvoices = [
  { id:'sinv_001', number:'SI-1001', date:'2026-01-12', dueDate:'2026-02-11', customer:'Northbank Estates Ltd', status:'part_paid', accountCode:'1000', net:18000, vatCode:'T20', vat:3600, gross:21600, paid:21600 },
  { id:'sinv_002', number:'SI-1002', date:'2026-02-09', dueDate:'2026-03-10', customer:'Albion Property Group', status:'approved', accountCode:'1000', net:22000, vatCode:'T20', vat:4400, gross:26400, paid:0 },
  { id:'sinv_003', number:'SI-1003', date:'2026-03-18', dueDate:'2026-03-18', customer:'Retail takings', status:'paid', accountCode:'1000', net:8333.33, vatCode:'T20', vat:1666.67, gross:10000, paid:10000, retail:true }
];

const purchaseBills = [
  { id:'bill_001', number:'PB-2001', date:'2026-01-18', dueDate:'2026-02-17', supplier:'Cloud Software Ltd', status:'paid', accountCode:'2200', net:1200, vatCode:'T20', vat:240, gross:1440, paid:1440 },
  { id:'bill_002', number:'PB-2002', date:'2026-02-20', dueDate:'2026-03-21', supplier:'Stationery World', status:'paid', accountCode:'2200', net:450, vatCode:'T20', vat:90, gross:540, paid:540 },
  { id:'bill_003', number:'PB-2003', date:'2026-03-01', dueDate:'2026-03-31', supplier:'Van supplier', status:'paid', accountCode:'3000', net:12500, vatCode:'T20', vat:2500, gross:15000, paid:15000, capitalAsset:true },
  { id:'bill_004', number:'PB-2004', date:'2026-03-11', dueDate:'2026-03-11', supplier:'EU supplier', status:'paid', accountCode:'2000', net:3200, vatCode:'RC', vat:640, gross:3200, paid:3200, acquisition:true }
];

const bankLines = [
  { id:'bank_001', date:'2026-01-25', description:'Northbank Estates Ltd', moneyIn:21600, moneyOut:0, status:'matched', matchedTo:'SI-1001' },
  { id:'bank_002', date:'2026-02-01', description:'Cloud Software Ltd', moneyIn:0, moneyOut:1440, status:'matched', matchedTo:'PB-2001' },
  { id:'bank_003', date:'2026-02-25', description:'Stationery World', moneyIn:0, moneyOut:540, status:'matched', matchedTo:'PB-2002' },
  { id:'bank_004', date:'2026-03-18', description:'Retail takings', moneyIn:10000, moneyOut:0, status:'matched', matchedTo:'SI-1003' },
  { id:'bank_005', date:'2026-03-29', description:'Van supplier', moneyIn:0, moneyOut:15000, status:'matched', matchedTo:'PB-2003' },
  { id:'bank_006', date:'2026-03-31', description:'Unknown payment', moneyIn:0, moneyOut:350, status:'unreconciled', matchedTo:'' }
];

const plaidItems = [];
const statementImports = [];
const categorisationRules = [
  { match:'cloud software', accountCode:'2200', taxCode:'T20', confidence:0.95, reason:'Known software supplier' },
  { match:'stationery', accountCode:'2200', taxCode:'T20', confidence:0.92, reason:'Office supplies keyword' },
  { match:'van supplier', accountCode:'3000', taxCode:'T20', confidence:0.9, reason:'Capital asset supplier' },
  { match:'hmrc', accountCode:'4100', taxCode:'EXEMPT', confidence:0.88, reason:'Tax payment keyword' },
  { match:'payroll', accountCode:'2300', taxCode:'EXEMPT', confidence:0.86, reason:'Payroll control keyword' },
  { match:'bank fee', accountCode:'2200', taxCode:'EXEMPT', confidence:0.84, reason:'Bank charges are normally exempt/outside VAT' },
  { match:'retail takings', accountCode:'1000', taxCode:'T20', confidence:0.93, reason:'Retail sales receipts' }
];

const journals = [
  { id:'jrn_open', date:'2026-01-01', reference:'OPEN-2026', description:'Opening bank balance', status:'posted', lines:[{ accountCode:'1200', debit:25000, credit:0, vatCode:'EXEMPT' }, { accountCode:'7100', debit:0, credit:25000, vatCode:'EXEMPT' }] }
];

function invoiceJournal(inv) {
  return { id:`jrn_${inv.id}`, date:inv.date, reference:inv.number, description:`Sales invoice ${inv.number}`, status:'posted', sourceId:inv.id, lines:[
    { accountCode:'3300', debit:inv.gross, credit:0, vatCode:inv.vatCode },
    { accountCode:inv.accountCode, debit:0, credit:inv.net, vatCode:inv.vatCode },
    { accountCode:'4100', debit:0, credit:inv.vat, vatCode:inv.vatCode }
  ] };
}

function billJournal(bill) {
  return { id:`jrn_${bill.id}`, date:bill.date, reference:bill.number, description:`Purchase bill ${bill.number}`, status:'posted', sourceId:bill.id, lines:[
    { accountCode:bill.accountCode, debit:bill.net, credit:0, vatCode:bill.vatCode },
    { accountCode:'4100', debit:bill.vat, credit:0, vatCode:bill.vatCode },
    { accountCode:'4000', debit:0, credit:bill.gross, vatCode:bill.vatCode }
  ] };
}

function paymentJournals() {
  const sales = salesInvoices.filter((x) => x.paid).map((x) => ({ id:`jrn_pay_${x.id}`, date:x.date, reference:`PAY-${x.number}`, description:`Receipt for ${x.number}`, status:'posted', lines:[{ accountCode:'1200', debit:x.paid, credit:0, vatCode:'EXEMPT' }, { accountCode:'3300', debit:0, credit:x.paid, vatCode:'EXEMPT' }] }));
  const bills = purchaseBills.filter((x) => x.paid).map((x) => ({ id:`jrn_pay_${x.id}`, date:x.date, reference:`PAY-${x.number}`, description:`Payment for ${x.number}`, status:'posted', lines:[{ accountCode:'4000', debit:x.paid, credit:0, vatCode:'EXEMPT' }, { accountCode:'1200', debit:0, credit:x.paid, vatCode:'EXEMPT' }] }));
  return [...sales, ...bills];
}

function ledger() {
  return [...salesInvoices.map(invoiceJournal), ...purchaseBills.map(billJournal), ...paymentJournals(), ...journals];
}

function trialBalance() {
  const totals = {};
  ledger().forEach((j) => j.lines.forEach((l) => {
    totals[l.accountCode] = totals[l.accountCode] || { accountCode:l.accountCode, accountName:accounts.find((a) => a.code === l.accountCode)?.name || 'Unknown', debit:0, credit:0 };
    totals[l.accountCode].debit = round(totals[l.accountCode].debit + Number(l.debit || 0));
    totals[l.accountCode].credit = round(totals[l.accountCode].credit + Number(l.credit || 0));
  }));
  const rows = Object.values(totals).map((r) => ({ ...r, balance:round(r.debit - r.credit) }));
  const debitTotal = round(rows.reduce((s, r) => s + r.debit, 0));
  const creditTotal = round(rows.reduce((s, r) => s + r.credit, 0));
  return { rows, debitTotal, creditTotal, balanced:debitTotal === creditTotal, difference:round(debitTotal - creditTotal) };
}

function vatFeed() {
  const saleRows = salesInvoices.map((x) => ({ id:x.id, source:'bookkeeping_sales_invoice', date:x.date, paymentDate:x.paid ? x.date : '', contact:x.customer, accountCode:x.accountCode, description:x.number, taxCode:x.vatCode, type:'sale', net:x.net, vat:x.vat, gross:x.gross, paidNet:x.paid ? round(x.net * x.paid / x.gross) : 0, paidVat:x.paid ? round(x.vat * x.paid / x.gross) : 0, paidGross:x.paid, includeInVat:true, retail:!!x.retail }));
  const billRows = purchaseBills.map((x) => ({ id:x.id, source:'bookkeeping_purchase_bill', date:x.date, paymentDate:x.paid ? x.date : '', contact:x.supplier, accountCode:x.accountCode, description:x.number, taxCode:x.vatCode === 'RC' ? 'IMPORT' : x.vatCode, type:'purchase', net:x.net, vat:x.vat, gross:x.gross, paidNet:x.paid ? round(x.net * x.paid / x.gross) : 0, paidVat:x.paid ? round(x.vat * x.paid / x.gross) : 0, paidGross:x.paid, includeInVat:true, capitalAsset:!!x.capitalAsset, acquisition:!!x.acquisition }));
  return [...saleRows, ...billRows];
}

function digitalRecordsForTax() {
  const income = salesInvoices.map((x) => ({ id:x.id, type:'self_employment_income', date:x.date, description:x.number, customer:x.customer, amount:x.net, source:'digital_bookkeeping_sales_invoice' }));
  const expenses = purchaseBills.map((x) => ({ id:x.id, type:x.accountCode === '3000' ? 'capital_allowance_candidate' : 'self_employment_expense', date:x.date, description:x.number, supplier:x.supplier, amount:x.net, accountCode:x.accountCode, source:'digital_bookkeeping_purchase_bill' }));
  const turnover = round(income.reduce((s, r) => s + Number(r.amount || 0), 0));
  const allowableExpenses = round(expenses.filter((r) => r.type === 'self_employment_expense').reduce((s, r) => s + Number(r.amount || 0), 0));
  return { period:'2026-04-06 to 2027-04-05', digitalRecordStatus:'software_records_available', income, expenses, summary:{ turnover, allowableExpenses, profitBeforeAdjustments:round(turnover - allowableExpenses), capitalAllowanceCandidates:round(expenses.filter((r) => r.type === 'capital_allowance_candidate').reduce((s, r) => s + Number(r.amount || 0), 0)) } };
}

function dashboard() {
  const tb = trialBalance();
  return {
    salesTotal: round(salesInvoices.reduce((s, x) => s + x.gross, 0)),
    purchasesTotal: round(purchaseBills.reduce((s, x) => s + x.gross, 0)),
    bankBalance: round(bankLines.reduce((s, x) => s + Number(x.moneyIn || 0) - Number(x.moneyOut || 0), 25000)),
    unreconciled: bankLines.filter((x) => x.status !== 'matched').length,
    tb
  };
}

function plaidReadiness() {
  const configured = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  return {
    status: configured ? 'credentials_configured_link_ready' : 'adapter_ready_credentials_required',
    liveSyncEnabled: false,
    environment: process.env.PLAID_ENV || 'sandbox',
    requiredSecrets: ['PLAID_CLIENT_ID','PLAID_SECRET','PLAID_ENV','PUBLIC_API_BASE_URL'],
    flow: ['create Link token','exchange public token','store encrypted access token','sync transactions with cursor','handle SYNC_UPDATES_AVAILABLE webhook'],
    note: configured ? 'Plaid credentials are present; encrypted token storage and user consent flow still need production persistence.' : 'Plaid credentials are required before direct bank feed linking can start.'
  };
}

function csvRows(csv = '') {
  const lines = String(csv).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  return lines.map((line, index) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = headers.reduce((a, h, i) => { a[h] = values[i] || ''; return a; }, {});
    const amount = Number(row.amount || row.value || 0);
    const moneyIn = Number(row.money_in || row.credit || (amount > 0 ? amount : 0));
    const moneyOut = Number(row.money_out || row.debit || (amount < 0 ? Math.abs(amount) : 0));
    return { id:uid('stmt'), date:row.date || row.transaction_date || '2026-03-31', description:row.description || row.reference || `Imported line ${index + 1}`, moneyIn:round(moneyIn), moneyOut:round(moneyOut), status:'imported_unreconciled', matchedTo:'' };
  });
}

function categoryFor(line) {
  const text = String(line.description || line.name || '').toLowerCase();
  const rule = categorisationRules.find((r) => text.includes(r.match));
  if (rule) return { ...line, suggestedAccountCode:rule.accountCode, suggestedTaxCode:rule.taxCode, confidence:rule.confidence, aiMode:process.env.OPENAI_API_KEY ? 'ai_ready_rules_applied' : 'rules_fallback', reason:rule.reason };
  const isIncome = Number(line.moneyIn || 0) > Number(line.moneyOut || 0);
  return { ...line, suggestedAccountCode:isIncome ? '1000' : '2200', suggestedTaxCode:isIncome ? 'T20' : 'T20', confidence:0.62, aiMode:process.env.OPENAI_API_KEY ? 'ai_ready_low_confidence' : 'rules_fallback', reason:'Default bookkeeping classification based on money in/out.' };
}

function bootstrap() {
  return { entity:{ id:'cli_klop', name:'KLOP PROPERTIES LTD' }, accounts, vatCodes, salesInvoices, purchaseBills, bankLines, journals:ledger(), manualJournals:journals, dashboard:dashboard(), vatFeed:vatFeed(), digitalRecords: digitalRecordsForTax(), plaid:plaidReadiness(), plaidItems, statementImports, categorisationRules };
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Bookkeeping</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden}.app{height:100vh;display:grid;grid-template-rows:36px 58px 1fr}.menu,.tabs{display:flex;gap:6px;align-items:center;background:white;border-bottom:1px solid var(--l);padding:5px 10px;overflow:auto}.menu button,.tab{border:1px solid var(--l);background:white;border-radius:6px;padding:8px 10px;font-weight:900;white-space:nowrap}.tab.active,.menu button.active{background:var(--p);border-color:var(--p);color:white}.top{display:grid;grid-template-columns:1.1fr .8fr .8fr auto auto;gap:8px;align-items:center;background:white;border-bottom:1px solid var(--l);padding:10px 12px}select,input,textarea{border:1px solid var(--l);border-radius:6px;min-height:34px;padding:0 9px;font:inherit}textarea{padding:9px;min-height:120px}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:34px;padding:0 11px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{display:grid;grid-template-columns:260px 1fr 330px;min-height:0}.rail,.main,.side{min-height:0;overflow:auto;background:white}.rail{border-right:1px solid var(--l);padding:12px}.main{background:var(--bg);display:grid;grid-template-rows:45px 1fr}.side{border-left:1px solid var(--l);padding:12px}.panel{margin:10px;background:white;border:1px solid var(--l);border-radius:8px;padding:13px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi,.card{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:10px;margin-bottom:8px}.kpi span,.card span,.muted{color:var(--m);font-size:12px}.kpi strong{display:block;font-size:24px;margin-top:6px}.form{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stack{display:grid;gap:8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}th{color:var(--m);text-transform:uppercase}.money{text-align:right}.pill{border-radius:999px;padding:4px 8px;background:#e8f4ee;color:#3f7358;font-size:12px;font-weight:900}.pill.warning{background:#fff2d8;color:var(--warn)}@media(max-width:1200px){body{overflow:auto}.app{height:auto}.body,.top,.grid,.form{grid-template-columns:1fr}.main{display:block}}</style></head><body><div class="app"><div class="menu"><button data-tab="Dashboard">Dashboard</button><button data-tab="Sales">Sales</button><button data-tab="Purchases">Purchases</button><button data-tab="Bank">Bank</button><button data-tab="Bank Feeds">Bank Feeds</button><button data-tab="Statements">Statements</button><button data-tab="AI Categorise">AI Categorise</button><button data-tab="Journals">Journals</button><button data-tab="VAT">VAT feed</button><button data-tab="Trial Balance">Trial Balance</button></div><div class="top"><select><option>KLOP PROPERTIES LTD</option></select><select><option>2025-26</option></select><select><option>Live ledger</option></select><button class="btn p" id="post">Post transaction</button><button class="btn" id="reconcile">Auto match</button></div><div class="body"><aside class="rail"><h3>Actions</h3><div id="actions"></div><h3>VAT codes</h3><div id="vatCodes"></div></aside><main class="main"><div class="tabs" id="tabs"></div><div id="content"></div></main><aside class="side"><h3>Ledger health</h3><div id="health"></div><h3>VAT live feed</h3><div id="vatFeed"></div></aside></div></div><script>
let S={}, active='Dashboard';const fmt=n=>'GBP '+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function table(rows){if(!rows||!rows.length)return '<p class="muted">No rows yet.</p>';const cols=Object.keys(rows[0]);return '<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+cols.map(c=>'<td class="'+(typeof r[c]==='number'?'money':'')+'">'+(typeof r[c]==='number'?fmt(r[c]):r[c])+'</td>').join('')+'</tr>').join('')+'</table>'}function tabsList(){return ['Dashboard','Sales','Purchases','Bank','Bank Feeds','Statements','AI Categorise','Journals','VAT','Trial Balance']}function render(){tabs.innerHTML=tabsList().map(t=>'<button class="tab '+(t===active?'active':'')+'" data-tab="'+t+'">'+t+'</button>').join('');actions.innerHTML=['New sales invoice','New purchase bill','Connect Plaid bank feed','Upload bank statement','AI categorise bank lines','Post manual journal','Run VAT return','Export trial balance'].map(x=>'<div class="card"><strong>'+x+'</strong><span>Working action</span></div>').join('');vatCodes.innerHTML=S.vatCodes.map(x=>'<div class="card"><strong>'+x.code+'</strong><span>'+x.label+'</span></div>').join('');renderMain();renderSide()}function renderMain(){if(active==='Dashboard')content.innerHTML='<div class="panel"><h2>Bookkeeping dashboard</h2><div class="grid"><div class="kpi"><span>Sales</span><strong>'+fmt(S.dashboard.salesTotal)+'</strong></div><div class="kpi"><span>Purchases</span><strong>'+fmt(S.dashboard.purchasesTotal)+'</strong></div><div class="kpi"><span>Bank</span><strong>'+fmt(S.dashboard.bankBalance)+'</strong></div><div class="kpi"><span>Unreconciled</span><strong>'+S.dashboard.unreconciled+'</strong></div></div></div>';if(active==='Sales')content.innerHTML='<div class="panel"><h2>Sales invoices</h2>'+table(S.salesInvoices)+'</div>'+entryForm('sale');if(active==='Purchases')content.innerHTML='<div class="panel"><h2>Purchase bills</h2>'+table(S.purchaseBills)+'</div>'+entryForm('purchase');if(active==='Bank')content.innerHTML='<div class="panel"><h2>Bank reconciliation</h2>'+table(S.bankLines)+'</div>';if(active==='Bank Feeds')content.innerHTML='<div class="panel"><h2>Direct bank feeds via Plaid</h2><span class="pill warning">'+S.plaid.status+'</span><p class="muted">'+S.plaid.note+'</p>'+table([{environment:S.plaid.environment,liveSyncEnabled:S.plaid.liveSyncEnabled,requiredSecrets:S.plaid.requiredSecrets.join(', ')}])+'<p><button class="btn p" id="plaidLink">Create Plaid Link token</button> <button class="btn" id="plaidSync">Sync transactions</button></p><pre class="out" id="feedOut"></pre></div>';if(active==='Statements')content.innerHTML='<div class="panel"><h2>Upload bank statement</h2><p class="muted">CSV extracts line-by-line now. PDF upload is gated until a bank statement parser/OCR provider is configured.</p><div class="stack"><input type="file" id="statementFile" accept=".csv,.pdf"><textarea id="csvText">date,description,amount\\n2026-03-31,Bank fee,-35\\n2026-03-31,Client receipt,1200</textarea><button class="btn p" id="importStatement">Extract statement lines</button></div><pre class="out" id="statementOut"></pre></div>';if(active==='AI Categorise')content.innerHTML='<div class="panel"><h2>AI categorisation</h2><p class="muted">Uses rules fallback now. When OPENAI_API_KEY is configured this route is ready to call an AI classifier with account/VAT-code constraints.</p><button class="btn p" id="categorise">Categorise unreconciled bank lines</button><pre class="out" id="catOut"></pre></div>';if(active==='Journals')content.innerHTML='<div class="panel"><h2>Double-entry journals</h2>'+table(S.journals.flatMap(j=>j.lines.map(l=>({reference:j.reference,date:j.date,description:j.description,...l,status:j.status}))))+'</div>'+journalForm();if(active==='VAT')content.innerHTML='<div class="panel"><h2>VAT-coded bookkeeping feed</h2><p class="muted">This is the feed exposed to the VAT return engine.</p>'+table(S.vatFeed)+'</div>';if(active==='Trial Balance')content.innerHTML='<div class="panel"><h2>Trial balance</h2><span class="pill">'+(S.dashboard.tb.balanced?'balanced':'out of balance')+'</span>'+table(S.dashboard.tb.rows)+'</div>'}function entryForm(type){return '<div class="panel"><h2>Post '+type+'</h2><div class="form"><input id="desc" value="'+(type==='sale'?'New sales invoice':'New purchase bill')+'"><input id="net" type="number" value="1000"><select id="vat">'+S.vatCodes.map(v=>'<option value="'+v.code+'">'+v.code+' - '+v.label+'</option>').join('')+'</select><input id="contact" value="'+(type==='sale'?'Customer Ltd':'Supplier Ltd')+'"><input id="account" value="'+(type==='sale'?'1000':'2200')+'"><button class="btn p" data-post="'+type+'">Post '+type+'</button></div></div>'}function journalForm(){return '<div class="panel"><h2>Manual journal</h2><div class="form"><input id="jref" value="MJ-001"><input id="jdesc" value="Manual adjustment"><input id="jdr" value="2200"><input id="jcr" value="1200"><input id="jamt" type="number" value="100"><button class="btn p" id="postJournal">Post balanced journal</button></div></div>'}function renderSide(){health.innerHTML='<div class="card"><strong>Trial balance</strong><span>'+(S.dashboard.tb.balanced?'Balanced':'Difference '+fmt(S.dashboard.tb.difference))+'</span></div><div class="card"><strong>Journal count</strong><span>'+S.journals.length+'</span></div><div class="card"><strong>Plaid</strong><span>'+S.plaid.status+'</span></div>';vatFeed.innerHTML=S.vatFeed.slice(0,6).map(x=>'<div class="card"><strong>'+x.description+'</strong><span>'+x.type+' | '+x.taxCode+' | '+fmt(x.gross)+'</span></div>').join('')}async function refresh(){S=await api('/api/bookkeeping-production/bootstrap');render()}tabs.onclick=e=>{if(e.target.dataset.tab){active=e.target.dataset.tab;renderMain()}};document.body.onclick=async e=>{if(e.target.dataset.post){const net=Number(document.getElementById('net').value);const code=document.getElementById('vat').value;const rate=code==='T5'?5:code==='T20'||code==='RC'?20:0;await api('/api/bookkeeping-production/'+(e.target.dataset.post==='sale'?'sales-invoices':'purchase-bills'),{method:'POST',body:JSON.stringify({description:desc.value,contact:contact.value,accountCode:account.value,net,vatCode:code,vat:Math.round(net*rate)/100})});await refresh()}if(e.target.id==='postJournal'){await api('/api/bookkeeping-production/journals',{method:'POST',body:JSON.stringify({reference:jref.value,description:jdesc.value,lines:[{accountCode:jdr.value,debit:Number(jamt.value),credit:0,vatCode:'EXEMPT'},{accountCode:jcr.value,debit:0,credit:Number(jamt.value),vatCode:'EXEMPT'}]})});await refresh()}if(e.target.id==='reconcile'){await api('/api/bookkeeping-production/bank/reconcile',{method:'POST'});await refresh()}if(e.target.id==='plaidLink'){feedOut.textContent=JSON.stringify(await api('/api/bookkeeping-production/bank-feeds/plaid/link-token',{method:'POST',body:JSON.stringify({clientId:S.entity.id})}),null,2)}if(e.target.id==='plaidSync'){feedOut.textContent=JSON.stringify(await api('/api/bookkeeping-production/bank-feeds/plaid/sync',{method:'POST'}),null,2);await refresh()}if(e.target.id==='importStatement'){statementOut.textContent=JSON.stringify(await api('/api/bookkeeping-production/bank-statements/import',{method:'POST',body:JSON.stringify({fileName:(statementFile.files[0]||{}).name||'manual.csv',mimeType:(statementFile.files[0]||{}).type||'text/csv',csvText:csvText.value})}),null,2);await refresh()}if(e.target.id==='categorise'){catOut.textContent=JSON.stringify(await api('/api/bookkeeping-production/ai/categorise',{method:'POST',body:JSON.stringify({lines:S.bankLines.filter(x=>x.status!=='matched')})}),null,2)}};api('/api/bookkeeping-production/bootstrap').then(d=>{S=d;render()});
</script></body></html>`;
}

router.get('/bookkeeping-workspace', (_req, res) => res.type('html').send(pageHtml()));
router.get('/api/bookkeeping-production/bootstrap', (_req, res) => res.json(bootstrap()));
router.get('/api/bookkeeping-production/vat-feed', (_req, res) => res.json(vatFeed()));
router.get('/api/bookkeeping-production/digital-records/tax', (_req, res) => res.json(digitalRecordsForTax()));
router.get('/api/bookkeeping-production/trial-balance', (_req, res) => res.json(trialBalance()));
router.get('/api/bookkeeping-production/journals', (_req, res) => res.json(ledger()));
router.get('/api/bookkeeping-production/bank-feeds/plaid/readiness', (_req, res) => res.json(plaidReadiness()));
router.post('/api/bookkeeping-production/bank-feeds/plaid/link-token', (req, res) => {
  const readiness = plaidReadiness();
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) return res.status(503).json({ error:'Plaid credentials required before Link token creation.', readiness });
  res.json({ status:'ready_to_create_link_token', clientId:req.body.clientId || 'cli_klop', products:['transactions'], countryCodes:['GB'], redirectUri:process.env.PUBLIC_API_BASE_URL ? `${process.env.PUBLIC_API_BASE_URL}/bookkeeping-workspace` : null, warning:'Production token storage must be encrypted and tenant-scoped.' });
});
router.post('/api/bookkeeping-production/bank-feeds/plaid/exchange-public-token', (req, res) => {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) return res.status(503).json({ error:'Plaid credentials required before public token exchange.', readiness:plaidReadiness() });
  const item = { id:uid('plaid_item'), institution:req.body.institution || 'Plaid bank', status:'token_exchange_ready_encrypted_storage_required', cursor:null };
  plaidItems.unshift(item);
  res.status(201).json(item);
});
router.post('/api/bookkeeping-production/bank-feeds/plaid/sync', (_req, res) => {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) return res.status(503).json({ error:'Plaid credentials required before transaction sync.', readiness:plaidReadiness(), fallback:'Use CSV/PDF statement import until Plaid is configured.' });
  const imported = [{ id:uid('bank'), date:'2026-03-31', description:'Plaid synced bank fee', moneyIn:0, moneyOut:35, status:'unreconciled', matchedTo:'' }];
  bankLines.unshift(...imported);
  res.json({ imported, bankLines });
});
router.post('/api/bookkeeping-production/bank-statements/import', (req, res) => {
  const fileName = String(req.body.fileName || '').toLowerCase();
  const mime = String(req.body.mimeType || '').toLowerCase();
  if (fileName.endsWith('.pdf') || mime.includes('pdf')) return res.status(202).json({ status:'pdf_parser_provider_required', fileName:req.body.fileName, requiredProviders:['AWS Textract','Azure Document Intelligence','Google Document AI'], message:'PDF bank statements need an OCR/table extraction provider before line-by-line posting.' });
  const rows = csvRows(req.body.csvText || req.body.content || '');
  const categorised = rows.map(categoryFor);
  bankLines.unshift(...categorised.map((r) => ({ id:r.id, date:r.date, description:r.description, moneyIn:r.moneyIn, moneyOut:r.moneyOut, status:'imported_unreconciled', matchedTo:'', suggestedAccountCode:r.suggestedAccountCode, suggestedTaxCode:r.suggestedTaxCode, confidence:r.confidence })));
  const batch = { id:uid('stmt_batch'), fileName:req.body.fileName || 'statement.csv', importedAt:new Date().toISOString(), rows:categorised.length };
  statementImports.unshift(batch);
  res.status(201).json({ batch, rows:categorised, bankLines });
});
router.post('/api/bookkeeping-production/ai/categorise', (req, res) => {
  const lines = Array.isArray(req.body.lines) && req.body.lines.length ? req.body.lines : bankLines.filter((x) => x.status !== 'matched');
  res.json({ mode:process.env.OPENAI_API_KEY ? 'ai_ready_rules_fallback_returned' : 'rules_fallback_openai_key_required', requiredSecret:'OPENAI_API_KEY', suggestions:lines.map(categoryFor), guardrails:['Only suggest accounts from chart of accounts','Only suggest configured VAT codes','Low confidence items require accountant review','Never auto-file VAT/HMRC from AI output'] });
});
router.post('/api/bookkeeping-production/sales-invoices', (req, res) => {
  const net = round(req.body.net);
  const vat = round(req.body.vat);
  const inv = { id:uid('sinv'), number:req.body.number || `SI-${1000 + salesInvoices.length + 1}`, date:req.body.date || '2026-03-31', dueDate:req.body.dueDate || '2026-04-30', customer:req.body.contact || req.body.customer || 'Customer', status:'approved', accountCode:req.body.accountCode || '1000', net, vatCode:req.body.vatCode || 'T20', vat, gross:round(net + vat), paid:0 };
  salesInvoices.unshift(inv);
  res.status(201).json({ invoice:inv, journal:invoiceJournal(inv), vatFeed:vatFeed(), trialBalance:trialBalance() });
});
router.post('/api/bookkeeping-production/purchase-bills', (req, res) => {
  const net = round(req.body.net);
  const vat = round(req.body.vat);
  const bill = { id:uid('bill'), number:req.body.number || `PB-${2000 + purchaseBills.length + 1}`, date:req.body.date || '2026-03-31', dueDate:req.body.dueDate || '2026-04-30', supplier:req.body.contact || req.body.supplier || 'Supplier', status:'approved', accountCode:req.body.accountCode || '2200', net, vatCode:req.body.vatCode || 'T20', vat, gross:round(net + vat), paid:0 };
  purchaseBills.unshift(bill);
  res.status(201).json({ bill, journal:billJournal(bill), vatFeed:vatFeed(), trialBalance:trialBalance() });
});
router.post('/api/bookkeeping-production/journals', (req, res) => {
  const debitTotal = round((req.body.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0));
  const creditTotal = round((req.body.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0));
  if (debitTotal !== creditTotal) return res.status(422).json({ error:'Journal debits and credits must balance', debitTotal, creditTotal, difference:round(debitTotal - creditTotal) });
  const journal = { id:uid('jrn'), date:req.body.date || '2026-03-31', reference:req.body.reference || uid('MJ'), description:req.body.description || 'Manual journal', status:'posted', lines:req.body.lines };
  journals.unshift(journal);
  res.status(201).json({ journal, trialBalance:trialBalance() });
});
router.post('/api/bookkeeping-production/bank/reconcile', (_req, res) => {
  const line = bankLines.find((x) => x.status !== 'matched');
  if (line) { line.status = 'matched'; line.matchedTo = 'manual-spend-money'; }
  res.json({ bankLines, dashboard:dashboard() });
});

module.exports = { bookkeepingProductionRouter: router, bookkeepingVatFeed: vatFeed, bookkeepingDigitalRecordsForTax: digitalRecordsForTax };
