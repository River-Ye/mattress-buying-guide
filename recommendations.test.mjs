import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recommendations} from './recommendations.mjs';
import {selectProducts,safeUrl} from './logic.mjs';

test('ranking has at least 15 distinct eligible models with exact offers, reasons and checked sources',()=>{
  const data=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));
  const eligible=selectProducts(data,{});
  const models=new Set();
  for(const r of recommendations){
    const row=eligible.find(x=>x.product.id===r.productId);
    assert.ok(row,`${r.productId} must be eligible`);
    const offer=row.offers.find(o=>o.id===r.offerId);
    assert.ok(offer,`${r.offerId} must be a confirmed eligible offer`);
    assert.equal(offer.price,r.verifiedPrice,'ranking price must match its checked size and seller');
    assert.ok(offer.price>0);
    const model=`${row.product.brandId}:${row.product.model.replace(/（\d+）/g,'')}`;
    assert.ok(!models.has(model),'different sizes cannot pad the ranking');models.add(model);
    for(const key of ['badge','fit','reason','caution'])assert.ok(r[key]?.trim(),`${r.productId} missing ${key}`);
    assert.match(r.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.sources.length>0);
    for(const source of r.sources){assert.ok(safeUrl(source.url));assert.ok(source.title&&source.note);}
  }
  assert.ok(models.size>=15);
});
