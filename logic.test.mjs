import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectProducts, addComparison, safeUrl, dimensions, scopedReviews, validateCatalog, latestDate} from './logic.mjs';
const offer=(id,price,extra={})=>({id,name:id,price,channel:'online',delivery:'yes',trial:'unknown',haul:'no',...extra});
const product=(id,offers,extra={})=>({id,brandId:'b',model:id,size:{system:'台規',label:'標準雙人',width:152,length:188,height:25},material:'獨立筒',firmness:{label:'適中',rank:3},sourceIds:['s'],offers,...extra});
const data={brands:[{id:'b',name:'品牌'}],products:[product('cheap',[offer('nodelivery',1,{delivery:'no'}),offer('a',20000),offer('b',30000,{channel:'store',district:'西區',trial:'yes',haul:'yes'})]),product('unknown',[offer('c',null)]),product('soft',[offer('d',40000)],{firmness:{label:'偏軟',rank:2}}),product('candidate',[offer('e',100)],{size:{system:'台規',label:'標準雙人',width:null,length:null,height:null}})],sources:[{id:'s',checkedAt:'2026-09-06'}],reviews:[]};
test('eligible offer filtering precedes displayed price; no-delivery cheap offer cannot win',()=>{
 const results=selectProducts(data,{sort:'price-asc'});
 assert.deepEqual(results.map(x=>x.product.id),['cheap','soft','unknown']);
 assert.equal(results[0].bestOffer.id,'a');
 assert.equal(selectProducts(data,{channel:'store'})[0].bestOffer.id,'b');
 assert.equal(selectProducts(data,{haul:'yes'})[0].price,30000);
});
test('unknown prices last in both directions; numeric bounds exclude them',()=>{
 for(const sort of ['name','price-asc','price-desc','firmness-asc','firmness-desc','updated'])assert.equal(selectProducts(data,{sort}).at(-1).price,null);
 assert.deepEqual(selectProducts(data,{minPrice:25000,maxPrice:35000}).map(x=>x.product.id),['cheap']);
 assert.equal(selectProducts(data,{minPrice:25000,maxPrice:35000})[0].price,30000);
 assert.deepEqual(selectProducts(data,{priceStatus:'unknown'}).map(x=>x.product.id),['unknown']);
});
test('candidate mode, combined filters, empty results, softness and model sorting',()=>{
 assert.deepEqual(selectProducts(data,{status:'candidate'}).map(x=>x.product.id),['candidate']);
 assert.equal(selectProducts(data,{q:'品牌 soft',material:'獨立筒',system:'台規',size:'152×188',firmness:'2'})[0].product.id,'soft');
 assert.equal(selectProducts(data,{district:'西區',trial:'yes'})[0].bestOffer.id,'b');
 assert.equal(selectProducts(data,{q:'<script>不存在'}).length,0);
 assert.equal(selectProducts(data,{brand:'notfound'}).length,0);
 assert.equal(selectProducts(data,{sort:'firmness-asc'})[0].product.id,'soft');
 assert.equal(selectProducts(data,{sort:'firmness-desc'})[0].product.id,'cheap');
 const x=structuredClone(data);x.products[0].firmness.rank=null;
 assert.equal(selectProducts(x,{sort:'firmness-desc'}).filter(r=>r.price!==null).at(-1).product.id,'cheap');
 assert.equal(selectProducts(data,{sort:'updated'}).length,3);
 assert.equal(selectProducts(data,{status:'all'}).length,4);
 const other=structuredClone(data);other.products[0].size.system='其他';
 assert.equal(selectProducts(other).some(r=>r.product.id==='cheap'),false);
 assert.equal(selectProducts(other,{status:'candidate',system:'其他'})[0].product.id,'cheap');
 assert.equal(selectProducts({brands:[],products:[],sources:[]},{}).length,0);
 const synonyms=structuredClone(data);synonyms.products[0].material='袋裝彈簧／泡綿／連結型';
 for(const material of ['獨立筒','泡棉','連結式'])assert.ok(selectProducts(synonyms,{material}).some(r=>r.product.id==='cheap'));
});
test('comparison preserves choices, prevents duplicates, caps at four',()=>{
 const ids=[]; for(let i=0;i<4;i++)assert.equal(addComparison(ids,`p${i}`,'o').status,'added');
 assert.equal(addComparison(ids,'p0','o').status,'duplicate');
 assert.equal(addComparison(ids,'p4','o').status,'full');
 assert.equal(ids.length,4);
});
test('candidate store stays discoverable when the same mattress has confirmed online delivery',()=>{
 const x=structuredClone(data);x.products[0].offers.push(offer('pending-store',5000,{channel:'store',delivery:'unknown',district:'北區'}));
 assert.equal(selectProducts(x,{status:'all',channel:'store',district:'北區'})[0]?.bestOffer.id,'pending-store');
 assert.equal(selectProducts(x,{status:'candidate',channel:'store',district:'北區'})[0]?.eligible,false);
 assert.equal(selectProducts(x,{channel:'store',district:'北區'}).length,0);
 x.products[0].scopeStatus='candidate';x.products[0].scopeNote='尺寸命名衝突';
 assert.equal(selectProducts(x,{}).some(r=>r.product.id==='cheap'),false);
});
test('links reject executable schemes, credentials and malformed URLs',()=>{
 assert.equal(safeUrl('https://example.com/x'),'https://example.com/x');
 assert.equal(safeUrl('http://example.com/x'),'http://example.com/x');
 for(const url of ['javascript:alert(1)','data:text/html,x','https://user:pass@example.com','file:///etc/passwd','invalid','//example.com',''])assert.equal(safeUrl(url),null);
 assert.equal(dimensions(data.products[0].size),'152 × 188 × 25 cm');
 assert.equal(dimensions(data.products[3].size),'長寬待確認・厚度待確認');
});
test('brand and store complaints never become model complaints',()=>{
 const reviews=[{scope:'brand',brandId:'b'},{scope:'model',brandId:'b',productIds:['cheap']},{scope:'model',brandId:'b',productIds:['soft']},{scope:'store',brandId:'b',offerIds:['a']}];
 assert.deepEqual(scopedReviews(reviews,data.products[0],data.products[0].offers[1]),{model:[reviews[1]],brand:[reviews[0]],store:[reviews[3]]});
});
test('recent verification includes relevant review evidence and review-search dates',()=>{
 const x=structuredClone(data);x.sources.push({id:'review-source',checkedAt:'2026-09-08'},{id:'other-source',checkedAt:'2026-09-10'});
 x.reviews=[{scope:'model',brandId:'b',productIds:['soft'],sourceIds:['review-source']},{scope:'store',brandId:'other',offerIds:['a'],sourceIds:['other-source']}];
 assert.equal(latestDate(x,x.products[2]),'2026-09-08');
 assert.equal(selectProducts(x,{sort:'updated'})[0].product.id,'soft');
 x.products[0].reviewSearch={checkedAt:'2026-09-09'};
 assert.equal(selectProducts(x,{sort:'updated'})[0].product.id,'cheap');
});
test('data validation fails duplicate IDs, wrong price types, missing source and haul contradictions',()=>{
 const x={brands:[{id:'b',sourceIds:['s']}],products:[product('p',[offer('o',10,{sourceIds:['s'],url:'https://example.com'})])],sources:[{id:'s',url:'https://example.com',checkedAt:'2026-09-06'}],reviews:[],audit:[]};
 assert.deepEqual(validateCatalog(x),[]);
 x.products.push(structuredClone(x.products[0])); assert.ok(validateCatalog(x).some(x=>x.includes('duplicate')));x.products.pop();
 x.products[0].offers[0].price='100';assert.ok(validateCatalog(x).some(x=>x.includes('price')));
 x.products[0].offers[0].sourceIds=['missing'];assert.ok(validateCatalog(x).some(x=>x.includes('source')));
 x.products[0].offers[0].haul='no';x.products[0].offers[0].haulFee=500;assert.ok(validateCatalog(x).some(x=>x.includes('haul')));
});
