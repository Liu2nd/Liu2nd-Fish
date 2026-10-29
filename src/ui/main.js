'use strict';
const stage = document.querySelector('#stage');
const skin = document.querySelector('#skin');
const address = document.querySelector('#address');
const form = document.querySelector('#address-form');
const status = document.querySelector('#status');
const grip = document.querySelector('#resize-grip');
let current;
let activeSkinPath;
let layout;
async function refreshSkin() {
  const result = await window.fish.getSkin();
  skin.src = result.data;
}
function drawLayout(nextLayout) {
  layout = nextLayout;
  stage.style.width = `${nextLayout.stage.width}px`;
  stage.style.height = `${nextLayout.stage.height}px`;
  stage.style.transform = `translate(${nextLayout.stage.left}px, ${nextLayout.stage.top}px) scale(${nextLayout.stage.scaleX}, ${nextLayout.stage.scaleY})`;
}
window.fish.onLayout(drawLayout);
window.fish.onFocusAddress(() => { address.focus(); address.select(); });
window.fish.onState(async config => {
  current = config;
  document.querySelector('#hide').title = `隐藏窗口（${config.shortcuts?.toggleWindow || '未设置'}）`;
  document.querySelector('#settings').title = `在程序内修改设置（${config.shortcuts?.openSettings || '未设置'}）`;
  if (document.activeElement !== address) address.value = config.currentUrl || config.url;
  if (activeSkinPath !== config.skinPath) { activeSkinPath = config.skinPath; await refreshSkin(); }
});
window.fish.onBrowser(({url, status:text}) => {
  if (url && document.activeElement !== address) address.value = url;
  status.textContent = text || '';
  status.style.display = text && /(失败|错误|无法)/.test(text) ? 'block' : 'none';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await window.fish.navigate(address.value);
    if (!result.ok) throw new Error(result.error);
    address.blur();
  } catch (error) { status.textContent=error.message;status.style.display='block'; }
});
for (const [selector, action] of [['#close','close'],['#back','back'],['#refresh','reload'],['#settings','settings'],['#hide','hide']]) {
  document.querySelector(selector).addEventListener('click', () => window.fish.action(action));
}
let resize = null;
grip.addEventListener('pointerdown', event => {
  if (!current) return;
  resize = { x:event.screenX, y:event.screenY, width:current.window.width, height:current.window.height };
  grip.setPointerCapture(event.pointerId); event.preventDefault();
});
let scheduled = false;
grip.addEventListener('pointermove', event => {
  if (!resize || scheduled) return;
  scheduled=true;
  const next = { width:Math.round(resize.width+event.screenX-resize.x), height:Math.round(resize.height+event.screenY-resize.y) };
  requestAnimationFrame(() => { scheduled=false; window.fish.patch({window:next}).catch(()=>{}); });
});
function stopResize(){resize=null;}
grip.addEventListener('pointerup', stopResize);
grip.addEventListener('pointercancel', stopResize);
(async()=>{
  const config=await window.fish.getState(); current=config;
  activeSkinPath=config.skinPath;
  address.value=config.currentUrl||config.url;
  await refreshSkin();
})();
