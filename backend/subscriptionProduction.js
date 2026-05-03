const express = require('express');

const router = express.Router();

const VAT_RATE = 0.2;
const plans = [
  {
    id: 'monthly',
    name: 'Monthly subscription',
    cadence: 'month',
    priceGbp: 49,
    stripePriceEnv: 'STRIPE_PRICE_MONTHLY',
    description: 'Flexible monthly access to NexoryRole Accounting OS.'
  },
  {
    id: 'annual',
    name: 'Annual subscription',
    cadence: 'year',
    priceGbp: 495,
    stripePriceEnv: 'STRIPE_PRICE_ANNUAL',
    description: 'Annual access with two months effectively discounted.'
  }
];

const subscriptions = [{
  id: 'sub_demo_practice',
  tenantId: 'practice_demo',
  planId: 'annual',
  status: 'trial_ready',
  seatsIncluded: 1,
  renewalDate: '2026-06-01',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  paymentProvider: 'stripe',
  complianceState: 'stripe_credentials_required'
}];

const money = (amount) => Math.round(Number(amount || 0) * 100) / 100;
const pence = (amount) => Math.round(Number(amount || 0) * 100);

function priced(plan) {
  const vatGbp = money(plan.priceGbp * VAT_RATE);
  return {
    ...plan,
    vatRate: VAT_RATE,
    vatGbp,
    totalGbp: money(plan.priceGbp + vatGbp),
    pricePence: pence(plan.priceGbp),
    vatPence: pence(vatGbp),
    totalPence: pence(plan.priceGbp + vatGbp),
    stripePriceIdConfigured: Boolean(process.env[plan.stripePriceEnv])
  };
}

function stripeReady() {
  return {
    secretKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    monthlyPriceConfigured: Boolean(process.env.STRIPE_PRICE_MONTHLY),
    annualPriceConfigured: Boolean(process.env.STRIPE_PRICE_ANNUAL),
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    successUrl: process.env.STRIPE_SUCCESS_URL || '/subscription-workspace?checkout=success',
    cancelUrl: process.env.STRIPE_CANCEL_URL || '/subscription-workspace?checkout=cancelled'
  };
}

