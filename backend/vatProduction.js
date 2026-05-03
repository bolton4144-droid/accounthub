const express = require('express');
const { bookkeepingVatFeed } = require('./bookkeepingProduction');

const router = express.Router();
const round = (v) => Math.round(Number(v || 0) * 100) / 100;
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const vatEntity = {
  id: 'cli_klop',
  name: 'KLOP PROPERTIES LTD',
  vrn: '123456789',
  periodKey: '25A4',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  dueDate: '2026-05-07',
  scheme: 'standard',
  flatRatePercent: 14.5,
  retailScheme: 'point_of_sale',
  status: 'draft_from_bookkeeping'
};

const vatSchemes = [
  { id:'standard', name:'Standard invoice accounting', basis:'invoice_date', notes:'Uses VAT on sales and purchase invoices dated inside the VAT period.' },
  { id:'cash', name:'Cash accounting scheme', basis:'payment_date', notes:'Uses payments received and payments made inside the VAT period.' },
  { id:'flat-rate', name:'Flat Rate Scheme', basis:'gross_turnover', notes:'Calculates VAT due as a percentage of VAT-inclusive turnover. Input VAT is normally restricted except eligible capital items.' },
  { id:'retail', name:'Retail scheme', basis:'retail_takings', notes:'Calculates output VAT from retail takings using point of sale, apportionment or direct calculation method.' }
];

const taxCodes = [
  { code:'T20', label:'Standard rate 20%', rate:20, vatBox:'1/4', netBox:'6/7' },
  { code:'T5', label:'Reduced rate 5%', rate:5, vatBox:'1/4', netBox:'6/7' },
  { code:'T0', label:'Zero rated', rate:0, vatBox:'none', netBox:'6/7' },
  { code:'EXEMPT', label:'Exempt / outside scope', rate:0, vatBox:'none', netBox:'none' },
  { code:'RC', label:'Domestic reverse charge', rate:20, vatBox:'1 and 4', netBox:'6/7' },
  { code:'IMPORT', label:'Postponed import VAT', rate:20, vatBox:'1 and 4', netBox:'7' }
];

const bookkeepingTransactions = [
  { id:'bk_sale_001', source:'sales_invoice', date:'2026-01-12', paymentDate:'2026-01-25', contact:'Northbank Estates Ltd', accountCode:'1000', description:'Management fees January', taxCode:'T20', type:'sale', net:18000, vat:3600, gross:21600, paidNet:18000, paidVat:3600, paidGross:21600, includeInVat:true },
  { id:'bk_sale_002', source:'sales_invoice', date:'2026-02-09', paymentDate:'2026-04-10', contact:'Albion Property Group', accountCode:'1000', description:'Consulting February', taxCode:'T20', type:'sale', net:22000, vat:4400, gross:26400, paidNet:0, paidVat:0, paidGross:0, includeInVat:true },
  { id:'bk_sale_003', source:'retail_takings', date:'2026-03-18', paymentDate:'2026-03-18', contact:'Retail takings', accountCode:'1000', description:'VAT inclusive retail takings', taxCode:'T20', type:'sale', net:8333.33, vat:1666.67, gross:10000, paidNet:8333.33, paidVat:1666.67, paidGross:10000, includeInVat:true, retail:true },
  { id:'bk_bill_001', source:'purchase_bill', date:'2026-01-18', paymentDate:'2026-02-01', contact:'Cloud Software Ltd', accountCode:'2200', description:'Accounting software', taxCode:'T20', type:'purchase', net:1200, vat:240, gross:1440, paidNet:1200, paidVat:240, paidGross:1440, includeInVat:true },
  { id:'bk_bill_002', source:'purchase_bill', date:'2026-02-20', paymentDate:'2026-02-25', contact:'Stationery World', accountCode:'2200', description:'Office supplies', taxCode:'T20', type:'purchase', net:450, vat:90, gross:540, paidNet:450, paidVat:90, paidGross:540, includeInVat:true },
  { id:'bk_bill_003', source:'purchase_bill', date:'2026-03-01', paymentDate:'2026-03-29', contact:'Van supplier', accountCode:'3000', description:'Capital van purchase', taxCode:'T20', type:'purchase', net:12500, vat:2500, gross:15000, paidNet:12500, paidVat:2500, paidGross:15000, includeInVat:true, capitalAsset:true },
  { id:'bk_import_001', source:'purchase_bill', date:'2026-03-11', paymentDate:'2026-03-11', contact:'EU supplier', accountCode:'2000', description:'Postponed import VAT goods', taxCode:'IMPORT', type:'purchase', net:3200, vat:640, gross:3200, paidNet:3200, paidVat:640, paidGross:3200, includeInVat:true, acquisition:true }
];

