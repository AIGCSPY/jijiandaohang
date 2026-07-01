#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const categoriesPath = path.join(root, 'categories.js');
const indexPath = path.join(root, 'index.html');

const code = fs.readFileSync(categoriesPath, 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const categories = sandbox.window.G123_CATEGORIES;

if (!Array.isArray(categories) || !categories.length) {
  console.error('G123_CATEGORIES not found in categories.js');
  process.exit(1);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let html = '';
categories.forEach(function (cat) {
  html += '      <h2>AI ' + esc(cat.name) + '工具</h2>\n      <ul>\n';
  cat.links.forEach(function (link) {
    html += '        <li><a href="' + esc(link.url) + '" rel="nofollow noopener noreferrer">' + esc(link.name) + '</a>';
    if (link.desc) html += '<span class="seo-nav-desc">' + esc(link.desc) + '</span>';
    html += '</li>\n';
  });
  html += '      </ul>\n';
});

let index = fs.readFileSync(indexPath, 'utf8');
const navRe = /(<nav class="nav" id="seoNav" aria-label="AI 工具导航索引">)[\s\S]*?(<\/nav>)/;
if (!navRe.test(index)) {
  console.error('seoNav block not found in index.html');
  process.exit(1);
}
index = index.replace(navRe, '$1\n' + html + '    $2');
fs.writeFileSync(indexPath, index);

var count = categories.reduce(function (n, c) { return n + c.links.length; }, 0);
console.log('Updated index.html SEO nav: ' + categories.length + ' categories, ' + count + ' links');