async function createStripeCheckoutSession({ plan, mode, tenantId, email }) {
  const readiness = stripeReady();
  if (!readiness.secretKeyConfigured || !process.env[plan.stripePriceEnv]) {
    const missing = [];
    if (!readiness.secretKeyConfigured) missing.push('STRIPE_SECRET_KEY');
    if (!process.env[plan.stripePriceEnv]) missing.push(plan.stripePriceEnv);
    const error = new Error('Stripe checkout is gated until live Stripe credentials and Price IDs are configured.');
    error.status = 503;
    error.payload = { status:'stripe_credentials_required', missing, readiness };
    throw error;
  }

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', process.env[plan.stripePriceEnv]);
  params.set('line_items[0][quantity]', '1');
  params.set('automatic_tax[enabled]', 'true');
  params.set('client_reference_id', tenantId || 'practice_demo');
  params.set('metadata[tenantId]', tenantId || 'practice_demo');
  params.set('metadata[planId]', plan.id);
  params.set('metadata[action]', mode);
  params.set('success_url', readiness.successUrl);
  params.set('cancel_url', readiness.cancelUrl);
  if (email) params.set('customer_email', email);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error('Stripe rejected the checkout session request.');
    error.status = response.status;
    error.payload = body;
    throw error;
  }
  return body;
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoryRole Subscription</title><style>
:root{--p:#579a76;--d:#101815;--m:#66736c;--l:#dce6e0;--bg:#f5f8f6;--soft:#edf6f1;--warn:#9a6a1d}*{box-sizing:border-box}html,body{margin:0;max-width:100%;overflow-x:hidden}body{background:var(--bg);font-family:Inter,system-ui,Segoe UI,sans-serif;color:var(--d);text-rendering:optimizeLegibility}.app{min-height:100vh;padding:16px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:14px}.title strong{font-size:24px}.title span,.muted{display:block;color:var(--m);font-size:12px;line-height:1.4}.badge{border-radius:999px;background:#e8f4ee;color:#315f48;padding:7px 11px;font-weight:900;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:14px}.panel{background:white;border:1px solid var(--l);border-radius:8px;box-shadow:0 20px 55px #10181512;padding:18px}.plan{display:grid;gap:14px}.plan-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.price{font-size:42px;font-weight:950;letter-spacing:0;line-height:1}.price small{font-size:15px;color:var(--m);font-weight:900}.rows{display:grid;border:1px solid var(--l);border-radius:8px;overflow:hidden}.row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid var(--l);font-weight:800}.row:last-child{border-bottom:0;background:#fbfdfc}.row span{color:var(--m);font-weight:800}.actions{display:flex;gap:10px;flex-wrap:wrap}.btn{border:1px solid var(--l);border-radius:8px;min-height:42px;padding:0 14px;background:white;font:inherit;font-weight:950;cursor:pointer}.btn.p{background:var(--p);border-color:var(--p);color:white}.btn:disabled{opacity:.55;cursor:not-allowed}.status{display:grid;gap:10px}.status-card{border:1px solid var(--l);border-radius:8px;background:#fbfdfc;padding:13px}.status-card strong,.status-card span{display:block}.out{white-space:pre-wrap;background:#101815;color:#dbf4e7;border-radius:8px;padding:14px;min-height:180px;max-height:330px;overflow:auto;font-size:12px;line-height:1.55}.notice{border:1px solid #ead6ad;background:#fff8e8;color:#6d4d13;border-radius:8px;padding:12px;font-weight:800}.wide{grid-column:1/-1}@media(max-width:850px){.grid{grid-template-columns:1fr}.top{display:block}.price{font-size:34px}.app{padding:12px}}</style></head><body><div class="app"><div class="top"><div class="title"><strong>Subscription</strong><span>Fixed-price access for NexoryRole Accounting OS. Stripe handles signup and renewal payments.</span></div><span class="badge">GBP + UK VAT</span></div><div class="grid"><div id="plans" class="grid wide"></div><div class="panel status"><div class="plan-head"><div><h2 style="margin:0">Account status</h2><span class="muted">Current tenant billing state and Stripe readiness.</span></div><button class="btn" id="refresh">Refresh</button></div><div id="status"></div></div><div class="panel"><h2 style="margin-top:0">Stripe setup</h2><div class="notice">Live payment buttons remain gated until Stripe keys, monthly Price ID, annual Price ID and webhook secret are configured in Railway.</div><pre class="out" id="out"></pre></div></div></div><script>
const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});async function api(p,o={}){const r=await fetch(p,{headers:{'content-type':'application/json'},...o});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}if(!r.ok)throw d;return d}function planCard(p){return '<div class="panel plan"><div class="plan-head"><div><h2 style="margin:0">'+p.name+'</h2><span class="muted">'+p.description+'</span></div><span class="badge">'+p.cadence+'</span></div><div class="price">'+gbp(p.priceGbp)+' <small>+ VAT / '+p.cadence+'</small></div><div class="rows"><div class="row"><span>Subscription</span><strong>'+gbp(p.priceGbp)+'</strong></div><div class="row"><span>VAT at 20%</span><strong>'+gbp(p.vatGbp)+'</strong></div><div class="row"><span>Total charged</span><strong>'+gbp(p.totalGbp)+'</strong></div></div><div class="actions"><button class="btn p" data-action="signup" data-plan="'+p.id+'">Sign up</button><button class="btn" data-action="renew" data-plan="'+p.id+'">Renew</button></div><span class="muted">Stripe price: '+(p.stripePriceIdConfigured?'configured':'not configured yet')+'</span></div>'}function statusCard(k,v){return '<div class="status-card"><span class="muted">'+k+'</span><strong>'+v+'</strong></div>'}async function load(){const [plansData,statusData]=await Promise.all([api('/api/subscription/plans'),api('/api/subscription/status')]);plans.innerHTML=plansData.plans.map(planCard).join('');status.innerHTML=statusCard('Status',statusData.subscription.status)+statusCard('Plan',statusData.subscription.planId)+statusCard('Renewal date',statusData.subscription.renewalDate)+statusCard('Stripe',statusData.subscription.complianceState);out.textContent=JSON.stringify({readiness:plansData.stripeReadiness,subscription:statusData.subscription},null,2)}plans.onclick=async e=>{const b=e.target.closest('button[data-plan]');if(!b)return;b.disabled=true;try{const r=await api('/api/subscription/checkout',{method:'POST',body:JSON.stringify({planId:b.dataset.plan,action:b.dataset.action,email:'owner@example.com'})});out.textContent=JSON.stringify(r,null,2);if(r.url) location.href=r.url}catch(err){out.textContent=JSON.stringify(err,null,2)}finally{b.disabled=false}};refresh.onclick=load;load();
</script></body></html>`;
}

router.get('/subscription-workspace', (_req, res) => res.type('html').send(pageHtml()));
router.get('/api/subscription/plans', (_req, res) => res.json({ plans:plans.map(priced), stripeReadiness:stripeReady() }));
router.get('/api/subscription/status', (req, res) => {
  const tenantId = req.context?.tenantId || 'practice_demo';
  const subscription = subscriptions.find((s) => s.tenantId === tenantId) || subscriptions[0];
  res.json({ subscription, activePlan:priced(plans.find((p) => p.id === subscription.planId) || plans[0]) });
});
router.post('/api/subscription/checkout', async (req, res) => {
  const plan = plans.find((p) => p.id === req.body.planId);
  if (!plan) return res.status(400).json({ error:'Unknown subscription plan.', allowedPlans:plans.map((p) => p.id) });
  const action = ['signup', 'renew'].includes(req.body.action) ? req.body.action : 'signup';
  try {
    const session = await createStripeCheckoutSession({
      plan,
      mode: action,
      tenantId: req.context?.tenantId || 'practice_demo',
      email: req.body.email
    });
    res.json({ status:'stripe_checkout_created', action, plan:priced(plan), checkoutSessionId:session.id, url:session.url });
  } catch (error) {
    res.status(error.status || 500).json(error.payload || { error:error.message });
  }
});
router.post('/api/subscription/stripe/webhook', (_req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ status:'stripe_webhook_secret_required', requiredSecrets:['STRIPE_WEBHOOK_SECRET'] });
  }
  res.json({ status:'webhook_endpoint_ready_signature_validation_required' });
});

module.exports = { subscriptionProductionRouter: router };
