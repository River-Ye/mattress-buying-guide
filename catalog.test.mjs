import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,selectProducts,scopedReviews} from './logic.mjs';
const data=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));

test('complete catalog keeps unique products, required evidence and explicit unknowns',()=>{
 assert.deepEqual(validateCatalog(data),[]);
 const keys=new Set(),brands=new Set(data.brands.map(b=>b.id));
 for(const p of data.products){
  const key=[p.brandId,p.model.replace(/\s/g,''),p.size.width,p.size.length,p.size.height].join('|');
  assert.ok(!keys.has(key),`duplicate model and size: ${p.id}`);keys.add(key);
  assert.ok(['checked','limited'].includes(p.reviewSearch?.status),`review search incomplete: ${p.id}`);
  assert.ok(p.reviewSearch.queries.length,`missing review queries: ${p.id}`);
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
});

test('real exact-size prices cannot silently become single-size starting prices',()=>{
 const known=[['r-assari-387','',152,188,2277],['r-muji-','支撐型',142,196,15990],['r-3m-4612412','',150,186,5590],['r-3m-4612489','',150,186,4590],['r-house-655aefe5bd48bd0011c24904','',152,188,5988],['g-jalt-834','',152,188,4680],['g-jalt-619','',152,188,18888]];
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
  assert.equal(p.offers.find(o=>o.channel==='online').haul,'no');assert.equal(p.offers.find(o=>o.channel==='store').haul,'yes');
 }
 for(const p of data.products){for(const o of p.offers){const r=scopedReviews(data.reviews,p,o);assert.ok(r.model.every(r=>r.productIds.includes(p.id)));assert.ok(r.store.every(r=>r.offerIds.includes(o.id)));}}
});

test("firmness uses consistent broad text groups without invented numeric precision",()=>{
 const labels=new Map();
 for(const p of data.products){const {label,rank}=p.firmness;assert.ok([null,2,3,4].includes(rank),p.id);if(labels.has(label))assert.equal(rank,labels.get(label),label);labels.set(label,rank);if(/未標示軟硬|軟硬度待確認/.test(label))assert.equal(rank,null,p.id);}
});
