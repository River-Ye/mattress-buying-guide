const normalize=text=>text.normalize('NFKC').trim().toLocaleLowerCase();

export function matchingOption(options,text) {
 const query=normalize(text);
 return query?options.find(option=>normalize(option.label)===query):options[0];
}

// Keep the original select as the form value; the browser supplies the searchable popup.
export function enhanceSelect(select) {
 const options=[...select.options].map(option=>({value:option.value,label:option.textContent}));
 const input=document.createElement('input');
 const list=document.createElement('datalist');
 const label=select.labels[0];
 const name=select.name||select.id;
 input.id=`${name}-search`;
 input.type='search';
 input.className='search-select';
 input.autocomplete='off';
 input.spellcheck=false;
 input.setAttribute('aria-description','輸入關鍵字後從建議清單選取；清空可重設此條件。');
 list.id=`${name}-options`;
 input.setAttribute('list',list.id);
 for(const item of options){const option=document.createElement('option');option.value=item.label;list.append(option);}
 select.before(input,list);
 select.hidden=true;
 if(label)label.htmlFor=input.id;
 const sync=()=>{
  const current=options.find(option=>option.value===select.value)||options[0];
  input.value=current===options[0]?'':current.label;
  input.placeholder=current===options[0]?`${current.label} · 輸入搜尋`:current.label;
  input.title=current.label;
 };
 input.addEventListener('focus',()=>input.select());
 input.addEventListener('input',event=>{
  event.stopPropagation();
  if(event.isComposing)return;
  const match=matchingOption(options,input.value);
  if(match&&match.value!==select.value){
   select.value=match.value;
   select.dispatchEvent(new Event('input',{bubbles:true}));
   select.dispatchEvent(new Event('change',{bubbles:true}));
  }
 });
 input.addEventListener('compositionend',()=>input.dispatchEvent(new Event('input',{bubbles:true})));
 input.addEventListener('blur',sync);
 input.addEventListener('keydown',event=>{if(event.key==='Escape')sync();});
 select.addEventListener('change',sync);
 select.form?.addEventListener('reset',()=>queueMicrotask(sync));
 sync();
}
