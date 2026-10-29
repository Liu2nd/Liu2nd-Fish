'use strict';
const el = id => document.getElementById(id);
const board = el('preview-board');
const stage = el('preview-stage');
const rect = el('view-rect');
const previewSkin = el('preview-skin');
let config;
let localSkinPath;
let stageScale = 1;
let interaction = null;
let debounce;
let applying = false;
const DEFAULT_KEYS = { toggleWindow:'Alt+Q', toggleMute:'Alt+M', openSettings:'CommandOrControl+Alt+S' };
let shortcutEditing = null;

function notice(message){el('message').textContent=message||'';}
function drawPreview() {
  if(!config) return;
  const width=config.designWidth, height=config.designHeight;
  const scale=Math.min((board.clientWidth-28)/width, (board.clientHeight-20)/height);
  stageScale=scale;
  stage.style.width=width+'px';stage.style.height=height+'px';
  stage.style.transform=`translate(${Math.round((board.clientWidth-width*scale)/2)}px, ${Math.round((board.clientHeight-height*scale)/2)}px) scale(${scale})`;
  const r=config.browser;
  Object.assign(rect.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
}
function fillForm() {
  if(!config) return;
  for(const [id,value] of Object.entries({
    'web-x':config.browser.x,'web-y':config.browser.y,'web-w':config.browser.width,'web-h':config.browser.height,
    'window-w':config.window.width,'window-h':config.window.height,
    'design-w':config.designWidth,'design-h':config.designHeight
  })) { if(document.activeElement!==el(id))el(id).value=value; }
  el('fit').value=config.fit;
  el('opacity').value=Math.round(config.window.opacity*100);
  el('opacity-value').value=Math.round(config.window.opacity*100)+'%';
  el('topmost').checked=config.window.alwaysOnTop;
  el('mute').checked=config.muteOnHide;
  el('muted').checked=config.muted;
  if (document.activeElement !== el('website-url')) el('website-url').value=config.currentUrl || config.url;
  for (const action of Object.keys(DEFAULT_KEYS)) {
    const input = el('hotkey-'+action);
    if (shortcutEditing !== action) input.value=config.shortcuts[action] || '';
    const status = config.shortcutStatus?.[action];
    const indicator = el('hotkey-status-'+action);
    indicator.textContent = status?.message || '未检查';
    indicator.classList.toggle('failed', !!config.shortcuts[action] && !status?.registered);
  }
  drawPreview();
}
async function refreshSkin(){
  const skin=await window.fish.getSkin();
  previewSkin.src=skin.data;
  el('skin-name').textContent=`当前皮肤：${skin.name}`;
}
async function patch(value){
  try { applying=true; config=await window.fish.patch(value); fillForm();notice('已自动保存'); }
  catch(e){notice(e.message)} finally{applying=false;}
}
function laterPatch(p){clearTimeout(debounce);debounce=setTimeout(()=>patch(p),130);}
window.fish.onState(state=>{
  if(interaction)return;
  config=state;fillForm();
  if(localSkinPath!==state.skinPath){localSkinPath=state.skinPath;refreshSkin();}
});
for(const [field,key] of [['web-x','x'],['web-y','y'],['web-w','width'],['web-h','height']]){
  el(field).addEventListener('change',()=>patch({browser:{[key]:Number(el(field).value)}}));
}
for(const [field,key] of [['window-w','width'],['window-h','height']]){
  el(field).addEventListener('change',()=>patch({window:{[key]:Number(el(field).value)}}));
}
for(const [field,key] of [['design-w','designWidth'],['design-h','designHeight']]){
  el(field).addEventListener('change',()=>patch({[key]:Number(el(field).value)}));
}
el('fit').addEventListener('change',()=>patch({fit:el('fit').value}));
el('opacity').addEventListener('input',()=>{
  el('opacity-value').value=el('opacity').value+'%';
  laterPatch({window:{opacity:Number(el('opacity').value)/100}});
});
el('topmost').addEventListener('change',()=>patch({window:{alwaysOnTop:el('topmost').checked}}));
el('mute').addEventListener('change',()=>patch({muteOnHide:el('mute').checked}));
el('muted').addEventListener('change',()=>patch({muted:el('muted').checked}));
el('url-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result=await window.fish.navigate(el('website-url').value);
    if (!result.ok) throw new Error(result.error);
    notice('已在弹窗中央打开：'+result.url);
    el('website-url').blur();
  }catch(error){notice('网址打开失败：'+error.message);}
});
function shortcutFromKeydown(e) {
  const keyName = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) :
    /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) :
    /^F(?:[1-9]|1[0-2])$/.test(e.key) ? e.key : '';
  if (!keyName) return null;
  const mods = [];
  if (e.ctrlKey || e.metaKey) mods.push('CommandOrControl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (!mods.includes('CommandOrControl') && !mods.includes('Alt')) return null;
  return [...mods,keyName].join('+');
}
async function saveShortcut(action, value) {
  try {
    const result=await window.fish.setShortcut(action,value);
    config=result.state;
    shortcutEditing=null;
    fillForm();
    notice(result.ok ? '快捷键修改成功，并已保存' : '快捷键未生效：'+result.message);
  } catch(error) {
    shortcutEditing=null;
    config=await window.fish.getState();
    fillForm();
    notice('未更改快捷键：'+error.message);
  }
}
for (const action of Object.keys(DEFAULT_KEYS)) {
  const input=el('hotkey-'+action);
  input.addEventListener('focus',async()=>{
    shortcutEditing=action;
    try { await window.fish.captureShortcuts(true); notice('正在录制「'+input.getAttribute('aria-label')+'」，按下组合键，Esc 取消'); }
    catch(err){notice(err.message);}
  });
  input.addEventListener('blur',()=>{
    if(shortcutEditing===action) {shortcutEditing=null; if(config)fillForm();}
    window.fish.captureShortcuts(false).catch(()=>{});
  });
  input.addEventListener('keydown',async e=>{
    e.preventDefault();e.stopPropagation();
    if(e.key==='Escape'){ input.blur();notice('已取消录制');return; }
    const candidate=shortcutFromKeydown(e);
    if(!candidate) {notice('请按 Alt 或 Ctrl / Cmd，再按字母、数字或 F1–F12');return;}
    input.value=candidate;
    await saveShortcut(action,candidate);
    input.blur();
  });
  document.querySelector(`[data-shortcut-clear="${action}"]`).addEventListener('click',()=>saveShortcut(action,''));
  document.querySelector(`[data-shortcut-reset="${action}"]`).addEventListener('click',()=>saveShortcut(action,DEFAULT_KEYS[action]));
}
el('show').addEventListener('click',()=>window.fish.action('show'));
el('reset-rect').addEventListener('click',()=>patch({browser:{x:Math.round(config.designWidth*22/354),y:Math.round(config.designHeight*80/376),width:Math.round(config.designWidth*310/354),height:Math.round(config.designHeight*177/376)}}));
el('restore').addEventListener('click',()=>patch({skinPath:'',designWidth:354,designHeight:376,browser:{x:22,y:80,width:310,height:177}}));
el('pick').addEventListener('click',async()=>{
  try {
    const result=await window.fish.pickSkin();
    if(!result.cancelled){previewSkin.src=result.data;el('skin-name').textContent='当前皮肤：'+result.name;}
  }catch(e){notice(e.message)}
});
rect.addEventListener('pointerdown', event=>{
  if(!config)return;
  const resize=event.target.id==='handle';
  interaction={resize,screenX:event.clientX,screenY:event.clientY,start:{...config.browser}};
  rect.setPointerCapture(event.pointerId);event.preventDefault();
});
rect.addEventListener('pointermove', event=>{
  if(!interaction||!config)return;
  const dx=Math.round((event.clientX-interaction.screenX)/stageScale);
  const dy=Math.round((event.clientY-interaction.screenY)/stageScale);
  const r=interaction.start;
  if(interaction.resize){
    config.browser.width=Math.max(60,Math.min(config.designWidth-r.x,r.width+dx));
    config.browser.height=Math.max(60,Math.min(config.designHeight-r.y,r.height+dy));
  }else{
    config.browser.x=Math.max(0,Math.min(config.designWidth-r.width,r.x+dx));
    config.browser.y=Math.max(0,Math.min(config.designHeight-r.height,r.y+dy));
  }
  drawPreview();
  for(const [id,value] of Object.entries({'web-x':config.browser.x,'web-y':config.browser.y,'web-w':config.browser.width,'web-h':config.browser.height})) el(id).value=value;
  laterPatch({browser:{...config.browser}});
});
function endInteraction(){
  if(!interaction)return;
  clearTimeout(debounce);
  const browser={...config.browser};interaction=null;
  patch({browser});
}
rect.addEventListener('pointerup',endInteraction);
rect.addEventListener('pointercancel',endInteraction);
window.addEventListener('resize',drawPreview);
(async()=>{
  config=await window.fish.getState();
  localSkinPath=config.skinPath;
  fillForm();await refreshSkin();
})();
