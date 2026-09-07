import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingOption} from './search-select.mjs';

test('typed selections resolve labels to values without committing partial or unknown brands',()=>{
 const options=[{value:'',label:'全部品牌'},{value:'sealy',label:'Sealy 席伊麗'},{value:'tofu',label:'眠豆腐 Sleepy Tofu'}];
 assert.equal(matchingOption(options,'  ＳＥＡＬＹ 席伊麗  ').value,'sealy');
 assert.equal(matchingOption(options,'眠豆腐 Sleepy Tofu').value,'tofu');
 assert.equal(matchingOption(options,'').value,'');
 assert.equal(matchingOption(options,'全部品牌').value,'');
 assert.equal(matchingOption(options,'眠豆腐'),undefined);
 assert.equal(matchingOption(options,'不存在的品牌'),undefined);
 assert.equal(matchingOption([],''),undefined);
});
