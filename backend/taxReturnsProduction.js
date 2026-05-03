const express = require('express');
const { bookkeepingDigitalRecordsForTax } = require('./bookkeepingProduction');

const router = express.Router();
const round = (v) => Math.round(Number(v || 0) * 100) / 100;
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const taxpayer = {
  id:'tp_demo',
  utr:'1234567890',
  nino:'QQ123456C',
  taxYear:'2026-27',
  title:'Mr',
  firstName:'Mohammad Shaan',
  lastName:'Iqbal',
  dateOfBirth:'1992-02-14',
  address:'7 Bell Yard, London, WC2A 2JR',
  phone:'',
  email:'taxpayer@example.com',
  residencyStatus:'UK resident',
  mtdMandatedStatus:'digital_records_required',
  agentAuthorised:false
};

const questionnaireSections = [
  'Personal details','Residency','Employment','Self employment','Partnership','UK property','Foreign income','Pensions','Savings and investments','Dividends','Capital gains','Student loans','High income child benefit','Marriage allowance','Charitable giving','Reliefs','Payments on account','Bank repayment details','Declaration'
];

const taxReturn = {
  taxpayerId:'tp_demo',
  status:'draft_questionnaire',
  personal:{ blindPersonAllowance:false, marriedCouplesAllowance:false, marriageAllowanceTransfer:'claim_from_spouse', spouseName:'Aisha Iqbal', spouseNino:'QQ654321C' },
  employments:[
    { id:'emp1', employerName:'KLOP PROPERTIES LTD', payeReference:'120/ZE91426', payrollId:'001', employmentIncome:12570, taxDeducted:0, benefits:0, expenses:0, studentLoanDeducted:0, postgraduateLoanDeducted:0, director:false }
  ],
  selfEmployment:{ businessName:'S Iqbal Consultancy', accountingBasis:'cash_basis', accountingPeriodStart:'2026-04-06', accountingPeriodEnd:'2027-04-05', turnoverOverride:null, expensesOverride:null, disallowableExpenses:0, capitalAllowances:2800, privateUseAdjustment:0 },
  ukProperty:{ rentalIncome:0, financeCosts:0, repairs:0, agentFees:0, otherExpenses:0 },
  pensions:{ statePension:0, privatePensions:0, taxDeducted:0 },
  savings:{ bankInterest:250, taxDeducted:0 },
  dividends:{ ukDividends:1200, foreignDividends:0 },
  studentLoans:{ plan:'Plan 2', postgraduateLoan:false, deductionsThroughPayroll:0 },
  childBenefit:{ amountReceived:0, numberOfChildren:0 },
  giftAid:{ donations:0, oneOffDonations:0 },
  reliefs:{ pensionContributionsNet:0, eis:0, seis:0, vct:0, lossesBroughtForward:0 },
  paymentsOnAccount:{ first:0, second:0, balancingPayment:0 },
  repayment:{ nominateBank:false, accountName:'', sortCode:'', accountNumber:'' },
  declaration:{ finalised:false, acceptedByTaxpayer:false, acceptedAt:null }
};

const submissionReceipts = [];

function employments() {
  const rows = [...taxReturn.employments];
  while (rows.length < 10) rows.push({ id:`empty_${rows.length + 1}`, employerName:'', payeReference:'', payrollId:'', employmentIncome:0, taxDeducted:0, benefits:0, expenses:0, studentLoanDeducted:0, postgraduateLoanDeducted:0, director:false });
  return rows.slice(0, 10);
}

function digitalBusinessSummary() {
  const records = bookkeepingDigitalRecordsForTax();
  const se = taxReturn.selfEmployment;
  const turnover = se.turnoverOverride == null ? records.summary.turnover : Number(se.turnoverOverride);
  const expenses = se.expensesOverride == null ? records.summary.allowableExpenses : Number(se.expensesOverride);
  const adjustedProfit = round(turnover - expenses - Number(se.disallowableExpenses || 0) - Number(se.privateUseAdjustment || 0) - Number(se.capitalAllowances || 0));
  return { records, turnover, expenses, adjustedProfit, accountingBasis:se.accountingBasis, source:'digital_bookkeeping_records' };
}

