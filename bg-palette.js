(function (window) {
  'use strict';

  var BG_PALETTE_VARS = [
    '--bg', '--surface', '--text', '--text-2', '--text-3',
    '--line', '--hover', '--shadow', '--accent-soft', '--accent-text',
  ];

  function parseHexColor(color) {
    if (!color) return null;
    var hex = String(color).trim();
    if (hex.charAt(0) === '#') hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (v) {
      var h = v.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function relativeLuminance(rgb) {
    function channel(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function buildBgPalette(color) {
    var rgb = parseHexColor(color);
    if (!rgb) return null;
    var isDark = relativeLuminance(rgb) < 0.45;
    var white = { r: 255, g: 255, b: 255 };
    var black = { r: 0, g: 0, b: 0 };

    if (isDark) {
      return {
        '--bg': rgbToHex(rgb),
        '--surface': rgbToHex(mixRgb(rgb, white, 0.12)),
        '--text': '#e8e8e8',
        '--text-2': '#999999',
        '--text-3': '#666666',
        '--line': rgbToHex(mixRgb(rgb, white, 0.2)),
        '--hover': rgbToHex(mixRgb(rgb, white, 0.08)),
        '--shadow': '0 1px 8px rgba(0, 0, 0, 0.3)',
        '--accent-soft': 'rgba(34, 197, 94, 0.14)',
        '--accent-text': '#4ade80',
      };
    }

    return {
      '--bg': rgbToHex(rgb),
      '--surface': rgbToHex(mixRgb(rgb, white, 0.72)),
      '--text': '#2c2c2c',
      '--text-2': '#888888',
      '--text-3': '#aaaaaa',
      '--line': rgbToHex(mixRgb(rgb, black, 0.1)),
      '--hover': rgbToHex(mixRgb(rgb, black, 0.05)),
      '--shadow': '0 1px 8px rgba(0, 0, 0, 0.04)',
      '--accent-soft': 'rgba(34, 197, 94, 0.1)',
      '--accent-text': '#15803d',
    };
  }

  function clearBgPalette() {
    document.documentElement.style.removeProperty('--bg');
    var el = document.body;
    el.classList.remove('has-custom-bg');
    BG_PALETTE_VARS.forEach(function (key) {
      el.style.removeProperty(key);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#22c55e';
  }

  function applyBgPalette(color) {
    var palette = buildBgPalette(color);
    if (!palette) return;
    document.documentElement.style.removeProperty('--bg');
    var el = document.body;
    Object.keys(palette).forEach(function (key) {
      el.style.setProperty(key, palette[key]);
    });
    el.classList.add('has-custom-bg');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = palette['--bg'];
  }

  window.G123_bgPalette = {
    apply: applyBgPalette,
    clear: clearBgPalette,
  };
})(window);
