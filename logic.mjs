const collator = new Intl.Collator('zh-Hant', {numeric:true});
export function safeUrl(value) {
  try { const u=new URL(value); return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password ? u.href : null; } catch { return null; }
}
export function dimensions(size) {
  const plane=size.width&&size.length?`${size.width} × ${size.length}`:'長寬待確認';
  return size.height?`${plane} × ${size.height} cm`:`${plane}${size.width&&size.length?' cm':''}・厚度待確認`;
}
export function latestDate(data,product) {
  const ids=new Set([...product.sourceIds,...product.offers.flatMap(o=>o.sourceIds||[])]);
  const offers=new Set(product.offers.map(o=>o.id));
  for(const review of data.reviews||[])if(review.brandId===product.brandId&&(review.scope==='brand'||review.scope==='model'&&review.productIds?.includes(product.id)||review.scope==='store'&&review.offerIds?.some(id=>offers.has(id))))for(const id of review.sourceIds||[])ids.add(id);
  return [...data.sources.filter(s=>ids.has(s.id)).map(s=>s.checkedAt),product.reviewSearch?.checkedAt||''].sort().at(-1)||'';
}
export function selectProducts(data,filters={}) {
  const brands=new Map(data.brands.map(b=>[b.id,b]));
  const rows=[];
  for(const product of data.products) {
    const brand=brands.get(product.brandId);
    const fitsScope=product.scopeStatus!=='candidate'&&product.size.system!=='其他'&&!!(product.size.width&&product.size.length);
    const status=filters.status||'eligible';
    if(filters.brand&&filters.brand!==product.brandId) continue;
    if(filters.system&&filters.system!==product.size.system) continue;
    if(filters.size&&filters.size!==`${product.size.width}×${product.size.length}`) continue;
    if(filters.material&&!product.material.replaceAll('泡綿','泡棉').replaceAll('袋裝彈簧','獨立筒').replaceAll('連結型','連結式').includes(filters.material)) continue;
    if(filters.firmness&&(filters.firmness==='unknown'?product.firmness.rank!==null:String(product.firmness.rank)!==filters.firmness)) continue;
    const offers=product.offers.filter(o=>{
      if(o.delivery==='no')return false;
      const eligible=fitsScope&&o.delivery==='yes';
      if(status==='eligible'&&!eligible)return false;
      if(status==='candidate'&&eligible)return false;
      if(filters.channel&&o.channel!==filters.channel)return false;
      if(filters.district&&o.district!==filters.district)return false;
      if(filters.trial&&o.trial!==filters.trial)return false;
      if(filters.haul&&o.haul!==filters.haul)return false;
      if(filters.priceStatus==='unknown'&&o.price!==null)return false;
      if(filters.minPrice!==undefined&&filters.minPrice!==''&&(o.price===null||o.price<Number(filters.minPrice)))return false;
      if(filters.maxPrice!==undefined&&filters.maxPrice!==''&&(o.price===null||o.price>Number(filters.maxPrice)))return false;
      const haystack=`${brand?.name} ${brand?.entity} ${product.model} ${o.name} ${o.address||''}`.toLocaleLowerCase();
      return (filters.q||'').trim().toLocaleLowerCase().split(/\s+/).every(word=>haystack.includes(word));
    });
    if(!offers.length)continue;
    offers.sort((a,b)=>nullableSort(a.price,b.price,1)||collator.compare(a.name,b.name));
    rows.push({product,brand,offers,bestOffer:offers[0],price:offers[0].price,eligible:fitsScope&&offers[0].delivery==='yes',updated:latestDate(data,product)});
  }
  const nameSort=(a,b)=>collator.compare(a.brand.name,b.brand.name)||collator.compare(a.product.model,b.product.model)||collator.compare(dimensions(a.product.size),dimensions(b.product.size));
  return rows.sort((a,b)=>{
    if((a.price===null)!==(b.price===null))return a.price===null?1:-1;
    if(filters.sort?.startsWith('price-'))return nullableSort(a.price,b.price,filters.sort==='price-asc'?1:-1)||nameSort(a,b);
    if(filters.sort?.startsWith('firmness-'))return nullableSort(a.product.firmness.rank,b.product.firmness.rank,filters.sort==='firmness-asc'?1:-1)||nameSort(a,b);
    if(filters.sort==='updated')return b.updated.localeCompare(a.updated)||nameSort(a,b);
    return nameSort(a,b);
  });
}
function nullableSort(a,b,direction) {return a===null?(b===null?0:1):b===null?-1:(a-b)*direction;}
export function addComparison(items,productId,offerId) {
  if(items.some(x=>x.productId===productId&&x.offerId===offerId))return {status:'duplicate'};
  if(items.length>=4)return {status:'full'};
  items.push({productId,offerId});return {status:'added'};
}
export function scopedReviews(reviews,product,offer) {
  const relevant=reviews.filter(r=>r.brandId===product.brandId);
  return {model:relevant.filter(r=>r.scope==='model'&&r.productIds?.includes(product.id)),brand:relevant.filter(r=>r.scope==='brand'),store:relevant.filter(r=>r.scope==='store'&&r.offerIds?.includes(offer.id))};
}
export function validateCatalog(data) {
  const errors=[],sourceIds=new Set(data.sources.map(s=>s.id)),brandIds=new Set(data.brands.map(b=>b.id)),productIds=new Set(data.products.map(p=>p.id)),offerIds=new Set();
  const checkIds=(rows,type)=>{const ids=new Set();for(const row of rows){if(!row.id||ids.has(row.id))errors.push(`${type} duplicate/missing id ${row.id}`);ids.add(row.id);}};
  const checkSources=row=>{if(!row.sourceIds?.length)errors.push(`${row.id} missing sources`);for(const id of row.sourceIds||[])if(!sourceIds.has(id))errors.push(`${row.id} invalid source ${id}`);};
  for(const type of ['brands','products','sources','reviews'])checkIds(data[type]||[],type);
  for(const s of data.sources)if(!safeUrl(s.url)||!/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt))errors.push(`${s.id} invalid source URL/date`);
  for(const b of data.brands)checkSources(b);
  for(const p of data.products){
    checkSources(p);
    if(!brandIds.has(p.brandId))errors.push(`${p.id} invalid brand`);
    if(!['台規','歐規','日規','其他'].includes(p.size.system))errors.push(`${p.id} invalid size system`);
    for(const dimension of ['width','length','height'])if(p.size[dimension]!==null&&(!Number.isFinite(p.size[dimension])||p.size[dimension]<=0))errors.push(`${p.id} invalid dimension ${dimension}`);
    if(p.firmness.rank!==null&&![2,3,4].includes(p.firmness.rank))errors.push(`${p.id} invalid firmness`);
    for(const o of p.offers){
      checkSources(o);
      if(offerIds.has(o.id))errors.push(`${o.id} duplicate offer`);offerIds.add(o.id);
      if(!safeUrl(o.url))errors.push(`${o.id} invalid offer URL`);
      if(o.price!==null&&(!Number.isFinite(o.price)||o.price<=0))errors.push(`${o.id} invalid price`);
      for(const prop of ['delivery','trial','haul'])if(!['yes','unknown','no'].includes(o[prop]))errors.push(`${o.id} invalid ${prop}`);
      if(o.haul!=='yes'&&o.haulFee!=null)errors.push(`${o.id} haul fee without haul service`);
      if(o.haulFee!=null&&(!Number.isFinite(o.haulFee)||o.haulFee<0))errors.push(`${o.id} invalid haul fee`);
    }
  }
  for(const r of data.reviews||[]){checkSources(r);if(!brandIds.has(r.brandId))errors.push(`${r.id} invalid review brand`);for(const id of r.productIds||[])if(!productIds.has(id))errors.push(`${r.id} missing review product ${id}`);for(const id of r.offerIds||[])if(!offerIds.has(id))errors.push(`${r.id} missing review offer ${id}`);if(r.scope==='model'&&!r.productIds?.length)errors.push(`${r.id} missing exact model`);if(r.scope==='store'&&!r.offerIds?.length)errors.push(`${r.id} missing exact store`);}
  return errors;
}