function calculateTax() {
  const business = digitalBusinessSummary();
  const employmentIncome = round(taxReturn.employments.reduce((s, e) => s + Number(e.employmentIncome || 0) + Number(e.benefits || 0) - Number(e.expenses || 0), 0));
  const pensionIncome = round(Number(taxReturn.pensions.statePension || 0) + Number(taxReturn.pensions.privatePensions || 0));
  const savingsIncome = round(Number(taxReturn.savings.bankInterest || 0));
  const dividendIncome = round(Number(taxReturn.dividends.ukDividends || 0) + Number(taxReturn.dividends.foreignDividends || 0));
  const propertyProfit = round(Number(taxReturn.ukProperty.rentalIncome || 0) - Number(taxReturn.ukProperty.financeCosts || 0) - Number(taxReturn.ukProperty.repairs || 0) - Number(taxReturn.ukProperty.agentFees || 0) - Number(taxReturn.ukProperty.otherExpenses || 0));
  const totalIncome = round(employmentIncome + Math.max(0, business.adjustedProfit) + propertyProfit + pensionIncome + savingsIncome + dividendIncome);
  const marriageAllowance = taxReturn.personal.marriageAllowanceTransfer === 'claim_from_spouse' ? 1260 : 0;
  const personalAllowance = totalIncome > 100000 ? Math.max(0, 12570 - Math.floor((totalIncome - 100000) / 2)) : 12570;
  const taxableGeneral = Math.max(0, round(totalIncome - personalAllowance));
  const incomeTax = round(Math.min(taxableGeneral, 37700) * 0.2 + Math.max(0, taxableGeneral - 37700) * 0.4 - marriageAllowance * 0.2);
  const studentLoan = taxReturn.studentLoans.plan === 'None' ? 0 : round(Math.max(0, totalIncome - 27295) * 0.09);
  const taxDeducted = round(taxReturn.employments.reduce((s, e) => s + Number(e.taxDeducted || 0), 0) + Number(taxReturn.pensions.taxDeducted || 0) + Number(taxReturn.savings.taxDeducted || 0));
  const paymentsOnAccount = round(Number(taxReturn.paymentsOnAccount.first || 0) + Number(taxReturn.paymentsOnAccount.second || 0) + Number(taxReturn.paymentsOnAccount.balancingPayment || 0));
  const totalDue = round(Math.max(0, incomeTax) + studentLoan - taxDeducted - paymentsOnAccount);
  return { business, income:{ employmentIncome, businessProfit:business.adjustedProfit, propertyProfit, pensionIncome, savingsIncome, dividendIncome, totalIncome }, allowances:{ personalAllowance, marriageAllowance }, tax:{ incomeTax:Math.max(0, incomeTax), studentLoan, taxDeducted, paymentsOnAccount, totalDue }, caveat:'Calculation is a product workflow estimate. Production needs HMRC tax-year fixtures and accountant review before filing.' };
}

function mtdReadiness() {
  const configured = Boolean(process.env.HMRC_CLIENT_ID && process.env.HMRC_CLIENT_SECRET && process.env.HMRC_REDIRECT_URI);
  return {
    status: configured ? 'credentials_configured_oauth_required' : 'adapter_ready_credentials_required',
    liveFilingEnabled:false,
    requiredSecrets:['HMRC_CLIENT_ID','HMRC_CLIENT_SECRET','HMRC_REDIRECT_URI','PUBLIC_API_BASE_URL'],
    requiredScopes:['read:self-assessment','write:self-assessment'],
    gates:['OAuth consent','agent authorisation','digital records continuity','quarterly update preparation','end of period statement/final declaration support','submission receipt storage'],
    note:'No live Self Assessment or MTD ITSA filing is enabled until credentials, scopes, fraud-prevention headers and HMRC-recognised workflow tests are complete.'
  };
}

