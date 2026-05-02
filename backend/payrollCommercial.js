const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const round = (v) => Math.round(Number(v || 0) * 100) / 100;
const uid = (p) => `${p}_${crypto.randomUUID().slice(0, 8)}`;

const employerSetupTabs = {
  employer: [
    ['name','Employer name','text'], ['address','Address','textarea'], ['postcode','Postcode','text'], ['telephone','Telephone','text'], ['email','Email','email'],
    ['contactForename','Contact forename','text'], ['contactSurname','Contact surname','text'], ['pdfPassword','PDF password','password'], ['userReference','User reference','text'],
    ['payeStarted','Date PAYE scheme started','date'], ['payeCeased','Date PAYE scheme ceased','date'], ['logoStatus','Logo / branding','text'],
    ['rtiBatch','RTI batch processing','checkbox'], ['uniqueWorksNumber','Enforce unique works number / payroll ID','checkbox'], ['warnMinimumWage','Warn below National Minimum Wage','checkbox'], ['showAgeOnHourly','Show age on hourly tab','checkbox']
  ],
  taxOffice: [
    ['payeReferenceDistrict','PAYE reference district','text'], ['payeReferenceSuffix','PAYE reference suffix','text'], ['accountsOfficeReference','Accounts office reference','text'], ['paymentMethod','Payment method','select:Cheque,BACS,Direct Debit,Faster Payment'],
    ['uniqueTaxReference','Unique Tax Ref. / UTR','text'], ['corporationTaxReference','Corporation Tax Ref.','text'], ['payrollGivingReference','Payroll Giving Ref.','text'], ['childSupportReference','Child Support Ref.','text'],
    ['payeDistrict','PAYE district','text'], ['taxOfficeAddress','Tax office address','textarea'], ['taxOfficePostcode','Tax office postcode','text'], ['taxOfficeTelephone','Tax office telephone','text'],
    ['serThisYear','SER qualified this year','checkbox'], ['serLastYear','SER qualified last year','checkbox'], ['noRtiDueWarnings','No RTI due warnings','checkbox'], ['claimNicAllowance','Claim Employment Allowance','checkbox'],
    ['apprenticeshipLevyAllowance','Apprenticeship levy allowance','number'], ['forceYearEndAmendmentEps','Force employees on Year End Amendment EPS','checkbox']
  ],
  bank: [
    ['accountName','Account name','text'], ['accountNumber','Account number','text'], ['sortCode','Sort code','text'], ['bankName','Bank name','text'], ['paymentReference','Payment reference','text'],
    ['bankAddress','Bank address','textarea'], ['bankPostcode','Bank postcode','text'], ['bankTelephone','Bank telephone','text'], ['paymentLeadDays','Payment lead days','number'], ['includeBankInRti','Include bank details in RTI returns','checkbox']
  ],
  terms: [
    ['hoursPerWeek','Hours worked per week','number'], ['paidOvertime','Paid overtime','checkbox'], ['weeksNoticeRequired','Weeks notice required','number'], ['daysSicknessFullPay','Days sickness on full pay','number'],
    ['maleRetirementAge','Male retirement age','number'], ['femaleRetirementAge','Female retirement age','number'], ['mayJoinPension','May join pension scheme','checkbox'], ['holidayDays','Days holiday per year','number'], ['maxCarryOverDays','Max days to carry over','number']
  ],
  class1a: [
    ['benefitsSubjectToClass1a','Benefits subject to Class 1A NIC','number'], ['class1aAdjustmentNote','Class 1A NIC adjustment note','textarea'], ['p11dSubmissionRequired','P11D submission required','checkbox'],
    ['pbikSummaryRequired','PBIK summary required','checkbox'], ['p11dBDue','Employer declaration P11D(b) due','checkbox']
  ],
  pensions: [
    ['stagingDate','Staging / duties start date','date'], ['reEnrolmentDate','Re-enrolment date','date'], ['deferUntil','Defer / postpone until','date'],
    ['pensionProvider','Pension provider','select:NEST,NOW,The People Pension,Smart PAPDIS,Aegon,Aviva,Legal and General,Royal London,Standard Life,True Potential,Workers Pension Trust'],
    ['pensionUsername','Online filing username','text'], ['pensionPassword','Online filing password','password'], ['samePensionCredentials','Use same credentials in all data files','checkbox'],
    ['reportTaxMonthly','Report frequency as Tax Monthly','checkbox'], ['reportTaxWeekly','Report frequency as Tax Weekly','checkbox'], ['askPaymentDueDate','Ask for payment due date','checkbox'],
    ['monthlyEarningsPeriod','Monthly earnings period day','number'], ['weeklyEarningsAdjustment','Weekly/2-weekly/4-weekly earnings period adjustment','number']
  ]
};

