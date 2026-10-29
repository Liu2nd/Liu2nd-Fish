'use strict';

const DEFAULT_SHORTCUTS = Object.freeze({
  toggleWindow: 'Alt+Q',
  toggleMute: 'Alt+M',
  openSettings: 'CommandOrControl+Alt+S'
});
const ACTION_LABELS = Object.freeze({
  toggleWindow: '显示 / 隐藏窗口',
  toggleMute: '切换网页静音',
  openSettings: '打开设置'
});

// These accelerators are global: require Ctrl/Alt/Command to avoid stealing ordinary typing.
function normalizeShortcut(value) {
  if (typeof value !== 'string' || value.length > 90) throw new Error('快捷键格式不正确');
  if (!value.trim()) return ''; // An empty binding disables this action.
  const keys = value.split('+').map(x => x.trim());
  if (keys.some(x => !x)) throw new Error('快捷键格式不正确');
  const mods = new Set();
  let key = '';
  for (const part of keys) {
    const lower = part.toLowerCase();
    let mod;
    if (['ctrl', 'control', 'cmd', 'command', 'cmdorctrl', 'commandorcontrol', 'meta'].includes(lower)) mod = 'CommandOrControl';
    else if (['alt', 'option'].includes(lower)) mod = 'Alt';
    else if (lower === 'shift') mod = 'Shift';
    if (mod) { if (mods.has(mod)) throw new Error('不能重复使用修饰键'); mods.add(mod); continue; }
    if (key) throw new Error('一次只能设置一个主按键');
    if (/^[a-z\d]$/i.test(part)) key = part.toUpperCase();
    else if (/^f(?:[1-9]|1[0-2])$/i.test(part)) key = part.toUpperCase();
    else throw new Error('只支持字母、数字或 F1–F12 作为主按键');
  }
  if (!mods.has('Alt') && !mods.has('CommandOrControl')) throw new Error('请同时按住 Alt 或 Ctrl / Cmd');
  if (!key) throw new Error('请同时按下一个字母、数字或 F1–F12');
  const canonical = ['CommandOrControl', 'Alt', 'Shift'].filter(mod => mods.has(mod)).concat(key).join('+');
  const forbidden = new Set([
    'Alt+F4', 'Alt+F10', 'CommandOrControl+Alt+Delete',
    'CommandOrControl+Alt+F4', 'CommandOrControl+Alt+Q'
  ]);
  if (forbidden.has(canonical)) throw new Error('该组合键可能是重要系统快捷键，请更换');
  return canonical;
}
function normalizeShortcuts(input) {
  const result = {};
  for (const action of Object.keys(DEFAULT_SHORTCUTS)) {
    try { result[action] = normalizeShortcut(input && Object.hasOwn(input, action) ? input[action] : DEFAULT_SHORTCUTS[action]); }
    catch { result[action] = DEFAULT_SHORTCUTS[action]; }
  }
  // A malformed saved config must never shadow another active shortcut.
  const occupied = new Set();
  for (const action of Object.keys(result)) {
    if (result[action] && occupied.has(result[action])) result[action] = '';
    else if (result[action]) occupied.add(result[action]);
  }
  return result;
}
function applyShortcut(config, action, value) {
  if (!Object.hasOwn(DEFAULT_SHORTCUTS, action)) throw new Error('未知快捷键功能');
  const candidate = normalizeShortcut(value);
  const others = Object.entries(config.shortcuts).filter(([key]) => key !== action).map(([, shortcut]) => shortcut);
  if (candidate && others.includes(candidate)) throw new Error('这个组合键已经被 Liu2nd_Fish 的其他功能使用');
  return { ...config.shortcuts, [action]: candidate };
}
module.exports = { DEFAULT_SHORTCUTS, ACTION_LABELS, normalizeShortcut, normalizeShortcuts, applyShortcut };