function validation() {
  const checks = [
    { id:'utr', label:'UTR present', status:taxpayer.utr ? 'pass' : 'fail', detail:'Required for Self Assessment.' },
    { id:'nino', label:'National Insurance number present', status:taxpayer.nino ? 'pass' : 'fail', detail:'Required for taxpayer identity.' },
    { id:'digital-records', label:'Digital bookkeeping records available', status:bookkeepingDigitalRecordsForTax().income.length ? 'pass' : 'warning', detail:'MTD requires digital records for business income and expenses.' },
    { id:'employment-paye', label:'Employment PAYE references', status:taxReturn.employments.every((e) => e.payeReference) ? 'pass' : 'warning', detail:'Each employment should include PAYE reference and P60/P45 figures.' },
    { id:'student-loans', label:'Student loan section completed', status:taxReturn.studentLoans.plan ? 'pass' : 'warning', detail:'Plan type and payroll deductions should be checked.' },
    { id:'marriage-allowance', label:'Marriage allowance reviewed', status:taxReturn.personal.marriageAllowanceTransfer ? 'pass' : 'warning', detail:'Claim/transfer choice captured.' },
    { id:'declaration', label:'Taxpayer declaration', status:taxReturn.declaration.acceptedByTaxpayer ? 'pass' : 'warning', detail:'Final declaration must be accepted before filing.' },
    { id:'hmrc-filing', label:'HMRC filing', status:'gated', detail:mtdReadiness().note }
  ];
  const summary = checks.reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
  return { summary, checks };
}