const payDetailTabs = {
  basic: [
    ['monthlySalary','Monthly salary','number'], ['periodGross','Period gross','number'], ['taxCode','Tax code','text'], ['niLetter','NI letter','text'], ['taxBasis','Tax basis','select:Cumulative,Week 1 / Month 1'],
    ['employeeNic','Employee NIC','number'], ['employerNic','Employer NIC','number'], ['netPay','Net pay','number'], ['ytdGross','YTD gross','number'], ['ytdTax','YTD tax','number'], ['ytdEmployeeNic','YTD employee NIC','number'], ['ytdNetPay','YTD net pay','number']
  ],
  hourly: [
    ['rate1','Rate 1','number'], ['hours1','Hours 1','number'], ['rate2','Rate 2','number'], ['hours2','Hours 2','number'], ['rate3','Rate 3','number'], ['hours3','Hours 3','number'],
    ['overtimeRate','Overtime rate','number'], ['overtimeHours','Overtime hours','number'], ['holidayHours','Holiday hours','number'], ['hourlyTotal','Auto hourly total','number']
  ],
  additions: [
    ['bonus','Bonus','number'], ['commission','Commission','number'], ['taxableExpenses','Taxable expenses','number'], ['nonTaxableExpenses','Non-taxable expenses','number'], ['customAddition1','Custom addition 1','number'], ['customAddition2','Custom addition 2','number']
  ],
  deductions: [
    ['attachmentOfEarnings','Attachment of earnings','number'], ['loanRepayment','Loan repayment','number'], ['payrollGiving','Payroll giving','number'], ['employeePensionDeduction','Pension deduction','number'], ['customDeduction1','Custom deduction 1','number'], ['customDeduction2','Custom deduction 2','number']
  ],
  pensions: [
    ['employeePensionPercent','Employee pension percent','number'], ['employerPensionPercent','Employer pension percent','number'], ['employeePensionFixed','Employee pension fixed','number'], ['employerPensionFixed','Employer pension fixed','number'], ['qualifyingEarnings','Qualifying earnings','number'], ['assessmentStatus','Assessment status','text']
  ],
  attachments: [
    ['attachmentOrderType','Attachment order type','select:None,AEO,CSA,DEA,Council Tax'], ['protectedEarnings','Protected earnings','number'], ['carriedForward','Carried forward','number'], ['adminFee','Admin fee','number']
  ],
  statutory: [
    ['sspDays','SSP days','number'], ['sspAmount','SSP amount','number'], ['smpAmount','SMP amount','number'], ['sppAmount','SPP amount','number'], ['sapAmount','SAP amount','number'], ['shppAmount','ShPP amount','number'], ['recoveryAmount','Recovery amount','number'], ['fundingAmount','Funding amount','number']
  ],
  holiday: [
    ['holidayDaysTaken','Holiday days taken','number'], ['holidayPay','Holiday pay','number'], ['holidayAccrued','Holiday accrued','number'], ['holidayCarriedForward','Holiday carried forward','number']
  ],
  adjustments: [
    ['payeAdjustment','PAYE adjustment','number'], ['employeeNicAdjustment','Employee NIC adjustment','number'], ['employerNicAdjustment','Employer NIC adjustment','number'], ['pensionAdjustment','Pension adjustment','number'], ['netToGrossAdjustment','Manual net-to-gross adjustment','number']
  ],
  rounding: [
    ['roundingAdjustment','Rounding adjustment','number'], ['roundNetPay','Round net pay','checkbox'], ['roundingAccount','Rounding account','text']
  ],
  loans: [
    ['studentLoanPlan','Student loan plan','select:None,Plan 1,Plan 2,Plan 4,Postgraduate'], ['studentLoanDeduction','Student loan deduction','number'], ['postgraduateLoanDeduction','Postgraduate loan deduction','number'], ['seasonTicketLoan','Season ticket loan','number']
  ],
  notes: [
    ['payrollNote','Payroll note','textarea'], ['employeeNote','Employee note','textarea'], ['auditNote','Audit note','textarea']
  ],
  taxNic: [
    ['taxFreeAllowance','Tax-free allowance','number'], ['taxablePay','Taxable pay','number'], ['taxDue','Tax due','number'], ['primaryThreshold','NI primary threshold','number'], ['secondaryThreshold','NI secondary threshold','number'],
    ['employeeNicCalculated','Employee NIC calculated','number'], ['employerNicCalculated','Employer NIC calculated','number'], ['monthOneBasis','Month 1 / Week 1 basis','checkbox']
  ]
};

const reportActions = [
  'Pay Details','Employer RTI schedule','Employee payslip','Employer summary current period','Employer summary tax period','Employer payslip P30','Pension monthly summary','Year-to-date figures','Tax & NIC actually paid','Print and post','Employer notes','P11 deductions worksheet','P60 end of year','Employer end-of-year summary','P11D expenses and benefits','P11D(b)','P45 leaving statement','Blank new employee form','Employee pay totals','Period totals','Department analysis','Pension contributions','Accounts reconciliation','Annual and average pay','Pay count report','National minimum wage check','Statutory pay recovery','HMRC funding report','Employer NIC allowance','Apprenticeship levy','Class 1A NIC summary','Data validation','RTI validation','PDF password check','Tax & NIC rates','Pay elements report'
].map((name, index) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, status: index % 5 === 0 ? 'ready' : 'working_screen', gated: /RTI|HMRC/.test(name) }));

