'use strict';
function layoutFor(windowWidth, windowHeight, config) {
  const baseW = config.designWidth;
  const baseH = config.designHeight;
  let scaleX = windowWidth / baseW;
  let scaleY = windowHeight / baseH;
  if (config.fit !== 'stretch') scaleX = scaleY = Math.min(scaleX, scaleY);
  const left = Math.round((windowWidth - baseW * scaleX) / 2);
  const top = Math.round((windowHeight - baseH * scaleY) / 2);
  const r = config.browser;
  const browser = {
    x: Math.round(left + r.x * scaleX),
    y: Math.round(top + r.y * scaleY),
    width: Math.max(1, Math.round(r.width * scaleX)),
    height: Math.max(1, Math.round(r.height * scaleY))
  };
  browser.width = Math.min(browser.width, Math.max(1, windowWidth - browser.x));
  browser.height = Math.min(browser.height, Math.max(1, windowHeight - browser.y));
  return { stage: { left, top, scaleX, scaleY, width: baseW, height: baseH }, browser };
}
module.exports = { layoutFor };
