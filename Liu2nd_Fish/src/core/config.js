'use strict';
const { normalizeShortcuts } = require('./shortcuts');

const DESIGN_MIN = 160;
const DESIGN_MAX = 4096;
const DEFAULT_CONFIG = Object.freeze({
  url: 'https://www.bilibili.com',
  skinPath: '',
  designWidth: 354,
  designHeight: 376,
  fit: 'contain',
  browser: { x: 22, y: 80, width: 310, height: 177 },
  window: { width: 354, height: 376, x: null, y: null, opacity: 1, alwaysOnTop: false },
  muteOnHide: true,
  muted: false,
  shortcuts: normalizeShortcuts()
});

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function normalizeUrl(value) {
  if (typeof value !== 'string') throw new Error('请输入网址');
  const raw = value.trim();
  if (!raw) throw new Error('请输入网址');
  const source = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(source); } catch { throw new Error('网址格式不正确'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('目前仅支持 http:// 和 https:// 网站');
  }
  if (!url.hostname || url.username || url.password) throw new Error('网址不安全或格式不正确');
  return url.href;
}
function normalizeConfig(input = {}) {
  const d = DEFAULT_CONFIG;
  const rawW = input.window || {};
  const rawB = input.browser || {};
  const designWidth = Math.round(clampNumber(input.designWidth, DESIGN_MIN, DESIGN_MAX, d.designWidth));
  const designHeight = Math.round(clampNumber(input.designHeight, DESIGN_MIN, DESIGN_MAX, d.designHeight));
  const x = Math.round(clampNumber(rawB.x, 0, designWidth - 60, d.browser.x));
  const y = Math.round(clampNumber(rawB.y, 0, designHeight - 60, d.browser.y));
  const width = Math.round(clampNumber(rawB.width, 60, designWidth - x, d.browser.width));
  const height = Math.round(clampNumber(rawB.height, 60, designHeight - y, d.browser.height));
  let url = d.url;
  try { url = normalizeUrl(input.url ?? d.url); } catch { /* keep safe default */ }
  return {
    url,
    skinPath: typeof input.skinPath === 'string' ? input.skinPath : d.skinPath,
    designWidth, designHeight,
    fit: input.fit === 'stretch' ? 'stretch' : 'contain',
    browser: { x, y, width, height },
    window: {
      width: Math.round(clampNumber(rawW.width, 290, 2400, d.window.width)),
      height: Math.round(clampNumber(rawW.height, 290, 1800, d.window.height)),
      x: Number.isInteger(rawW.x) ? rawW.x : null,
      y: Number.isInteger(rawW.y) ? rawW.y : null,
      opacity: clampNumber(rawW.opacity, .35, 1, 1),
      alwaysOnTop: rawW.alwaysOnTop === true
    },
    muteOnHide: input.muteOnHide !== false,
    muted: input.muted === true,
    shortcuts: normalizeShortcuts(input.shortcuts)
  };
}
function mergePatch(config, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return normalizeConfig(config);
  // Only known keys are accepted. Never let remote web content modify this config.
  const accepted = {};
  for (const key of ['url','skinPath','designWidth','designHeight','fit','muteOnHide','muted']) {
    if (Object.hasOwn(patch, key)) accepted[key] = patch[key];
  }
  if (patch.browser && typeof patch.browser === 'object') accepted.browser = { ...config.browser, ...patch.browser };
  if (patch.window && typeof patch.window === 'object') accepted.window = { ...config.window, ...patch.window };
  return normalizeConfig({ ...config, ...accepted });
}
module.exports = { DEFAULT_CONFIG, normalizeUrl, normalizeConfig, mergePatch, clampNumber };