const employers = [{
  id:'emp_klop', name:'KLOP PROPERTIES LTD', taxYear:'2025-26', frequency:'Monthly', currentPeriod:'Mar-2026', periodStatus:'draft',
  setup:{ name:'KLOP PROPERTIES LTD', address:'7 BELL YARD\nLONDON', postcode:'WC2A 2JR', telephone:'', email:'payroll@klop.example', contactForename:'Payroll', contactSurname:'Manager', pdfPassword:'', userReference:'KLOP-25', payeStarted:'2025-04-06', payeCeased:'', logoStatus:'Not uploaded', rtiBatch:false, uniqueWorksNumber:true, warnMinimumWage:true, showAgeOnHourly:false, payeReferenceDistrict:'120', payeReferenceSuffix:'ZE91426', accountsOfficeReference:'120PD03413011', paymentMethod:'BACS', uniqueTaxReference:'', corporationTaxReference:'', payrollGivingReference:'', serThisYear:true, serLastYear:true, noRtiDueWarnings:false, claimNicAllowance:true, childSupportReference:'', payeDistrict:'', taxOfficeAddress:'', taxOfficePostcode:'', taxOfficeTelephone:'', apprenticeshipLevyAllowance:15000, forceYearEndAmendmentEps:false, accountName:'KLOP PROPERTIES LTD', accountNumber:'00000000', sortCode:'00-00-00', bankName:'Demo Bank', paymentReference:'PAYROLL', bankAddress:'', bankPostcode:'', bankTelephone:'', paymentLeadDays:3, includeBankInRti:false, hoursPerWeek:35, paidOvertime:true, weeksNoticeRequired:4, daysSicknessFullPay:30, maleRetirementAge:65, femaleRetirementAge:65, mayJoinPension:true, holidayDays:28, maxCarryOverDays:5, benefitsSubjectToClass1a:0, class1aAdjustmentNote:'', p11dSubmissionRequired:true, pbikSummaryRequired:false, p11dBDue:true, stagingDate:'2025-04-06', reEnrolmentDate:'2028-04-06', deferUntil:'', pensionProvider:'NEST', pensionUsername:'', pensionPassword:'', samePensionCredentials:false, reportTaxMonthly:false, reportTaxWeekly:false, askPaymentDueDate:false, monthlyEarningsPeriod:31, weeklyEarningsAdjustment:0 }
}];

const employees = [
  { id:'ee_shaan', employerId:'emp_klop', payrollId:'001', firstName:'MOHAMMAD SHAAN', lastName:'IQBAL', taxCode:'1257L', niNumber:'QQ123456C', niLetter:'A', dateOfBirth:'1992-02-14', address:'7 Bell Yard, London', bankAccountName:'M S IQBAL', bankSortCode:'00-00-00', bankAccountNumber:'00000000', department:'Property Management', startDate:'2025-04-01', leavingDate:'', starterStatement:'A', p45PreviousPay:0, p45PreviousTax:0, studentLoanPlan:'None', postgraduateLoan:false, director:false, irregularPayment:false, pensionScheme:'NEST', pensionStatus:'Eligible jobholder', email:'shaan@example.com' },
  { id:'ee_maya', employerId:'emp_klop', payrollId:'002', firstName:'MAYA', lastName:'KHAN', taxCode:'1257L', niNumber:'QQ112233A', niLetter:'A', dateOfBirth:'1988-06-03', address:'1 Payroll Street, London', bankAccountName:'M KHAN', bankSortCode:'00-00-00', bankAccountNumber:'11111111', department:'Client Payroll', startDate:'2026-05-01', leavingDate:'', starterStatement:'B', p45PreviousPay:12000, p45PreviousTax:1300, studentLoanPlan:'Plan 2', postgraduateLoan:false, director:false, irregularPayment:false, pensionScheme:'NEST', pensionStatus:'Eligible jobholder', email:'maya.khan@example.com' }
];

