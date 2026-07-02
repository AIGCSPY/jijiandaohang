(function () {
  'use strict';

  var STORAGE_THEME = 'g123-theme';
  var STORAGE_BG = 'g123_bg';

  var THEME_OPTIONS = [
    { id: 'dark', name: '暗黑' },
    { id: 'light', name: '亮色' },
    { id: 'system', name: '系统' },
  ];

  var THEME_ICONS = {
    light: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    dark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    system: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
  };

  function $(sel) { return document.querySelector(sel); }

  function getThemeMode() {
    var saved = localStorage.getItem(STORAGE_THEME);
    if (THEME_OPTIONS.some(function (o) { return o.id === saved; })) return saved;
    return 'system';
  }

  function resolveDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateThemeBtnUI(mode) {
    var btn = $('#themeTrigger');
    var icon = $('#themeIcon');
    if (!btn || !icon) return;
    icon.innerHTML = THEME_ICONS[mode] || THEME_ICONS.system;
    var titles = { dark: '暗黑模式', light: '亮色模式', system: '跟随系统' };
    btn.title = titles[mode];
    btn.setAttribute('aria-label', titles[mode]);
  }

  function applyTheme(mode) {
    document.body.classList.toggle('dark', resolveDark(mode));
    updateThemeBtnUI(mode);
    var savedBg = localStorage.getItem(STORAGE_BG);
    if (savedBg && window.G123_bgPalette) window.G123_bgPalette.apply(savedBg);
  }

  function renderThemeDropdown() {
    var dd = $('#themeDropdown');
    if (!dd) return;
    var mode = getThemeMode();
    dd.innerHTML = '';
    THEME_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-option' + (mode === opt.id ? ' active' : '');
      btn.textContent = opt.name;
      btn.addEventListener('click', function () {
        localStorage.setItem(STORAGE_THEME, opt.id);
        applyTheme(opt.id);
        closeThemeDropdown();
        renderThemeDropdown();
      });
      dd.appendChild(btn);
    });
  }

  function openThemeDropdown() {
    var dd = $('#themeDropdown');
    var trigger = $('#themeTrigger');
    if (!dd || !trigger) return;
    renderThemeDropdown();
    dd.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }

  function closeThemeDropdown() {
    var dd = $('#themeDropdown');
    var trigger = $('#themeTrigger');
    if (!dd || !trigger) return;
    dd.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function toggleThemeDropdown() {
    var dd = $('#themeDropdown');
    if (!dd) return;
    if (dd.hidden) openThemeDropdown();
    else closeThemeDropdown();
  }

  function applyBgColor(color) {
    if (color) {
      if (window.G123_bgPalette) window.G123_bgPalette.apply(color);
    } else if (window.G123_bgPalette) {
      window.G123_bgPalette.clear();
    }
  }

  function initTheme() {
    applyTheme(getThemeMode());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (getThemeMode() === 'system') applyTheme('system');
    });
    var trigger = $('#themeTrigger');
    if (trigger) trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleThemeDropdown();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.theme-select-wrap')) closeThemeDropdown();
    });
  }

  function initBg() {
    applyBgColor(localStorage.getItem(STORAGE_BG));
  }

  function initSubmitForm() {
    var form = $('#submitForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.toolName.value.trim();
      var url = form.toolUrl.value.trim();
      var cat = form.toolCat.value;
      var desc = form.toolDesc.value.trim();
      var email = form.contactEmail.value.trim();
      if (!name || !url) {
        showFormMsg('请填写工具名称和网址。', true);
        return;
      }
      try { new URL(url); } catch (err) {
        showFormMsg('请填写有效的网址（需包含 https://）。', true);
        return;
      }
      var body = [
        '工具名称：' + name,
        '工具网址：' + url,
        '推荐分类：' + cat,
        desc ? '简介：' + desc : '',
        email ? '联系邮箱：' + email : '',
        '',
        '—— 来自 G123 AI 工具导航提交页',
      ].filter(Boolean).join('\n');
      var mailto = 'mailto:nav@g123.cn?subject=' + encodeURIComponent('【工具提交】' + name) + '&body=' + encodeURIComponent(body);
      window.location.href = mailto;
      showFormMsg('已为你打开邮件客户端。若未弹出，请直接写信至 nav@g123.cn。', false);
    });
  }

  function showFormMsg(text, isError) {
    var el = $('#formMsg');
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg' + (isError ? ' is-error' : ' is-ok');
    el.hidden = false;
  }

  initTheme();
  initBg();
  initSubmitForm();
})();
