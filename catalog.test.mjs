import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,selectProducts,scopedReviews} from './logic.mjs';
const data=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));

test('complete catalog keeps unique products, required evidence and explicit unknowns',()=>{
 assert.deepEqual(validateCatalog(data),[]);
 const keys=new Set(),brands=new Set(data.brands.map(b=>b.id));
 for(const p of data.products){
  const key=[p.brandId,p.model.replace(/\s/g,''),p.size.width,p.size.length,p.size.height,!p.size.width||!p.size.length?p.size.category||'double':''].join('|');
  assert.ok(!keys.has(key),`duplicate model and size: ${p.id}`);keys.add(key);
  assert.ok((p.baseProductId?['checked','limited','pending']:['checked','limited']).includes(p.reviewSearch?.status),`review search incomplete: ${p.id}`);
  if(p.reviewSearch.status==='pending')assert.ok(p.baseProductId&&p.reviewSearch.note);else assert.ok(p.reviewSearch.queries.length,`missing review queries: ${p.id}`);
  assert.ok(p.offers.length,`missing seller: ${p.id}`);
  if(!p.size.width||!p.size.length)assert.ok(!selectProducts({...data,products:[p]}).length);
  for(const o of p.offers){
   for(const field of ['name','priceNote','deliveryNote','shippingNote','stairsNote','haulNote','downstairsNote','trialNote','sleepTrial','returns','warranty'])assert.equal(typeof o[field],'string',`${o.id} missing ${field}`);
   assert.ok(['yes','no','unknown'].includes(o.downstairs),`${o.id} invalid downstairs status`);
   if(o.channel==='store')assert.ok(o.address||o.trial!=='yes',`${o.id} confirmed store has no address`);
   if(o.haul!=='yes')assert.equal(o.haulFee??null,null,`${o.id} recycling fee without haul`);
  }
 }
 for(const a of data.audit)assert.ok(brands.has(a.brandId));
 for(const r of data.reviews){assert.ok(['positive','negative','mixed'].includes(r.kind),`${r.id} unsupported review kind`);assert.ok(['single','multiple','sponsored'].includes(r.evidence),`${r.id} unsupported evidence scope`);}
});

test('verified seller exceptions preserve stock, hauling and standalone-use limits',()=>{
 const get=id=>data.products.find(p=>p.id===id);
 const avis=get('g-yf-avis-4879714').offers[0];assert.equal(avis.haul,'no');assert.doesNotMatch(avis.haulNote,/800/);
 const idea=get('g-yf-idea-10671960');assert.equal(idea.offers[0].price,3580);assert.equal(idea.scopeStatus,'candidate');assert.equal(idea.offers[0].downstairs,'yes');assert.equal(idea.offers[0].haul,'no');assert.match(idea.offers[0].downstairsNote,/200/);
 assert.equal(get('g-yf-jennysilk-12060244').scopeStatus,'candidate');
 assert.equal(data.reviews.find(r=>r.id==='g-yf-avis-negative').evidence,'multiple');
 const miracle=get('i-simmons-miracle'),hola=get('ig-hola-p-014363999');
 assert.equal(miracle.size.height,28);assert.ok(miracle.offers.every(o=>o.price===null));
 assert.equal(hola.size.height,30);assert.equal(hola.offers[0].price,49800);
 const catherine=get('g-std-104');assert.equal(catherine.offers[0].price,55000);assert.equal(catherine.size.height,25);
 assert.ok(catherine.offers.filter(o=>o.channel==='store').every(o=>o.price===null&&o.trial==='unknown'&&o.delivery==='unknown'));
 assert.equal(catherine.offers.find(o=>o.id==='g-jalt-625-web').price,41250);
 const jalt=get('g-jalt-834').offers[0];assert.equal(jalt.haul,'no');assert.equal(jalt.downstairs,'unknown');assert.match(jalt.shippingNote,/待確認/);
 assert.match(get('g-jalt-112').offers.find(o=>o.id==='g-jalt-875-web').returns,/出清/);
 assert.equal(get('g-jalt-531').scopeStatus,'candidate');
 const memory10=get('lf-foodcom-p-memory10');assert.equal(memory10.scopeStatus,'candidate');
 assert.equal(selectProducts({...data,products:[memory10]}).length,0);
});

test('real exact-size prices cannot silently become single-size starting prices',()=>{
 const known=[['r-assari-387','',152,188,2277],['r-muji-','支撐型',142,196,15990],['r-3m-4612412','',150,186,5590],['r-3m-4612489','',150,186,4590],['r-house-655aefe5bd48bd0011c24904','',152,188,5988],['g-jalt-834','',152,188,4680],['g-jalt-619','',152,188,18888],['lf-foodcom-p-memory5','',152,188,1899]];
 for(const [prefix,model,width,length,price] of known){
  const p=data.products.find(p=>p.id.startsWith(prefix)&&p.model.includes(model));assert.ok(p,`${prefix} absent`);
  assert.equal(p.size.width,width);assert.equal(p.size.length,length);assert.equal(p.offers[0].price,price);
 }
});