const vatAdjustmentJournals = [
  { id:'vjadj_001', date:'2026-03-31', reference:'VAT-ADJ-001', description:'Bad debt relief output VAT adjustment', box:'box1', amount:-120, status:'posted' },
  { id:'vjadj_002', date:'2026-03-31', reference:'VAT-ADJ-002', description:'Input VAT partial exemption adjustment', box:'box4', amount:-35, status:'posted' }
];

const submissionReceipts = [];

function inPeriod(tx, scheme = vatEntity.scheme) {
  const d = scheme === 'cash' ? tx.paymentDate : tx.date;
  return d >= vatEntity.periodStart && d <= vatEntity.periodEnd;
}

function adjustment(box) {
  return round(vatAdjustmentJournals.filter((j) => j.box === box && j.status === 'posted').reduce((s, j) => s + Number(j.amount || 0), 0));
}

function baseRows(scheme = vatEntity.scheme) {
  return [...bookkeepingTransactions, ...bookkeepingVatFeed()].filter((tx) => tx.includeInVat && inPeriod(tx, scheme));
}

function standardReturn(scheme = 'standard') {
  const rows = baseRows(scheme);
  const sales = rows.filter((tx) => tx.type === 'sale');
  const purchases = rows.filter((tx) => tx.type === 'purchase');
  const basis = scheme === 'cash' ? { net:'paidNet', vat:'paidVat', gross:'paidGross' } : { net:'net', vat:'vat', gross:'gross' };
  const box1 = round(sales.reduce((s, tx) => s + Number(tx[basis.vat] || 0), 0) + purchases.filter((tx) => ['RC','IMPORT'].includes(tx.taxCode)).reduce((s, tx) => s + Number(tx[basis.vat] || 0), 0) + adjustment('box1'));
  const box2 = round(rows.filter((tx) => tx.acquisition).reduce((s, tx) => s + Number(tx[basis.vat] || 0), 0) + adjustment('box2'));
  const box4 = round(purchases.filter((tx) => tx.taxCode !== 'EXEMPT').reduce((s, tx) => s + Number(tx[basis.vat] || 0), 0) + adjustment('box4'));
  const box6 = Math.round(sales.reduce((s, tx) => s + Number(tx[basis.net] || 0), 0) + adjustment('box6'));
  const box7 = Math.round(purchases.reduce((s, tx) => s + Number(tx[basis.net] || 0), 0) + adjustment('box7'));
  const box8 = Math.round(rows.filter((tx) => tx.euDispatch).reduce((s, tx) => s + Number(tx[basis.net] || 0), 0) + adjustment('box8'));
  const box9 = Math.round(rows.filter((tx) => tx.acquisition).reduce((s, tx) => s + Number(tx[basis.net] || 0), 0) + adjustment('box9'));
  return withTotals({ scheme, rows, boxes:{ box1, box2, box4, box6, box7, box8, box9 } });
}

function flatRateReturn() {
  const rows = baseRows('standard');
  const salesGross = round(rows.filter((tx) => tx.type === 'sale').reduce((s, tx) => s + Number(tx.gross || 0), 0));
  const capitalInputVat = round(rows.filter((tx) => tx.type === 'purchase' && tx.capitalAsset && Number(tx.gross) >= 2000).reduce((s, tx) => s + Number(tx.vat || 0), 0));
  return withTotals({ scheme:'flat-rate', rows, boxes:{ box1:round(salesGross * vatEntity.flatRatePercent / 100 + adjustment('box1')), box2:adjustment('box2'), box4:round(capitalInputVat + adjustment('box4')), box6:Math.round(salesGross + adjustment('box6')), box7:Math.round(rows.filter((tx) => tx.type === 'purchase').reduce((s, tx) => s + Number(tx.net || 0), 0) + adjustment('box7')), box8:adjustment('box8'), box9:adjustment('box9') } });
}

