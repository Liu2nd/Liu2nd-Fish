'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUrl, normalizeConfig, mergePatch } = require('../src/core/config');
const { layoutFor } = require('../src/core/layout');
test('URL accepts normal links, fills HTTPS, blocks dangerous schemes', () => {
  assert.equal(normalizeUrl('example.org/path'), 'https://example.org/path');
  assert.equal(normalizeUrl('http://example.org'), 'http://example.org/');
  assert.throws(() => normalizeUrl('javascript:alert(1)'));
  assert.throws(() => normalizeUrl('file:///C:/secret.txt'));
});
test('default reference rectangle stays anchored at screenshot pixel dimensions', () => {
  const config = normalizeConfig();
  assert.deepEqual(layoutFor(354, 376, config).browser, { x:22, y:80, width:310, height:177 });
});
test('resizing without stretching preserves original skin proportions', () => {
  const config = normalizeConfig();
  const layout = layoutFor(708, 752, config);
  assert.deepEqual(layout.browser, { x:44, y:160, width:620, height:354 });
  assert.equal(layout.stage.scaleX, layout.stage.scaleY);
});
test('custom rectangle clamps within skin bounds and keeps dimensions valid', () => {
  const config = mergePatch(normalizeConfig(), { browser: { x: 340, y: 360, width: 400, height: 200 }});
  assert.equal(config.browser.x + config.browser.width <= config.designWidth, true);
  assert.equal(config.browser.y + config.browser.height <= config.designHeight, true);
});
test('free stretching fits full window, instead of forcing 354:376', () => {
  const config = mergePatch(normalizeConfig(), { fit: 'stretch' });
  const layout = layoutFor(800, 400, config);
  assert.equal(layout.stage.left, 0);
  assert.equal(layout.stage.top, 0);
  assert.notEqual(layout.stage.scaleX, layout.stage.scaleY);
});
const { normalizeShortcut, normalizeShortcuts, applyShortcut, DEFAULT_SHORTCUTS } = require('../src/core/shortcuts');
test('custom global shortcut accepts modifiers, uppercases keys and supports disabling', () => {
  assert.equal(normalizeShortcut(' alt + shift + k '), 'Alt+Shift+K');
  assert.equal(normalizeShortcut('Ctrl+Alt+8'), 'CommandOrControl+Alt+8');
  assert.equal(normalizeShortcut('cmd+f11'), 'CommandOrControl+F11');
  assert.equal(normalizeShortcut('  '), '');
});
test('unsafe and invalid shortcuts are rejected', () => {
  for (const key of ['F3','Shift+K','Alt+Tab','Alt+F4','Alt+W+S','Meta+Alt+Q','Alt+Enter','Ctrl+Alt+Delete', 'Alt+Q+']) {
    assert.throws(() => normalizeShortcut(key), `${key} should be denied`);
  }
});
test('hotkey settings persist across normalization and migrate from older config', () => {
  const custom = mergePatch(normalizeConfig(), { url: 'https://example.com', muted:true });
  const keys = applyShortcut(custom, 'toggleWindow', 'Ctrl+Shift+F8');
  const loaded = normalizeConfig({ ...custom, shortcuts: keys });
  assert.equal(loaded.shortcuts.toggleWindow, 'CommandOrControl+Shift+F8');
  assert.equal(loaded.shortcuts.toggleMute, DEFAULT_SHORTCUTS.toggleMute);
  assert.equal(loaded.muted, true);
  assert.equal(normalizeConfig({}).shortcuts.toggleWindow, 'Alt+Q');
});
test('shortcut editing refuses duplicate keys and unknown actions', () => {
  const config = normalizeConfig();
  assert.throws(() => applyShortcut(config, 'toggleMute', 'Alt+Q'), /已经被/);
  assert.throws(() => applyShortcut(config, 'secret', 'Alt+A'), /未知/);
  const keys = applyShortcut(config, 'toggleWindow', '');
  assert.equal(keys.toggleWindow, '');
  assert.equal(normalizeShortcuts(keys).toggleWindow, '');
});
