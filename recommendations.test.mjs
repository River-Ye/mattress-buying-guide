import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recommendations} from './recommendations.mjs';
import {selectProducts,safeUrl} from './logic.mjs';

test('ranking counts distinct models once and validates each exact Double or Queen offer',()=>{
  const data=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));
  const eligible=selectProducts(data,{});
  const models=new Set();
  for(const entry of recommendations){
    assert.ok(entry.variants?.length,'each ranked model needs at least one verified size');
    assert.ok(['confirmed','unavailable','unverified'].includes(entry.queenStatus?.status));
    assert.ok(entry.queenStatus.note?.trim(),'Queen availability needs an explicit note');
    const baseId=entry.variants[0].productId;let model;const productIds=new Set();
    for(const r of entry.variants){
      const product=data.products.find(p=>p.id===r.productId);
      assert.ok(product,`${r.productId} must exist`);
      const row=eligible.find(x=>x.product.id===r.productId);
      if(!row){assert.equal(product.size.category,'queen');assert.equal(product.scopeStatus,'candidate');assert.match(r.caution,/缺貨|售完|待補貨|庫存為0/);}
      if(product.size.category==='queen')assert.equal(product.baseProductId,baseId,'Queen must belong to this exact base model');
      assert.ok(!productIds.has(r.productId),'the same size cannot appear twice');productIds.add(r.productId);
      const offer=(row?.offers||product.offers).find(o=>o.id===r.offerId);
      assert.ok(offer,`${r.offerId} must be a confirmed eligible offer`);
      assert.equal(offer.price,r.verifiedPrice,'ranking price must match its checked size and seller');
      assert.ok(offer.price===null||offer.price>0);
      if(!model)model=`${product.brandId}:${product.model.replace(/（\d+）/g,'')}`;
      for(const key of ['badge','fit','reason','caution'])assert.ok(r[key]?.trim(),`${r.productId} missing ${key}`);
      assert.match(r.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
      assert.ok(r.sources.length>0);
      for(const source of r.sources){assert.ok(safeUrl(source.url));assert.ok(source.title&&source.note);}
    }
    const queenVariants=entry.variants.filter(r=>data.products.find(p=>p.id===r.productId).size.category==='queen');
    assert.equal(queenVariants.length>0,entry.queenStatus.status==='confirmed','only confirmed Queen variants may be selectable');
    assert.ok(!models.has(model),'different sizes cannot pad the ranking');models.add(model);
  }
  assert.ok(models.size>=15);
});