function retailReturn() {
  const rows = baseRows('standard');
  const retailGross = round(rows.filter((tx) => tx.retail).reduce((s, tx) => s + Number(tx.gross || 0), 0));
  const nonRetailSales = rows.filter((tx) => tx.type === 'sale' && !tx.retail);
  const retailVat = round(retailGross * 20 / 120);
  const box1 = round(retailVat + nonRetailSales.reduce((s, tx) => s + Number(tx.vat || 0), 0) + adjustment('box1'));
  const box4 = round(rows.filter((tx) => tx.type === 'purchase').reduce((s, tx) => s + Number(tx.vat || 0), 0) + adjustment('box4'));
  return withTotals({ scheme:'retail', rows, boxes:{ box1, box2:adjustment('box2'), box4, box6:Math.round(nonRetailSales.reduce((s, tx) => s + Number(tx.net || 0), 0) + retailGross - retailVat + adjustment('box6')), box7:Math.round(rows.filter((tx) => tx.type === 'purchase').reduce((s, tx) => s + Number(tx.net || 0), 0) + adjustment('box7')), box8:adjustment('box8'), box9:adjustment('box9') } });
}

function withTotals({ scheme, rows, boxes }) {
  const box3 = round(Number(boxes.box1 || 0) + Number(boxes.box2 || 0));
  const box5 = round(box3 - Number(boxes.box4 || 0));
  return { entity:{ ...vatEntity, scheme }, generatedAt:new Date().toISOString(), scheme, rows, adjustments:vatAdjustmentJournals, boxes:{ box1:round(boxes.box1), box2:round(boxes.box2), box3, box4:round(boxes.box4), box5, box6:Math.round(boxes.box6 || 0), box7:Math.round(boxes.box7 || 0), box8:Math.round(boxes.box8 || 0), box9:Math.round(boxes.box9 || 0) }, status:'draft_not_submitted', source:'bookkeeping_realtime_memory_store' };
}

function vatReturn(scheme = vatEntity.scheme) {
  if (scheme === 'flat-rate') return flatRateReturn();
  if (scheme === 'retail') return retailReturn();
  return standardReturn(scheme);
}

function mtdReadiness() {
  const configured = Boolean(process.env.HMRC_CLIENT_ID && process.env.HMRC_CLIENT_SECRET && process.env.HMRC_REDIRECT_URI);
  return {
    status: configured ? 'credentials_configured_oauth_required' : 'adapter_ready_credentials_required',
    liveFilingEnabled: false,
    requiredSecrets: ['HMRC_CLIENT_ID','HMRC_CLIENT_SECRET','HMRC_REDIRECT_URI','PUBLIC_API_BASE_URL'],
    requiredScopes: ['read:vat','write:vat'],
    gate: configured ? 'OAuth consent, obligations lookup and final declaration still required.' : 'HMRC credentials are required before OAuth or live submission can run.'
  };
}

function bootstrap() {
  return { entity:vatEntity, schemes:vatSchemes, taxCodes, transactions:bookkeepingTransactions, adjustments:vatAdjustmentJournals, currentReturn:vatReturn(vatEntity.scheme), mtd:mtdReadiness(), receipts:submissionReceipts };
}

function vatHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole VAT</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden}.app{height:100vh;display:grid;grid-template-rows:36px 58px 1fr}.menu{display:flex;gap:5px;background:white;border-bottom:1px solid var(--l);padding:4px 10px}.menu button{border:0;background:white;border-radius:6px;padding:7px 10px;font-weight:900}.top{display:grid;grid-template-columns:1.2fr .8fr .8fr .8fr auto auto;gap:8px;align-items:center;background:white;border-bottom:1px solid var(--l);padding:10px 12px}select,input{border:1px solid var(--l);border-radius:6px;min-height:34px;padding:0 9px;font:inherit}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:34px;padding:0 11px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{display:grid;grid-template-columns:280px 1fr 350px;min-height:0}.rail,.main,.side{min-height:0;overflow:auto;background:white}.rail{border-right:1px solid var(--l);padding:12px}.main{background:var(--bg);display:grid;grid-template-rows:45px 1fr}.side{border-left:1px solid var(--l);padding:12px}.tabs{display:flex;gap:6px;overflow:auto;background:white;border-bottom:1px solid var(--l);padding:6px 10px}.tab{border:1px solid var(--l);background:white;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:900;white-space:nowrap}.tab.active{background:var(--p);border-color:var(--p);color:white}.panel{margin:10px;background:white;border:1px solid var(--l);border-radius:8px;padding:13px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.box{border:1px solid var(--l);border-left:5px solid var(--p);border-radius:8px;background:#fbfdfc;padding:12px}.box strong,.box span{display:block}.box strong{font-size:24px;margin-top:7px}.muted,.box span{color:var(--m);font-size:12px}.card{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:10px;margin-bottom:8px}.pill{border-radius:999px;padding:4px 8px;background:#e8f4ee;color:#3f7358;font-size:12px;font-weight:900}.pill.warning{background:#fff2d8;color:var(--warn)}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}th{color:var(--m);text-transform:uppercase}.money{text-align:right}.form{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.return-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.out{white-space:pre-wrap;background:#101815;color:#dbf4e7;border-radius:8px;padding:12px;max-height:360px;overflow:auto;font-size:12px}@media(max-width:1200px){body{overflow:auto}.app{height:auto}.body,.top,.grid,.return-grid,.form{grid-template-columns:1fr}.main{display:block}}</style></head><body><div class="app"><div class="menu"><button data-tab="Return">VAT Return</button><button data-tab="Bookkeeping">Bookkeeping feed</button><button data-tab="Adjustments">Adjustment journals</button><button data-tab="Schemes">VAT schemes</button><button data-tab="HMRC">HMRC filing</button></div><div class="top"><select id="client"></select><select id="scheme"></select><select id="period"></select><select id="status"></select><button class="btn p" id="calc">Calculate</button><button class="btn" id="file">File to HMRC</button></div><div class="body"><aside class="rail"><h3>Bookkeeping source</h3><div id="source"></div><h3>VAT schemes</h3><div id="schemeCards"></div></aside><main class="main"><div class="tabs" id="tabs"></div><div id="content"></div></main><aside class="side"><h3>MTD gate</h3><div id="mtd"></div><h3>Return summary</h3><div id="summary"></div></aside></div></div><script>
let S={}, active='Return';const fmt=n=>'GBP '+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function table(rows){if(!rows||!rows.length)return '<p class="muted">No rows yet.</p>';const cols=Object.keys(rows[0]);return '<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+cols.map(c=>'<td class="'+(typeof r[c]==='number'?'money':'')+'">'+(typeof r[c]==='number'?fmt(r[c]):r[c])+'</td>').join('')+'</tr>').join('')+'</table>'}function box(k,label){const v=S.currentReturn.boxes[k];return '<div class="box"><span>'+k.toUpperCase()+' - '+label+'</span><strong>'+fmt(v)+'</strong></div>'}function renderShell(){client.innerHTML='<option>'+S.entity.name+' - VRN '+S.entity.vrn+'</option>';scheme.innerHTML=S.schemes.map(x=>'<option value="'+x.id+'" '+(x.id===S.entity.scheme?'selected':'')+'>'+x.name+'</option>').join('');period.innerHTML='<option>'+S.entity.periodStart+' to '+S.entity.periodEnd+'</option>';status.innerHTML='<option>'+S.currentReturn.status+'</option>';tabs.innerHTML=['Return','Bookkeeping','Adjustments','Schemes','HMRC'].map(t=>'<button class="tab '+(t===active?'active':'')+'" data-tab="'+t+'">'+t+'</button>').join('');source.innerHTML=S.currentReturn.rows.map(x=>'<div class="card"><strong>'+x.description+'</strong><span>'+x.type+' | '+x.taxCode+' | '+fmt(x.gross)+'</span></div>').join('');schemeCards.innerHTML=S.schemes.map(x=>'<div class="card"><strong>'+x.name+'</strong><span>'+x.basis+'</span><small class="muted">'+x.notes+'</small></div>').join('');renderMain();renderSide()}function renderMain(){tabs.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===active));if(active==='Return')content.innerHTML='<div class="panel"><h2>UK nine box VAT return</h2><p class="muted">Calculated from bookkeeping transactions and posted VAT adjustment journals.</p><div class="return-grid">'+box('box1','VAT due on sales and other outputs')+box('box2','VAT due on acquisitions')+box('box3','Total VAT due')+box('box4','VAT reclaimed on purchases')+box('box5','Net VAT to pay or reclaim')+box('box6','Total sales excluding VAT')+box('box7','Total purchases excluding VAT')+box('box8','EU dispatches / supplies')+box('box9','EU acquisitions')+'</div></div>';if(active==='Bookkeeping')content.innerHTML='<div class="panel"><h2>Live bookkeeping feed</h2>'+table(S.transactions)+'</div><div class="panel"><h2>Add bookkeeping VAT line</h2><div class="form"><input id="txDesc" value="New sale"><input id="txNet" type="number" value="1000"><select id="txType"><option value="sale">sale</option><option value="purchase">purchase</option></select><select id="txCode">'+S.taxCodes.map(t=>'<option value="'+t.code+'">'+t.label+'</option>').join('')+'</select><button class="btn p" id="addTx">Post bookkeeping line</button></div></div>';if(active==='Adjustments')content.innerHTML='<div class="panel"><h2>VAT adjustment journals</h2>'+table(S.adjustments)+'</div><div class="panel"><h2>Manual VAT journal</h2><div class="form"><input id="adjRef" value="VAT-ADJ"><input id="adjDesc" value="Manual VAT adjustment"><select id="adjBox">'+['box1','box2','box4','box6','box7','box8','box9'].map(b=>'<option>'+b+'</option>').join('')+'</select><input id="adjAmount" type="number" value="0"><button class="btn p" id="addAdj">Post VAT adjustment</button></div></div>';if(active==='Schemes')content.innerHTML='<div class="panel"><h2>VAT schemes</h2>'+table(S.schemes)+'</div>';if(active==='HMRC')content.innerHTML='<div class="panel"><h2>File VAT return directly to HMRC</h2><span class="pill warning">'+S.mtd.status+'</span><p class="muted">'+S.mtd.gate+'</p><pre class="out">'+JSON.stringify({vrn:S.entity.vrn,periodKey:S.entity.periodKey,vatReturn:S.currentReturn.boxes,requiredScopes:S.mtd.requiredScopes},null,2)+'</pre></div>'}function renderSide(){mtd.innerHTML='<div class="card"><strong>'+S.mtd.status+'</strong><span>'+S.mtd.gate+'</span></div>'+S.mtd.requiredSecrets.map(x=>'<div class="card"><strong>'+x+'</strong><span>required</span></div>').join('');summary.innerHTML=Object.entries(S.currentReturn.boxes).map(([k,v])=>'<div class="card"><strong>'+k.toUpperCase()+'</strong><span>'+fmt(v)+'</span></div>').join('')}async function refresh(){S=await api('/api/vat-production/bootstrap?scheme='+scheme.value);renderShell()}tabs.onclick=e=>{if(e.target.dataset.tab){active=e.target.dataset.tab;renderMain()}};scheme.onchange=async()=>{await api('/api/vat-production/scheme',{method:'PUT',body:JSON.stringify({scheme:scheme.value})});await refresh()};calc.onclick=refresh;file.onclick=async()=>{try{content.innerHTML='<div class="panel"><h2>HMRC submission</h2><pre class="out">'+JSON.stringify(await api('/api/vat-production/mtd/submit',{method:'POST',body:JSON.stringify({finalised:false})}),null,2)+'</pre></div>'}catch(e){content.innerHTML='<div class="panel"><h2>HMRC submission gated</h2><pre class="out">'+JSON.stringify(e,null,2)+'</pre></div>'}};content.onclick=async e=>{if(e.target.id==='addTx'){const net=Number(txNet.value);const rate=txCode.value==='T5'?5:txCode.value==='T20'?20:0;await api('/api/vat-production/bookkeeping-transactions',{method:'POST',body:JSON.stringify({description:txDesc.value,type:txType.value,taxCode:txCode.value,net,vat:Math.round(net*rate)/100})});await refresh()}if(e.target.id==='addAdj'){await api('/api/vat-production/adjustment-journals',{method:'POST',body:JSON.stringify({reference:adjRef.value,description:adjDesc.value,box:adjBox.value,amount:Number(adjAmount.value)})});await refresh()}};api('/api/vat-production/bootstrap').then(d=>{S=d;renderShell()});
</script></body></html>`;
}

router.get('/vat-workspace', (_req, res) => res.type('html').send(vatHtml()));
router.get('/api/vat-production/bootstrap', (req, res) => {
  const requestedScheme = req.query.scheme;
  if (requestedScheme && vatSchemes.some((s) => s.id === requestedScheme)) vatEntity.scheme = requestedScheme;
  res.json(bootstrap());
});
router.put('/api/vat-production/scheme', (req, res) => {
  if (!vatSchemes.some((s) => s.id === req.body.scheme)) return res.status(422).json({ error:'Unsupported VAT scheme', supported:vatSchemes.map((s) => s.id) });
  vatEntity.scheme = req.body.scheme;
  res.json({ entity:vatEntity, currentReturn:vatReturn(vatEntity.scheme) });
});
router.get('/api/vat-production/return', (req, res) => res.json(vatReturn(req.query.scheme || vatEntity.scheme)));
router.get('/api/vat-production/bookkeeping-transactions', (_req, res) => res.json(bookkeepingTransactions));
router.post('/api/vat-production/bookkeeping-transactions', (req, res) => {
  const net = round(req.body.net);
  const vat = round(req.body.vat);
  const tx = { id:uid('bk'), source:'manual_bookkeeping', date:req.body.date || vatEntity.periodEnd, paymentDate:req.body.paymentDate || req.body.date || vatEntity.periodEnd, contact:req.body.contact || 'Manual entry', accountCode:req.body.accountCode || (req.body.type === 'purchase' ? '2200' : '1000'), description:req.body.description || 'Manual VAT line', taxCode:req.body.taxCode || 'T20', type:req.body.type || 'sale', net, vat, gross:round(net + vat), paidNet:net, paidVat:vat, paidGross:round(net + vat), includeInVat:true };
  bookkeepingTransactions.unshift(tx);
  res.status(201).json({ transaction:tx, currentReturn:vatReturn(vatEntity.scheme) });
});
router.post('/api/vat-production/adjustment-journals', (req, res) => {
  const journal = { id:uid('vjadj'), date:req.body.date || vatEntity.periodEnd, reference:req.body.reference || uid('VAT-ADJ'), description:req.body.description || 'Manual VAT adjustment', box:req.body.box || 'box1', amount:round(req.body.amount), status:'posted' };
  vatAdjustmentJournals.unshift(journal);
  res.status(201).json({ journal, currentReturn:vatReturn(vatEntity.scheme) });
});
router.get('/api/vat-production/mtd/readiness', (_req, res) => res.json(mtdReadiness()));
router.get('/api/vat-production/mtd/obligations', (_req, res) => res.status(401).json({ error:'HMRC OAuth token required before live VAT obligation lookup.', readiness:mtdReadiness() }));
router.post('/api/vat-production/mtd/submit', (req, res) => res.status(503).json({ error:'HMRC VAT filing is gated until OAuth credentials, fraud-prevention headers, obligations lookup and final declaration workflow are configured.', attempted:req.body, readiness:mtdReadiness(), payloadPreview:vatReturn(vatEntity.scheme).boxes }));
router.get('/api/vat-production/mtd/receipts', (_req, res) => res.json(submissionReceipts));

module.exports = { vatProductionRouter: router };