function bootstrap() {
  return { taxpayer, questionnaireSections, taxReturn:{ ...taxReturn, employments:employments() }, digitalRecords:bookkeepingDigitalRecordsForTax(), calculation:calculateTax(), validation:validation(), mtd:mtdReadiness(), receipts:submissionReceipts };
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Tax Returns</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--warn:#9a6a1d;--fail:#a23838}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden}.app{height:100vh;display:grid;grid-template-rows:36px 58px 1fr}.menu,.tabs{display:flex;gap:6px;background:white;border-bottom:1px solid var(--l);padding:5px 10px;overflow:auto}.menu button,.tab{border:1px solid var(--l);background:white;border-radius:6px;padding:8px 10px;font-weight:900;white-space:nowrap}.tab.active,.menu button.active{background:var(--p);border-color:var(--p);color:white}.top{display:grid;grid-template-columns:1fr .7fr .8fr auto auto;gap:8px;align-items:center;background:white;border-bottom:1px solid var(--l);padding:10px 12px}select,input{border:1px solid var(--l);border-radius:6px;min-height:34px;padding:0 9px;font:inherit}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:34px;padding:0 11px;font-weight:900;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{display:grid;grid-template-columns:270px 1fr 350px;min-height:0}.rail,.main,.side{min-height:0;overflow:auto;background:white}.rail{border-right:1px solid var(--l);padding:12px}.main{background:var(--bg);display:grid;grid-template-rows:45px 1fr}.side{border-left:1px solid var(--l);padding:12px}.panel{margin:10px;background:white;border:1px solid var(--l);border-radius:8px;padding:13px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.form{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kpi,.card,.check{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:10px;margin-bottom:8px}.check{border-left:5px solid var(--p)}.check.warning{border-left-color:var(--warn)}.check.gated{border-left-color:#59646f}.kpi span,.card span,.muted{color:var(--m);font-size:12px}.kpi strong{display:block;font-size:24px;margin-top:6px}.pill{border-radius:999px;padding:4px 8px;background:#e8f4ee;color:#3f7358;font-size:12px;font-weight:900}.pill.warning{background:#fff2d8;color:var(--warn)}.pill.gated{background:#edf0f3;color:#59646f}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}th{color:var(--m);text-transform:uppercase}.money{text-align:right}.out{white-space:pre-wrap;background:#101815;color:#dbf4e7;border-radius:8px;padding:12px;max-height:430px;overflow:auto;font-size:12px}@media(max-width:1200px){body{overflow:auto}.app{height:auto}.body,.top,.grid,.form{grid-template-columns:1fr}.main{display:block}}</style></head><body><div class="app"><div class="menu"><button data-tab="Overview">Overview</button><button data-tab="Questionnaire">Questionnaire</button><button data-tab="Employments">Employments</button><button data-tab="Digital Records">Digital Records</button><button data-tab="Allowances">Allowances</button><button data-tab="Calculation">Calculation</button><button data-tab="HMRC Filing">HMRC Filing</button></div><div class="top"><select id="taxpayer"></select><select id="taxYear"></select><select id="status"></select><button class="btn p" id="calc">Calculate</button><button class="btn" id="file">File to HMRC</button></div><div class="body"><aside class="rail"><h3>SA return sections</h3><div id="sections"></div></aside><main class="main"><div class="tabs" id="tabs"></div><div id="content"></div></main><aside class="side"><h3>Validation</h3><div id="checks"></div><h3>MTD ITSA gate</h3><div id="mtd"></div></aside></div></div><script>
let S={}, active='Overview';const fmt=n=>'GBP '+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function table(rows){if(!rows||!rows.length)return '<p class="muted">No rows yet.</p>';const cols=Object.keys(rows[0]);return '<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+cols.map(c=>'<td class="'+(typeof r[c]==='number'?'money':'')+'">'+(typeof r[c]==='number'?fmt(r[c]):r[c])+'</td>').join('')+'</tr>').join('')+'</table>'}function tabsList(){return ['Overview','Questionnaire','Employments','Digital Records','Allowances','Calculation','HMRC Filing']}function render(){taxpayer.innerHTML='<option>'+S.taxpayer.firstName+' '+S.taxpayer.lastName+' - UTR '+S.taxpayer.utr+'</option>';taxYear.innerHTML='<option>'+S.taxpayer.taxYear+'</option>';status.innerHTML='<option>'+S.taxReturn.status+'</option>';tabs.innerHTML=tabsList().map(t=>'<button class="tab '+(t===active?'active':'')+'" data-tab="'+t+'">'+t+'</button>').join('');sections.innerHTML=S.questionnaireSections.map(x=>'<div class="card"><strong>'+x+'</strong><span>Questionnaire section</span></div>').join('');renderMain();renderSide()}function renderMain(){if(active==='Overview')content.innerHTML='<div class="panel"><h2>Self Assessment overview</h2><div class="grid"><div class="kpi"><span>Total income</span><strong>'+fmt(S.calculation.income.totalIncome)+'</strong></div><div class="kpi"><span>Tax due estimate</span><strong>'+fmt(S.calculation.tax.totalDue)+'</strong></div><div class="kpi"><span>Digital records</span><strong>'+S.digitalRecords.digitalRecordStatus+'</strong></div></div></div>';if(active==='Questionnaire')content.innerHTML='<div class="panel"><h2>Full tax return questionnaire</h2>'+table(S.questionnaireSections.map(x=>({section:x,status:x==='Declaration'?'taxpayer approval required':'captured / working',source:x==='Self employment'?'digital bookkeeping':'questionnaire'})))+'</div>';if(active==='Employments')content.innerHTML='<div class="panel"><h2>Employments, PAYE references and P60/P45 figures</h2><p class="muted">Supports up to 10 employments.</p>'+table(S.taxReturn.employments)+'</div>';if(active==='Digital Records')content.innerHTML='<div class="panel"><h2>MTD digital bookkeeping records</h2><p class="muted">Business income and expenses are sourced from the bookkeeping engine.</p>'+table(S.digitalRecords.income.concat(S.digitalRecords.expenses))+'</div>';if(active==='Allowances')content.innerHTML='<div class="panel"><h2>Allowances, student loans and reliefs</h2>'+table([{marriageAllowance:S.taxReturn.personal.marriageAllowanceTransfer,studentLoanPlan:S.taxReturn.studentLoans.plan,postgraduateLoan:S.taxReturn.studentLoans.postgraduateLoan,giftAid:S.taxReturn.giftAid.donations,pensionContributions:S.taxReturn.reliefs.pensionContributionsNet,childBenefit:S.taxReturn.childBenefit.amountReceived}])+'</div>';if(active==='Calculation')content.innerHTML='<div class="panel"><h2>Tax calculation</h2><p class="muted">'+S.calculation.caveat+'</p>'+table([S.calculation.income])+'<br>'+table([S.calculation.allowances])+'<br>'+table([S.calculation.tax])+'</div>';if(active==='HMRC Filing')content.innerHTML='<div class="panel"><h2>File directly to HMRC</h2><span class="pill gated">'+S.mtd.status+'</span><p class="muted">'+S.mtd.note+'</p><pre class="out">'+JSON.stringify({taxpayer:{utr:S.taxpayer.utr,nino:S.taxpayer.nino},taxYear:S.taxpayer.taxYear,calculation:S.calculation.tax,requiredScopes:S.mtd.requiredScopes,gates:S.mtd.gates},null,2)+'</pre></div>'}function renderSide(){checks.innerHTML=S.validation.checks.map(c=>'<div class="check '+c.status+'"><strong>'+c.label+'</strong><br><span class="muted">'+c.detail+'</span></div>').join('');mtd.innerHTML='<div class="card"><strong>'+S.mtd.status+'</strong><span>'+S.mtd.requiredSecrets.join(', ')+'</span></div>'}tabs.onclick=e=>{if(e.target.dataset.tab){active=e.target.dataset.tab;renderMain()}};calc.onclick=async()=>{S=await api('/api/tax-returns-production/bootstrap');active='Calculation';render()};file.onclick=async()=>{try{content.innerHTML='<div class="panel"><h2>HMRC filing</h2><pre class="out">'+JSON.stringify(await api('/api/tax-returns-production/hmrc/submit',{method:'POST',body:JSON.stringify({finalised:false})}),null,2)+'</pre></div>'}catch(e){content.innerHTML='<div class="panel"><h2>HMRC filing gated</h2><pre class="out">'+JSON.stringify(e,null,2)+'</pre></div>'}};api('/api/tax-returns-production/bootstrap').then(d=>{S=d;render()});
</script></body></html>`;
}

router.get('/tax-returns-workspace', (_req, res) => res.type('html').send(pageHtml()));
router.get('/api/tax-returns-production/bootstrap', (_req, res) => res.json(bootstrap()));
router.get('/api/tax-returns-production/questionnaire', (_req, res) => res.json({ sections:questionnaireSections, taxReturn:{ ...taxReturn, employments:employments() } }));
router.get('/api/tax-returns-production/digital-records', (_req, res) => res.json(bookkeepingDigitalRecordsForTax()));
router.get('/api/tax-returns-production/calculation', (_req, res) => res.json(calculateTax()));
router.get('/api/tax-returns-production/validation', (_req, res) => res.json(validation()));
router.put('/api/tax-returns-production/employments', (req, res) => {
  const rows = Array.isArray(req.body.employments) ? req.body.employments.slice(0, 10) : [];
  taxReturn.employments = rows.map((e, i) => ({ id:e.id || `emp${i + 1}`, employerName:e.employerName || '', payeReference:e.payeReference || '', payrollId:e.payrollId || '', employmentIncome:round(e.employmentIncome), taxDeducted:round(e.taxDeducted), benefits:round(e.benefits), expenses:round(e.expenses), studentLoanDeducted:round(e.studentLoanDeducted), postgraduateLoanDeducted:round(e.postgraduateLoanDeducted), director:!!e.director }));
  res.json({ employments:employments(), calculation:calculateTax(), validation:validation() });
});
router.put('/api/tax-returns-production/questionnaire', (req, res) => {
  Object.keys(req.body || {}).forEach((section) => { if (taxReturn[section] && typeof taxReturn[section] === 'object') taxReturn[section] = { ...taxReturn[section], ...req.body[section] }; });
  res.json(bootstrap());
});
router.get('/api/tax-returns-production/hmrc/readiness', (_req, res) => res.json(mtdReadiness()));
router.get('/api/tax-returns-production/hmrc/obligations', (_req, res) => res.status(401).json({ error:'HMRC OAuth token required before MTD ITSA obligation lookup.', readiness:mtdReadiness() }));
router.post('/api/tax-returns-production/hmrc/quarterly-update', (req, res) => res.status(503).json({ error:'MTD ITSA quarterly update filing is gated until HMRC credentials, OAuth, fraud-prevention headers and digital record submission tests are complete.', attempted:req.body, readiness:mtdReadiness(), payloadPreview:digitalBusinessSummary() }));
router.post('/api/tax-returns-production/hmrc/submit', (req, res) => res.status(503).json({ error:'Self Assessment final declaration filing is gated until HMRC credentials, authorisation, final declaration workflow and receipt storage are configured.', attempted:req.body, readiness:mtdReadiness(), payloadPreview:{ taxpayer, calculation:calculateTax(), validation:validation() } }));
router.get('/api/tax-returns-production/hmrc/receipts', (_req, res) => res.json(submissionReceipts));

module.exports = { taxReturnsProductionRouter: router };