const payRuns = {
  ee_shaan:{ employeeId:'ee_shaan', period:'Mar-2026', monthlySalary:1047.50, periodGross:1047.50, taxCode:'1257L', niLetter:'A', taxBasis:'Week 1 / Month 1', employeeNic:0, employerNic:39.95, netPay:995.12, ytdGross:12570, ytdTax:0, ytdEmployeeNic:0, ytdNetPay:11941.44, rate1:0, hours1:0, rate2:0, hours2:0, rate3:0, hours3:0, overtimeRate:0, overtimeHours:0, holidayHours:0, hourlyTotal:0, bonus:0, commission:0, taxableExpenses:0, nonTaxableExpenses:0, customAddition1:0, customAddition2:0, attachmentOfEarnings:0, loanRepayment:0, payrollGiving:0, employeePensionDeduction:52.38, customDeduction1:0, customDeduction2:0, employeePensionPercent:5, employerPensionPercent:3, employeePensionFixed:0, employerPensionFixed:0, qualifyingEarnings:1047.50, assessmentStatus:'Eligible jobholder', attachmentOrderType:'None', protectedEarnings:0, carriedForward:0, adminFee:0, sspDays:0, sspAmount:0, smpAmount:0, sppAmount:0, sapAmount:0, shppAmount:0, recoveryAmount:0, fundingAmount:0, holidayDaysTaken:0, holidayPay:0, holidayAccrued:2.33, holidayCarriedForward:0, payeAdjustment:0, employeeNicAdjustment:0, employerNicAdjustment:0, pensionAdjustment:0, netToGrossAdjustment:0, roundingAdjustment:0, roundNetPay:false, roundingAccount:'', studentLoanPlan:'None', studentLoanDeduction:0, postgraduateLoanDeduction:0, seasonTicketLoan:0, payrollNote:'', employeeNote:'', auditNote:'', taxFreeAllowance:1048.26, taxablePay:0, taxDue:0, primaryThreshold:1048, secondaryThreshold:758, employeeNicCalculated:0, employerNicCalculated:39.95, monthOneBasis:true },
  ee_maya:{ employeeId:'ee_maya', period:'Mar-2026', monthlySalary:3250, periodGross:3608.75, taxCode:'1257L', niLetter:'A', taxBasis:'Cumulative', employeeNic:204.86, employerNic:393.90, netPay:2696.70, ytdGross:42525, ytdTax:5989.20, ytdEmployeeNic:2407.92, ytdNetPay:31701.60, rate1:25, hours1:0, rate2:37.5, hours2:2, rate3:50, hours3:0, overtimeRate:37.5, overtimeHours:2, holidayHours:0, hourlyTotal:75, bonus:100, commission:0, taxableExpenses:35, nonTaxableExpenses:0, customAddition1:0, customAddition2:0, attachmentOfEarnings:25, loanRepayment:0, payrollGiving:0, employeePensionDeduction:180.44, customDeduction1:0, customDeduction2:0, employeePensionPercent:5, employerPensionPercent:3, employeePensionFixed:0, employerPensionFixed:0, qualifyingEarnings:3608.75, assessmentStatus:'Eligible jobholder', attachmentOrderType:'AEO', protectedEarnings:0, carriedForward:0, adminFee:1, sspDays:1, sspAmount:118.75, smpAmount:0, sppAmount:0, sapAmount:0, shppAmount:0, recoveryAmount:0, fundingAmount:0, holidayDaysTaken:1, holidayPay:0, holidayAccrued:2.33, holidayCarriedForward:0, payeAdjustment:0, employeeNicAdjustment:1, employerNicAdjustment:2, pensionAdjustment:0, netToGrossAdjustment:0, roundingAdjustment:0, roundNetPay:false, roundingAccount:'', studentLoanPlan:'Plan 2', studentLoanDeduction:0, postgraduateLoanDeduction:0, seasonTicketLoan:0, payrollNote:'Demo senior payroll record', employeeNote:'', auditNote:'', taxFreeAllowance:1048.26, taxablePay:2560.49, taxDue:512.10, primaryThreshold:1048, secondaryThreshold:758, employeeNicCalculated:204.86, employerNicCalculated:393.90, monthOneBasis:false }
};

const periods = ['Apr-2025','May-2025','Jun-2025','Jul-2025','Aug-2025','Sep-2025','Oct-2025','Nov-2025','Dec-2025','Jan-2026','Feb-2026','Mar-2026'].map((name, idx) => ({ name, number:idx+1, status:idx < 11 ? 'locked' : 'draft', payDate:idx === 11 ? '2026-04-01' : `${idx < 9 ? '2025' : '2026'}-${String(idx < 9 ? idx + 4 : idx - 8).padStart(2, '0')}-28` }));
const pensionProviders = ['NEST','NOW','The People Pension','Smart PAPDIS','Aegon','Aviva','Legal and General','Royal London','Standard Life','True Potential','Workers Pension Trust'];
const payslipTemplates = ['standard','detailed-accountant','compact','white-label','modern-branded'].map(id => ({ id, name:id.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join(' ') }));
const auditLog = [];

function calculatePay(employeeId) {
  const p = payRuns[employeeId];
  if (!p) return null;
  const gross = round(Number(p.monthlySalary) + Number(p.rate1)*Number(p.hours1) + Number(p.rate2)*Number(p.hours2) + Number(p.rate3)*Number(p.hours3) + Number(p.bonus) + Number(p.commission) + Number(p.taxableExpenses) + Number(p.sspAmount) + Number(p.smpAmount) + Number(p.sppAmount) + Number(p.sapAmount) + Number(p.shppAmount) + Number(p.netToGrossAdjustment));
  const taxable = Math.max(0, round(gross - Number(p.taxFreeAllowance)));
  const tax = round(taxable * 0.2 + Number(p.payeAdjustment));
  const employeeNic = round(Math.max(0, gross - Number(p.primaryThreshold)) * 0.08 + Number(p.employeeNicAdjustment));
  const employerNic = round(Math.max(0, gross - Number(p.secondaryThreshold)) * 0.138 + Number(p.employerNicAdjustment));
  const pension = round(Number(p.employeePensionFixed) + gross * Number(p.employeePensionPercent) / 100 + Number(p.pensionAdjustment));
  const deductions = round(pension + Number(p.attachmentOfEarnings) + Number(p.loanRepayment) + Number(p.payrollGiving) + Number(p.customDeduction1) + Number(p.customDeduction2) + Number(p.studentLoanDeduction) + Number(p.postgraduateLoanDeduction) + Number(p.seasonTicketLoan));
  const netPay = round(gross - tax - employeeNic - deductions + Number(p.nonTaxableExpenses) + Number(p.roundingAdjustment));
  Object.assign(p, { periodGross:gross, taxablePay:taxable, taxDue:tax, employeeNic, employerNic, employeePensionDeduction:pension, qualifyingEarnings:gross, hourlyTotal:round(Number(p.rate1)*Number(p.hours1)+Number(p.rate2)*Number(p.hours2)+Number(p.rate3)*Number(p.hours3)), netPay, employeeNicCalculated:employeeNic, employerNicCalculated:employerNic });
  return payslipFor(employeeId, 'detailed-accountant');
}