test('real matching offers determine prices and unknown prices stay last',()=>{
 for(const filters of [{},{channel:'store'},{haul:'yes'},{trial:'yes'},{minPrice:20000,maxPrice:40000}]){
  for(const sort of ['price-asc','price-desc']){
   const rows=selectProducts(data,{...filters,sort});let unknown=false,last=null;
   for(const r of rows){
    assert.ok(r.offers.some(o=>o.id===r.bestOffer.id));
    const prices=r.offers.map(o=>o.price).filter(p=>p!==null);assert.equal(r.price,prices.length?Math.min(...prices):null);
    if(r.price===null){unknown=true;continue;}assert.ok(!unknown);
    if(last!==null)assert.ok(sort==='price-asc'?r.price>=last:r.price<=last);last=r.price;
   }
  }
 }
});

test('downstairs-only policies never match haul-away filters',()=>{
 for(const p of data.products.filter(p=>p.brandId==='r-ikea')){
  for(const o of p.offers){assert.equal(o.downstairs,'yes');assert.equal(o.haul,'no');}
 }
 assert.equal(selectProducts(data,{brand:'r-ikea',haul:'yes',status:'all'}).length,0);
 for(const p of data.products.filter(p=>p.brandId==='r-muji')){
  for(const o of p.offers)assert.equal(o.haul,o.channel==='online'?'no':'yes');
 }
 for(const p of data.products){for(const o of p.offers){const r=scopedReviews(data.reviews,p,o);assert.ok(r.model.every(r=>r.productIds.includes(p.id)));assert.ok(r.store.every(r=>r.offerIds.includes(o.id)||r.offerIds.includes(o.baseOfferId)));}}
});

test("firmness uses consistent broad text groups without invented numeric precision",()=>{
 const labels=new Map();
 for(const p of data.products){const {label,rank}=p.firmness;assert.ok([null,2,3,4].includes(rank),p.id);if(labels.has(label))assert.equal(rank,labels.get(label),label);labels.set(label,rank);if(/未標示軟硬|軟硬度待確認/.test(label))assert.equal(rank,null,p.id);}
});

test('Queen extension covers every original model while keeping exact prices, candidates and source scopes',()=>{
 const originals=data.products.filter(p=>!p.baseProductId),queens=data.products.filter(p=>p.size.category==='queen');
 const byId=new Map(data.products.map(p=>[p.id,p])),sources=new Set(data.sources.map(s=>s.id));
 assert.equal(data.queenAudit.length,originals.length);
 assert.equal(new Set(data.queenAudit.map(a=>a.baseProductId)).size,originals.length);
 for(const a of data.queenAudit){
  assert.ok(byId.has(a.baseProductId));assert.ok(['confirmed','unavailable','unverified'].includes(a.status));assert.ok(a.note&&a.checkedAt);
  assert.ok(a.sourceIds.length&&a.sourceIds.every(id=>sources.has(id)));
  for(const id of a.productIds)assert.equal(byId.get(id)?.baseProductId,a.baseProductId);
 }
 for(const q of queens){
  const base=byId.get(q.baseProductId);assert.equal(q.brandId,base.brandId);
  assert.doesNotMatch(q.size.label,/\bKing\b|特大|單人|(?:3(?:\.5)?|5)\s*[尺呎]?\s*[x×*＊]\s*6\s*[尺呎]/i);
  if(!/Queen/i.test(q.size.label))assert.doesNotMatch(q.size.label,/(?:6|六)\s*[尺呎]?\s*[x×*＊]\s*(?:7|七)/i);
  if(!q.size.width||!q.size.length||q.offers.every(o=>o.stockStatus==='out_of_stock'))assert.equal(q.scopeStatus,'candidate');
  for(const o of q.offers)if(o.baseOfferId){const original=base.offers.find(x=>x.id===o.baseOfferId);assert.ok(original);assert.equal(o.name,original.name);assert.equal(o.channel,original.channel);}
 }
 const orange=byId.get('q-rec-l-og-23');assert.deepEqual([orange.size.width,orange.size.length,orange.offers[0].price],[182,188,32100]);
 assert.equal(byId.get('l-og-23').offers[0].price,26800);
 const muji=byId.get('q-rec-r-muji-9757527');assert.equal(muji.scopeStatus,'candidate');assert.equal(selectProducts({...data,products:[muji]}).length,0);
 const ikea=byId.get('q-rec-r-ikea-60613087');assert.deepEqual([ikea.size.width,ikea.size.length,ikea.offers[0].price],[180,200,11990]);assert.equal(ikea.offers[0].haul,'no');
 assert.equal(data.queenAudit.find(a=>a.baseProductId==='r-ikea-70531736').status,'unavailable');
});