function payslipFor(employeeId, template = 'standard') {
  const employee = employees.find((e) => e.id === employeeId);
  const p = payRuns[employeeId];
  const employer = employers.find((e) => e.id === employee?.employerId);
  if (!employee || !p || !employer) return null;
  const earnings = [
    ['Basic Pay', p.monthlySalary], ['Hourly pay', p.hourlyTotal], ['Bonus', p.bonus], ['Commission', p.commission], ['Taxable expenses', p.taxableExpenses], ['SSP', p.sspAmount], ['SMP', p.smpAmount], ['SPP/SAP/ShPP', Number(p.sppAmount)+Number(p.sapAmount)+Number(p.shppAmount)]
  ].filter((x) => Number(x[1]));
  const deductions = [
    ['PAYE tax', p.taxDue], ['Employee NIC', p.employeeNic], ['Pension', p.employeePensionDeduction], ['Attachment of earnings', p.attachmentOfEarnings], ['Loan repayment', p.loanRepayment], ['Payroll giving', p.payrollGiving], ['Student/Postgrad loan', Number(p.studentLoanDeduction)+Number(p.postgraduateLoanDeduction)]
  ].filter((x) => Number(x[1]));
  return { template, employer, employee, period:p.period, payDate:periods.find((x) => x.name === p.period)?.payDate || '', taxCode:p.taxCode, niLetter:p.niLetter, niNumber:employee.niNumber, earnings, deductions, employerCosts:[['Employer NIC', p.employerNic], ['Employer pension', round(p.periodGross * Number(p.employerPensionPercent) / 100)]], totals:{ gross:p.periodGross, taxable:p.taxablePay, net:p.netPay, deductions:round(deductions.reduce((s, x) => s + Number(x[1]), 0)) }, ytd:{ gross:p.ytdGross, tax:p.ytdTax, employeeNic:p.ytdEmployeeNic, net:p.ytdNetPay } };
}

function p32Summary() {
  const slips = employees.map((e) => calculatePay(e.id));
  const totals = slips.reduce((a, s) => ({ paye:round(a.paye + Number(s?.deductions.find((x) => x[0] === 'PAYE tax')?.[1] || 0)), employeeNic:round(a.employeeNic + Number(s?.deductions.find((x) => x[0] === 'Employee NIC')?.[1] || 0)), employerNic:round(a.employerNic + Number(s?.employerCosts[0]?.[1] || 0)), pensions:round(a.pensions + Number(s?.deductions.find((x) => x[0] === 'Pension')?.[1] || 0)) }), { paye:0, employeeNic:0, employerNic:0, pensions:0 });
  return { period:'Mar-2026', totals, grossDueToHmrc:round(totals.paye + totals.employeeNic + totals.employerNic), status:'draft_not_submitted' };
}

function bootstrap() {
  return { employers, employerSetupTabs, employees, employeeFields:['employee details','starter form','P45 starter values','bank/BACS','tax code','NI number/category','department','student loan','director flag','irregular payment','pension settings'], payDetailTabs, payRuns, periods, reportActions, pensionProviders, payslipTemplates, p32:p32Summary(), rti:{ status:'gated', liveFilingEnabled:false, blockers:['HMRC credentials not configured','HMRC RTI product certification not configured'], notice:'No live HMRC RTI filing is enabled or claimed.' }, auditLog };
}

function workspaceHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Payroll</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);overflow:hidden}.app{height:100vh;display:grid;grid-template-rows:56px 1fr}.top{display:grid;grid-template-columns:1.2fr .7fr .7fr .8fr auto auto auto auto;gap:8px;align-items:center;padding:8px 12px;background:white;border-bottom:1px solid var(--l)}select,input,textarea{border:1px solid var(--l);border-radius:6px;min-height:34px;padding:0 8px;font:inherit;font-size:13px;background:white}textarea{padding:8px;min-height:70px}.btn{border:1px solid var(--l);background:white;border-radius:6px;min-height:34px;padding:0 10px;font-weight:800;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.body{min-height:0;display:grid;grid-template-columns:220px 1fr 320px}.rail,.main,.side{min-height:0;overflow:auto;border-right:1px solid var(--l);background:white}.rail{padding:10px}.main{background:var(--bg);display:grid;grid-template-rows:44px 1fr}.side{padding:10px;border-right:0;border-left:1px solid var(--l)}.tabs{display:flex;gap:6px;align-items:center;overflow:auto;padding:6px 10px;background:white;border-bottom:1px solid var(--l)}.tab{border:1px solid var(--l);background:white;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer}.tab.active{background:var(--p);color:white;border-color:var(--p)}.panel{margin:10px;background:white;border:1px solid var(--l);border-radius:8px;padding:12px}.grid{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:10px}.setup-grid{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:10px}.card{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:10px;margin-bottom:8px;cursor:pointer}.card.active{border-color:var(--p);box-shadow:inset 4px 0 0 var(--p)}.card strong,.card span,.card small{display:block}.card span,.muted{color:var(--m);font-size:12px}.split{display:grid;grid-template-columns:1fr 1fr;gap:10px}h2,h3{margin:0 0 10px}.pill{border-radius:999px;background:#e8f4ee;color:#3f7358;padding:4px 8px;font-size:12px;font-weight:900}.summary{display:flex;justify-content:space-between;border-bottom:1px solid var(--l);padding:7px 0}.reports{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.report{border:1px solid var(--l);border-radius:6px;padding:9px;background:#fbfdfc;font-size:12px;cursor:pointer}.report.ready{border-color:var(--p)}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--l);padding:8px;font-size:12px}.money{text-align:right}.payslip{border:1px solid var(--l);background:white;border-radius:8px;padding:12px;margin-bottom:10px}.payslip.detailed-accountant{box-shadow:inset 0 5px 0 var(--p)}.payslip.compact{font-size:12px}.payslip.white-label{border-color:#111}.payslip.modern-branded{background:linear-gradient(180deg,#fff,#f6fbf8)}@media(max-width:1200px){body{overflow:auto}.app{height:auto}.body,.top,.grid,.setup-grid,.reports{grid-template-columns:1fr}.main{display:block}}</style></head><body><div class="app"><div class="top"><select id="employer"></select><select id="taxYear"></select><select id="frequency"></select><select id="period"></select><button class="btn p" id="save">Save</button><button class="btn" id="calc">Calculate</button><button class="btn" id="preview">Preview payslip</button><button class="btn" id="lock">Lock period</button></div><div class="body"><div class="rail"><h3>Employees</h3><div id="employees"></div><h3>Actions</h3><div id="quickReports"></div></div><div class="main"><div class="tabs" id="primaryTabs"></div><div id="content"></div></div><div class="side"><h3>Payslip</h3><select id="template"></select><div id="payslip"></div><h3>P32</h3><div id="p32"></div><h3>Compliance</h3><div id="rti"></div></div></div></div><script>
let S={}, activeEmployee='', primary='Pay Details', secondary='basic';
const $=id=>document.getElementById(id), money=n=>'GBP '+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(path, options={}){const r=await fetch(path,{headers:{'content-type':'application/json'},...options});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}
function field(f, source){const [key,label,type]=f;const val=source[key]??'';if(type==='textarea')return '<label>'+label+'<textarea data-key="'+key+'">'+val+'</textarea></label>';if(type==='checkbox')return '<label><input data-key="'+key+'" type="checkbox" '+(val?'checked':'')+'> '+label+'</label>';if(type&&type.startsWith('select:'))return '<label>'+label+'<select data-key="'+key+'">'+type.slice(7).split(',').map(x=>'<option '+(x===val?'selected':'')+'>'+x+'</option>').join('')+'</select></label>';return '<label>'+label+'<input data-key="'+key+'" type="'+(type||'text')+'" value="'+val+'"></label>'}
function currentEmp(){return S.employers.find(e=>e.id===employer.value)||S.employers[0]}function currentRun(){return S.payRuns[activeEmployee]}function currentEmployee(){return S.employees.find(e=>e.id===activeEmployee)||S.employees[0]}
function renderShell(){employer.innerHTML=S.employers.map(e=>'<option value="'+e.id+'">'+e.name+'</option>').join('');taxYear.innerHTML=['2025-26','2026-27'].map(x=>'<option>'+x+'</option>').join('');frequency.innerHTML=['Monthly','Weekly','Fortnightly','Four-weekly'].map(x=>'<option>'+x+'</option>').join('');period.innerHTML=S.periods.map(p=>'<option>'+p.name+' - '+p.status+'</option>').join('');template.innerHTML=S.payslipTemplates.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('');activeEmployee=S.employees[0].id;primaryTabs.innerHTML=['Employer Setup','Employee Records','Pay Details','Reports','Pensions','Payslips'].map(t=>'<button class="tab '+(t===primary?'active':'')+'" data-primary="'+t+'">'+t+'</button>').join('');renderEmployees();renderMain();renderSide()}
function renderEmployees(){employees.innerHTML=S.employees.map(e=>'<div class="card '+(e.id===activeEmployee?'active':'')+'" data-ee="'+e.id+'"><strong>'+e.firstName+' '+e.lastName+'</strong><span>'+e.payrollId+' | '+e.taxCode+' | NI '+e.niLetter+'</span><small>'+e.department+'</small></div>').join('');quickReports.innerHTML=S.reportActions.slice(0,8).map(r=>'<div class="report '+r.status+'" data-report="'+r.id+'">'+r.name+'</div>').join('')}
function renderMain(){primaryTabs.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.primary===primary));if(primary==='Employer Setup')renderEmployerSetup();if(primary==='Employee Records')renderEmployeeRecords();if(primary==='Pay Details')renderPayDetails();if(primary==='Reports')renderReports();if(primary==='Pensions')renderPensions();if(primary==='Payslips')renderPayslips()}
function renderSubTabs(names){return '<div class="tabs">'+names.map(n=>'<button class="tab '+(n===secondary?'active':'')+'" data-secondary="'+n+'">'+n+'</button>').join('')+'</div>'}
function renderEmployerSetup(){const tabs=Object.keys(S.employerSetupTabs);if(!tabs.includes(secondary))secondary='employer';content.innerHTML=renderSubTabs(tabs)+'<div class="panel"><h2>Employer setup</h2><div class="setup-grid">'+S.employerSetupTabs[secondary].map(f=>field(f,currentEmp().setup)).join('')+'</div></div>'}
function renderEmployeeRecords(){const e=currentEmployee();content.innerHTML='<div class="panel"><h2>Employee records</h2><div class="setup-grid">'+['payrollId','firstName','lastName','taxCode','niNumber','niLetter','dateOfBirth','address','bankAccountName','bankSortCode','bankAccountNumber','department','startDate','leavingDate','starterStatement','p45PreviousPay','p45PreviousTax','studentLoanPlan','postgraduateLoan','director','irregularPayment','pensionScheme','pensionStatus','email'].map(k=>field([k,k.replace(/([A-Z])/g,' $1'),typeof e[k]==='boolean'?'checkbox':typeof e[k]==='number'?'number':'text'],e)).join('')+'</div></div>'}
function renderPayDetails(){const tabs=Object.keys(S.payDetailTabs);if(!tabs.includes(secondary))secondary='basic';content.innerHTML=renderSubTabs(tabs)+'<div class="panel"><h2>'+secondary+'</h2><div class="grid">'+S.payDetailTabs[secondary].map(f=>field(f,currentRun())).join('')+'</div></div><div class="panel"><h2>Tax and NIC calculation</h2>'+taxTable()+'</div>'}
function taxTable(){const p=currentRun();return '<table><tr><th>Line</th><th class="money">Amount</th><th>Ref</th></tr>'+[['Basic pay',p.monthlySalary,'a'],['Hourly total',p.hourlyTotal,'b'],['Taxable pay',p.taxablePay,'c'],['Tax free allowance',p.taxFreeAllowance,'d'],['Tax due',p.taxDue,'e'],['Employee NIC',p.employeeNic,'f'],['Employer NIC',p.employerNic,'g'],['Net pay',p.netPay,'h']].map(x=>'<tr><td>'+x[0]+'</td><td class="money">'+money(x[1])+'</td><td>'+x[2]+'</td></tr>').join('')+'</table>'}
function renderReports(){content.innerHTML='<div class="panel"><h2>Payroll reports and forms</h2><div class="reports">'+S.reportActions.map(r=>'<div class="report '+r.status+'" data-report="'+r.id+'"><strong>'+r.name+'</strong><br><span class="muted">'+(r.gated?'Gated/compliance checked':'Working screen')+'</span></div>').join('')+'</div></div>'}
function renderPensions(){content.innerHTML='<div class="panel"><h2>Pensions</h2><div class="reports">'+S.pensionProviders.map(p=>'<div class="report"><strong>'+p+'</strong><br><span class="muted">Scheme details, assessment, validation and upload file setup guide</span></div>').join('')+'</div></div>'}
function renderPayslips(){content.innerHTML='<div class="panel"><h2>Payslip designs</h2><div class="reports">'+S.payslipTemplates.map(t=>'<div class="report"><strong>'+t.name+'</strong><br><span class="muted">Employer, employee, tax, NI, earnings, deductions, pensions, net pay, YTD</span></div>').join('')+'</div></div>'}
function renderSide(){api('/api/payroll/commercial/payslip/'+activeEmployee+'?template='+template.value).then(s=>{payslip.innerHTML='<div class="payslip '+s.template+'"><strong>'+s.employer.name+'</strong><br><span class="muted">'+s.employee.firstName+' '+s.employee.lastName+' | '+s.period+' | '+s.payDate+'</span><table><tr><th>Earnings</th><th class="money">Amount</th></tr>'+s.earnings.map(x=>'<tr><td>'+x[0]+'</td><td class="money">'+money(x[1])+'</td></tr>').join('')+'<tr><th>Deductions</th><th></th></tr>'+s.deductions.map(x=>'<tr><td>'+x[0]+'</td><td class="money">'+money(x[1])+'</td></tr>').join('')+'</table>'+['gross','taxable','deductions','net'].map(k=>'<div class="summary"><span>'+k+'</span><strong>'+money(s.totals[k])+'</strong></div>').join('')+'</div>'});p32.innerHTML=['paye','employeeNic','employerNic','grossDueToHmrc'].map(k=>'<div class="summary"><span>'+k+'</span><strong>'+money(k==='grossDueToHmrc'?S.p32[k]:S.p32.totals[k])+'</strong></div>').join('');rti.innerHTML='<span class="pill">'+S.rti.status+'</span><p class="muted">'+S.rti.notice+'</p>'+S.rti.blockers.map(b=>'<div class="summary"><span>'+b+'</span><strong>Blocked</strong></div>').join('')}
function collectFields(target){document.querySelectorAll('[data-key]').forEach(el=>{const v=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;target[el.dataset.key]=v})}
primaryTabs.onclick=e=>{if(e.target.dataset.primary){primary=e.target.dataset.primary;secondary='';renderMain()}};content.onclick=e=>{if(e.target.dataset.secondary){secondary=e.target.dataset.secondary;renderMain()}if(e.target.dataset.report){api('/api/payroll/commercial/report',{method:'POST',body:JSON.stringify({reportId:e.target.dataset.report,employeeId:activeEmployee,employerId:employer.value})}).then(x=>alert(x.title+' - '+x.status))}};employees.onclick=e=>{const c=e.target.closest('[data-ee]');if(c){activeEmployee=c.dataset.ee;renderEmployees();renderMain();renderSide()}};template.onchange=renderSide;save.onclick=async()=>{if(primary==='Employer Setup'){collectFields(currentEmp().setup);await api('/api/payroll/commercial/employers/'+employer.value+'/setup',{method:'PUT',body:JSON.stringify(currentEmp().setup)})}else if(primary==='Employee Records'){collectFields(currentEmployee());await api('/api/payroll/commercial/employees/'+activeEmployee,{method:'PUT',body:JSON.stringify(currentEmployee())})}else{collectFields(currentRun());await api('/api/payroll/commercial/payruns/'+activeEmployee,{method:'PUT',body:JSON.stringify(currentRun())})}renderMain();renderSide()};calc.onclick=async()=>{await save.onclick();const x=await api('/api/payroll/commercial/calculate',{method:'POST',body:JSON.stringify({employeeId:activeEmployee})});S.payRuns[activeEmployee]=x.payRun;S.p32=x.p32;renderMain();renderSide()};preview.onclick=()=>{primary='Payslips';renderMain();renderSide()};lock.onclick=async()=>{const x=await api('/api/payroll/commercial/period/'+employer.value+'/lock',{method:'POST',body:JSON.stringify({period:period.value})});alert(x.status)};api('/api/payroll/commercial/bootstrap').then(d=>{S=d;renderShell()});
</script></body></html>`;
}

router.get('/payroll-workspace', (_req, res) => res.type('html').send(workspaceHtml()));
router.get('/api/payroll/commercial/bootstrap', (_req, res) => res.json(bootstrap()));
router.put('/api/payroll/commercial/employers/:id/setup', (req, res) => { const e = employers.find((x) => x.id === req.params.id); if (!e) return res.status(404).json({ error:'Employer not found' }); e.setup = { ...e.setup, ...req.body }; auditLog.unshift({ id:uid('audit'), action:'employer.setup.updated', at:new Date().toISOString() }); res.json(e); });
router.put('/api/payroll/commercial/employees/:id', (req, res) => { const e = employees.find((x) => x.id === req.params.id); if (!e) return res.status(404).json({ error:'Employee not found' }); Object.assign(e, req.body); auditLog.unshift({ id:uid('audit'), action:'employee.updated', employeeId:e.id, at:new Date().toISOString() }); res.json(e); });
router.put('/api/payroll/commercial/payruns/:employeeId', (req, res) => { if (!payRuns[req.params.employeeId]) return res.status(404).json({ error:'Pay run not found' }); Object.assign(payRuns[req.params.employeeId], req.body); auditLog.unshift({ id:uid('audit'), action:'payrun.updated', employeeId:req.params.employeeId, at:new Date().toISOString() }); res.json(payRuns[req.params.employeeId]); });
router.post('/api/payroll/commercial/calculate', (req, res) => { const slip = calculatePay(req.body.employeeId); if (!slip) return res.status(404).json({ error:'Employee pay run not found' }); res.json({ payslip:slip, payRun:payRuns[req.body.employeeId], p32:p32Summary(), status:'calculated_not_submitted' }); });
router.post('/api/payroll/commercial/period/:employerId/lock', (req, res) => { const period = periods.find((p) => req.body.period && req.body.period.startsWith(p.name)); if (period) period.status = 'locked'; auditLog.unshift({ id:uid('audit'), action:'period.locked', employerId:req.params.employerId, period:req.body.period, at:new Date().toISOString() }); res.json({ status:'locked', period:req.body.period, submission:'not_submitted' }); });
router.post('/api/payroll/commercial/report', (req, res) => { const r = reportActions.find((x) => x.id === req.body.reportId); if (!r) return res.status(404).json({ error:'Report not found' }); res.json({ id:r.id, title:r.name, status:r.gated ? 'gated_compliance_state' : 'ready', data:{ employerId:req.body.employerId, employeeId:req.body.employeeId, p32:p32Summary(), payslip:payslipFor(req.body.employeeId || employees[0].id, 'detailed-accountant') } }); });
router.get('/api/payroll/commercial/payslip/:employeeId', (req, res) => { const slip = payslipFor(req.params.employeeId, req.query.template || 'standard'); if (!slip) return res.status(404).json({ error:'Payslip not found' }); res.json(slip); });

module.exports = { payrollCommercialRouter: router };
