(function () {
  'use strict';

  var STORAGE_FAV = 'g123_favorites';
  var STORAGE_THEME = 'g123-theme';
  var STORAGE_ENGINE = 'g123_engine';
  var STORAGE_CAT = 'g123_cat';
  var STORAGE_BG = 'g123_bg';
  var STORAGE_RECENT = 'g123_recent';
  var MAX_RECENT = 8;

  var BG_PRESETS = [
    { id: 'default', color: null },
    { id: 'gray', color: '#f7f7f5' },
    { id: 'white', color: '#ffffff' },
    { id: 'cool', color: '#f0f4f8' },
    { id: 'warm', color: '#faf5ef' },
    { id: 'mint', color: '#eef6f0' },
    { id: 'dark', color: '#1a1a1a' },
    { id: 'slate', color: '#0f172a' },
    { id: 'lavender', color: '#f3f0ff' },
    { id: 'sky', color: '#eff6ff' },
    { id: 'rose', color: '#fff1f2' },
    { id: 'charcoal', color: '#2c2c2c' },
  ];

  var SEARCH_ENGINES = [
    { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={query}', domain: 'baidu.com' },
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', domain: 'google.com' },
    { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q={query}', domain: 'bing.com' },
    { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query={query}', domain: 'sogou.com' },
    { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/search?q={query}', domain: 'perplexity.ai' },
  ];

  var FUN_HINTS = [
    { emoji: '🎲', text: '点击 G123，随机探索一个 AI 工具' },
    { emoji: '⌨️', text: '⌘K / Ctrl+K 聚焦搜索 · Esc 关闭弹层' },
    { emoji: '⭐', text: '分类工具悬停右上角星标，一键加入收藏' },
    { emoji: '⭐', text: '收藏常用网址，打造你的专属导航' },
    { emoji: '📥', text: '支持导入浏览器书签，设置里可导出备份' },
    { emoji: '🔗', text: '分享分类链接，如 #cat=video 直达视频类' },
    { emoji: '🔍', text: '切换搜索引擎：百度 · 必应 · Google' },
    { emoji: '🗂️', text: '精选、写作、绘画、视频等 12 类一站分类' },
    { emoji: '🔒', text: '数据保存在本地，无需登录即可使用' },
    { emoji: '✋', text: '拖拽排序收藏，三点菜单可修改删除' },
  ];

  var CATEGORIES = window.G123_CATEGORIES || [];

  var state = {
    favorites: [],
    engine: 'baidu',
    activeCat: 'featured',
    dragMoved: false,
    editingIndex: null,
    favSortMode: false,
  };

  var favDrag = {
    el: null,
    placeholder: null,
    fromIndex: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    active: false,
    pending: false,
    offsetX: 0,
    offsetY: 0,
    phRaf: 0,
    lastX: 0,
    lastY: 0,
  };

  function $(sel) { return document.querySelector(sel); }

  function favicon(url) {
    return 'https://t3.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=' + encodeURIComponent(url);
  }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }

  function hostPath(url) {
    try {
      var u = new URL(url);
      return u.hostname + (u.pathname.replace(/\/+$/, '') || '/');
    } catch (e) { return url; }
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function allFunLinks() {
    var links = [];
    CATEGORIES.forEach(function (c) { links = links.concat(c.links); });
    return links;
  }

  function randomFunLink() {
    var links = allFunLinks();
    return links[Math.floor(Math.random() * links.length)];
  }

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

  function renderThemeDropdown() {
    var dd = $('#themeDropdown');
    var mode = getThemeMode();
    dd.innerHTML = '';
    THEME_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-option' + (mode === opt.id ? ' active' : '');
      btn.setAttribute('role', 'option');
      btn.innerHTML = THEME_ICONS[opt.id] + '<span>' + opt.name + '</span>';
      btn.addEventListener('click', function () { selectTheme(opt.id); });
      dd.appendChild(btn);
    });
  }

  function closeThemeDropdown() {
    var dd = $('#themeDropdown');
    var trigger = $('#themeTrigger');
    if (!dd || dd.hidden) return;
    dd.hidden = true;
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openThemeDropdown() {
    renderThemeDropdown();
    var dd = $('#themeDropdown');
    var trigger = $('#themeTrigger');
    dd.hidden = false;
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function toggleThemeDropdown() {
    var dd = $('#themeDropdown');
    if (dd.hidden) openThemeDropdown();
    else closeThemeDropdown();
  }

  function selectTheme(id) {
    localStorage.setItem(STORAGE_THEME, id);
    applyTheme(id);
    closeThemeDropdown();
  }

  function applyTheme(mode) {
    document.body.classList.toggle('dark', resolveDark(mode));
    updateThemeBtnUI(mode);
    var savedBg = getSavedBgColor();
    if (savedBg && window.G123_bgPalette) window.G123_bgPalette.apply(savedBg);
  }

  function initTheme() {
    applyTheme(getThemeMode());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (getThemeMode() === 'system') applyTheme('system');
    });
  }

  function applyBgColor(color) {
    if (color) {
      if (window.G123_bgPalette) window.G123_bgPalette.apply(color);
      localStorage.setItem(STORAGE_BG, color);
    } else {
      if (window.G123_bgPalette) window.G123_bgPalette.clear();
      localStorage.removeItem(STORAGE_BG);
    }
    syncBgUI(color);
  }

  function getSavedBgColor() {
    return localStorage.getItem(STORAGE_BG);
  }

  function syncBgUI(color) {
    var presets = $('#bgPresets');
    if (!presets) return;
    var activeId = null;
    if (!color) {
      activeId = 'default';
    } else {
      var match = BG_PRESETS.find(function (p) { return p.color === color; });
      activeId = match ? match.id : null;
    }
    presets.querySelectorAll('.bg-preset').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.id === activeId);
    });
    var picker = $('#bgColorPicker');
    if (picker && color) picker.value = color;
  }

  function initBg() {
    applyBgColor(getSavedBgColor());
  }

  function renderBgPresets() {
    var wrap = $('#bgPresets');
    wrap.innerHTML = '';
    BG_PRESETS.forEach(function (preset) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bg-preset' + (preset.id === 'default' ? ' bg-preset--default' : '');
      btn.dataset.id = preset.id;
      btn.title = preset.id === 'default' ? '默认' : preset.color;
      if (preset.color) btn.style.background = preset.color;
      btn.addEventListener('click', function () {
        applyBgColor(preset.color);
      });
      wrap.appendChild(btn);
    });
  }

  function openSettingsModal() {
    syncBgUI(getSavedBgColor());
    $('#settingsModal').classList.add('show');
  }

  function closeSettingsModal() {
    $('#settingsModal').classList.remove('show');
  }

  function loadFavorites() {
    var stored = loadJSON(STORAGE_FAV, null);
    state.favorites = Array.isArray(stored) ? stored : [];
  }

  function getDefaultFavorites() {
    var list = window.G123_DEFAULT_FAVORITES;
    return Array.isArray(list) ? list.slice() : [];
  }

  function isUsingDefaultFavorites() {
    return state.favorites.length === 0;
  }

  function getLauncherFavorites() {
    return isUsingDefaultFavorites() ? getDefaultFavorites() : state.favorites;
  }

  /** 默认收藏展示中，首次删除/拖拽时复制为可编辑列表 */
  function ensureEditableFavorites() {
    if (isUsingDefaultFavorites()) {
      state.favorites = getDefaultFavorites();
    }
  }

  function saveFavorites() {
    saveJSON(STORAGE_FAV, state.favorites);
  }

  var FAV_STAR_OUTLINE =
    '<svg class="cat-add-fav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' +
    '</svg>';

  var FAV_STAR_FILLED =
    '<svg class="cat-add-fav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' +
    '</svg>';

  function isFavorited(url) {
    var key = hostPath(url);
    return getLauncherFavorites().some(function (f) { return hostPath(f.url) === key; });
  }

  function updateCatFavBtn(btn, url) {
    var favorited = isFavorited(url);
    btn.innerHTML = favorited ? FAV_STAR_FILLED : FAV_STAR_OUTLINE;
    btn.classList.toggle('is-favorited', favorited);
    btn.setAttribute('aria-label', favorited ? '已收藏' : '加入收藏');
    btn.title = favorited ? '已收藏' : '加入收藏';
  }

  function refreshCatFavButtons() {
    document.querySelectorAll('.cat-add-fav').forEach(function (btn) {
      var url = btn.dataset.url;
      if (url) updateCatFavBtn(btn, url);
    });
  }

  function addToFavorites(item) {
    ensureEditableFavorites();
    var url = item.url;
    if (!/^https?:\/\//i.test(url)) return false;
    var key = hostPath(url);
    if (state.favorites.some(function (f) { return hostPath(f.url) === key; })) {
      toast('已在收藏中');
      return false;
    }
    state.favorites.push({ name: item.name, url: url });
    saveFavorites();
    renderLauncher();
    toast('已加入收藏');
    return true;
  }

  function loadRecent() {
    var list = loadJSON(STORAGE_RECENT, []);
    return Array.isArray(list) ? list : [];
  }

  function saveRecentList(list) {
    saveJSON(STORAGE_RECENT, list);
  }

  function recordRecent(item) {
    if (!item || !item.url) return;
    var key = hostPath(item.url);
    var list = loadRecent().filter(function (r) { return hostPath(r.url) !== key; });
    list.unshift({ name: item.name, url: item.url });
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    saveRecentList(list);
    renderRecent();
  }

  function clearRecent() {
    saveRecentList([]);
    renderRecent();
    toast('已清除历史记录');
  }

  function renderRecent() {
    var section = $('#recentSection');
    var list = $('#recentList');
    if (!section || !list) return;
    var items = loadRecent();
    if (!items.length) {
      section.hidden = true;
      list.innerHTML = '';
      return;
    }
    section.hidden = false;
    list.innerHTML = '';
    items.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'recent-item';
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'nofollow noopener noreferrer';
      a.title = item.name;
      a.innerHTML =
        '<img src="' + favicon(item.url) + '" alt="" loading="lazy" draggable="false">' +
        '<span>' + escapeHtml(item.name) + '</span>';
      a.addEventListener('click', function () {
        recordRecent(item);
      });
      list.appendChild(a);
    });
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
  }

  function exportFavoritesJSON() {
    var items = getLauncherFavorites();
    if (!items.length) { toast('暂无收藏可导出'); return; }
    var blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, 'g123-favorites.json');
    toast('已导出 JSON');
  }

  function exportFavoritesHTML() {
    var items = getLauncherFavorites();
    if (!items.length) { toast('暂无收藏可导出'); return; }
    var lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<meta charset="UTF-8">',
      '<title>G123 Favorites</title>',
      '<h1>Bookmarks</h1>',
      '<dl><dt><h3>G123 收藏</h3><dl>',
    ];
    items.forEach(function (f) {
      lines.push('<dt><a href="' + escapeAttr(f.url) + '">' + escapeHtml(f.name) + '</a>');
    });
    lines.push('</dl></dl>');
    var blob = new Blob([lines.join('\n')], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, 'g123-favorites.html');
    toast('已导出 HTML');
  }

  function parseCatFromHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    var m = raw.match(/^cat=([a-z0-9_-]+)$/i);
    if (!m) return null;
    return CATEGORIES.some(function (c) { return c.id === m[1]; }) ? m[1] : null;
  }

  function setCatHash(catId) {
    var next = '#cat=' + catId;
    if (location.hash === next) return;
    history.replaceState(null, '', location.pathname + location.search + next);
  }

  function initCatState() {
    var hashCat = parseCatFromHash();
    if (hashCat) {
      state.activeCat = hashCat;
      localStorage.setItem(STORAGE_CAT, hashCat);
      return;
    }
    state.activeCat = localStorage.getItem(STORAGE_CAT) || 'featured';
    if (!CATEGORIES.some(function (c) { return c.id === state.activeCat; })) {
      state.activeCat = CATEGORIES[0].id;
    }
  }

  function applyCatFromHash() {
    var id = parseCatFromHash();
    if (!id || id === state.activeCat) return;
    state.activeCat = id;
    localStorage.setItem(STORAGE_CAT, id);
    renderCatTabs();
    renderCatLinks();
  }

  function selectCategory(catId) {
    state.activeCat = catId;
    localStorage.setItem(STORAGE_CAT, catId);
    setCatHash(catId);
    renderCatTabs();
    renderCatLinks();
  }

  function getEngine(id) {
    return SEARCH_ENGINES.find(function (x) { return x.id === id; }) || SEARCH_ENGINES[0];
  }

  function engineFavicon(domain) {
    return favicon('https://' + domain);
  }

  function updateSearchPlaceholder() {
    var eng = getEngine(state.engine);
    $('#searchInput').placeholder = '使用 ' + eng.name + ' 搜索';
  }

  function closeEngineDropdown() {
    var dd = $('#engineDropdown');
    var trigger = $('#engineTrigger');
    if (!dd || dd.hidden) return;
    dd.hidden = true;
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openEngineDropdown() {
    var dd = $('#engineDropdown');
    var trigger = $('#engineTrigger');
    dd.hidden = false;
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function toggleEngineDropdown() {
    var dd = $('#engineDropdown');
    if (dd.hidden) openEngineDropdown();
    else closeEngineDropdown();
  }

  function selectEngine(id) {
    state.engine = id;
    localStorage.setItem(STORAGE_ENGINE, id);
    renderEngineSelector();
    closeEngineDropdown();
    updateSearchPlaceholder();
  }

  function renderEngineSelector() {
    var eng = getEngine(state.engine);
    $('#engineIcon').src = engineFavicon(eng.domain);
    $('#engineIcon').alt = eng.name;
    $('#engineName').textContent = eng.name;

    var dd = $('#engineDropdown');
    dd.innerHTML = '';
    SEARCH_ENGINES.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'engine-option' + (state.engine === item.id ? ' active' : '');
      btn.setAttribute('role', 'option');
      btn.innerHTML = '<img src="' + engineFavicon(item.domain) + '" alt="">' + escapeHtml(item.name);
      btn.addEventListener('click', function () { selectEngine(item.id); });
      dd.appendChild(btn);
    });
  }

  function createLinkItem(item, opts) {
    opts = opts || {};
    var el = document.createElement('a');
    el.className = 'link-item';
    if (opts.catLayout) el.classList.add('link-item--cat');
    el.href = item.url;
    el.target = '_blank';
    el.rel = 'nofollow noopener noreferrer';
    el.innerHTML =
      '<img class="icon" src="' + favicon(item.url) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" draggable="false">' +
      '<span class="label">' + escapeHtml(item.name) + '</span>';

    if (opts.showDesc && item.desc) {
      el.classList.add('link-item--has-desc');
      el.setAttribute('data-desc', item.desc);
    }

    if (opts.deletable) {
      el.classList.add('link-item--draggable');
      el.draggable = false;
      el.dataset.index = String(opts.index);
      el.addEventListener('pointerdown', onFavPointerDown);
      el.addEventListener('click', onFavoriteClick);

      var menuWrap = document.createElement('div');
      menuWrap.className = 'fav-menu-wrap';

      var menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'fav-menu-btn';
      menuBtn.setAttribute('aria-label', '更多操作');
      menuBtn.setAttribute('aria-haspopup', 'menu');
      menuBtn.innerHTML = '<svg class="fav-menu-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="19" r="2.2" fill="currentColor"/></svg>';

      var menu = document.createElement('div');
      menu.className = 'fav-menu';
      menu.hidden = true;
      menu.setAttribute('role', 'menu');

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'fav-menu-item';
      editBtn.setAttribute('role', 'menuitem');
      editBtn.textContent = '修改';

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'fav-menu-item fav-menu-item--danger';
      deleteBtn.setAttribute('role', 'menuitem');
      deleteBtn.textContent = '删除';

      menu.appendChild(editBtn);
      menu.appendChild(deleteBtn);
      menuWrap.appendChild(menuBtn);
      menuWrap.appendChild(menu);

      var favIndex = opts.index;

      function closeMenu() {
        menu.hidden = true;
        menuBtn.setAttribute('aria-expanded', 'false');
        menuWrap.classList.remove('is-open');
      }

      menuWrap.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var willOpen = menu.hidden;
        closeAllFavMenus();
        if (willOpen) {
          menu.hidden = false;
          menuBtn.setAttribute('aria-expanded', 'true');
          menuWrap.classList.add('is-open');
        }
      });
      editBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        openEditModal(favIndex);
      });
      deleteBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        deleteFavoriteAt(favIndex);
      });

      el.appendChild(menuWrap);
    }

    if (opts.catAddFav) {
      var addFavBtn = document.createElement('button');
      addFavBtn.type = 'button';
      addFavBtn.className = 'cat-add-fav';
      addFavBtn.dataset.url = item.url;
      updateCatFavBtn(addFavBtn, item.url);
      addFavBtn.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
      addFavBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (isFavorited(item.url)) {
          toast('已在收藏中');
          return;
        }
        addToFavorites({ name: item.name, url: item.url });
      });
      el.appendChild(addFavBtn);
    }

    if (opts.trackRecent) {
      el.addEventListener('click', function () {
        if (opts.deletable && state.dragMoved) return;
        recordRecent({ name: item.name, url: item.url });
      });
    }

    return el;
  }

  function onFavoriteClick(e) {
    if (state.dragMoved) {
      e.preventDefault();
    }
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 859px)').matches;
  }

  function isFavDragAllowed() {
    return !isMobileViewport() || state.favSortMode;
  }

  function updateFavSortUI() {
    var btn = $('#favSortBtn');
    if (!btn) return;
    var on = state.favSortMode && isMobileViewport();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '完成' : '排序';
    document.body.classList.toggle('is-fav-sort-mode', on);
  }

  function setFavSortMode(on) {
    if (state.favSortMode === on) return;
    state.favSortMode = on;
    if (!on) {
      cleanupFavDragDom();
      resetFavDrag();
      state.dragMoved = false;
    }
    updateFavSortUI();
    if (on) toast('按住拖动可调整顺序');
  }

  function toggleFavSortMode() {
    setFavSortMode(!state.favSortMode);
  }

  function onFavViewportChange() {
    if (!isMobileViewport() && state.favSortMode) {
      state.favSortMode = false;
      cleanupFavDragDom();
      resetFavDrag();
      state.dragMoved = false;
    }
    updateFavSortUI();
  }

  function resetFavDrag() {
    favDrag.el = null;
    favDrag.placeholder = null;
    favDrag.fromIndex = null;
    favDrag.pointerId = null;
    favDrag.startX = 0;
    favDrag.startY = 0;
    favDrag.active = false;
    favDrag.pending = false;
    favDrag.offsetX = 0;
    favDrag.offsetY = 0;
    favDrag.phRaf = 0;
  }

  function cleanupFavDragDom() {
    if (favDrag.placeholder && favDrag.placeholder.parentNode) {
      favDrag.placeholder.parentNode.removeChild(favDrag.placeholder);
    }
    if (favDrag.el) {
      favDrag.el.classList.remove('is-dragging');
      favDrag.el.style.width = '';
      favDrag.el.style.height = '';
      favDrag.el.style.left = '';
      favDrag.el.style.top = '';
    }
    document.body.classList.remove('is-fav-dragging');
  }

  function startFavDrag() {
    ensureEditableFavorites();
    favDrag.active = true;
    favDrag.pending = false;
    state.dragMoved = true;
    closeAllFavMenus();

    var el = favDrag.el;
    var rect = el.getBoundingClientRect();
    var grid = $('#launcherGrid');

    var ph = document.createElement('div');
    ph.className = 'link-item link-item-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.style.width = rect.width + 'px';
    ph.style.height = rect.height + 'px';
    favDrag.placeholder = ph;
    grid.insertBefore(ph, el);

    el.classList.add('is-dragging');
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    document.body.classList.add('is-fav-dragging');
  }

  function updateFavDragPosition(clientX, clientY) {
    var el = favDrag.el;
    if (!el) return;
    el.style.left = (clientX - favDrag.offsetX) + 'px';
    el.style.top = (clientY - favDrag.offsetY) + 'px';
  }

  function updateFavPlaceholder(clientX, clientY) {
    var grid = $('#launcherGrid');
    var ph = favDrag.placeholder;
    if (!grid || !ph) return;

    var addBtn = grid.querySelector('.link-item--add');
    var items = Array.prototype.slice.call(
      grid.querySelectorAll('.link-item--draggable:not(.is-dragging)')
    ).filter(function (item) { return item !== ph; });

    var insertBefore = addBtn;
    for (var i = 0; i < items.length; i++) {
      var rect = items[i].getBoundingClientRect();
      var midX = rect.left + rect.width / 2;
      var midY = rect.top + rect.height / 2;
      if (clientY < midY || (clientY <= rect.bottom && clientX < midX)) {
        insertBefore = items[i];
        break;
      }
      insertBefore = items[i].nextElementSibling || addBtn;
    }

    if (!insertBefore) return;
    if (ph.nextElementSibling === insertBefore) return;
    grid.insertBefore(ph, insertBefore);
  }

  function getFavPlaceholderIndex() {
    var grid = $('#launcherGrid');
    var ph = favDrag.placeholder;
    if (!grid || !ph) return favDrag.fromIndex;
    var index = 0;
    for (var i = 0; i < grid.children.length; i++) {
      var child = grid.children[i];
      if (child === ph) return index;
      if (child.classList.contains('link-item--draggable') && !child.classList.contains('is-dragging')) {
        index++;
      }
    }
    return index;
  }

  function onFavPointerDown(e) {
    if (!isFavDragAllowed()) return;
    if (e.button !== 0) return;
    if (e.target.closest('.fav-menu-wrap')) return;

    var el = e.currentTarget;
    var rect = el.getBoundingClientRect();
    favDrag.pending = true;
    favDrag.active = false;
    favDrag.el = el;
    favDrag.fromIndex = parseInt(el.dataset.index, 10);
    favDrag.pointerId = e.pointerId;
    favDrag.startX = e.clientX;
    favDrag.startY = e.clientY;
    favDrag.offsetX = e.clientX - rect.left;
    favDrag.offsetY = e.clientY - rect.top;
    state.dragMoved = false;

    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);

    document.addEventListener('pointermove', onFavPointerMove);
    document.addEventListener('pointerup', onFavPointerUp);
    document.addEventListener('pointercancel', onFavPointerUp);
  }

  function onFavPointerMove(e) {
    if (e.pointerId !== favDrag.pointerId) return;

    if (favDrag.pending && !favDrag.active) {
      var dx = e.clientX - favDrag.startX;
      var dy = e.clientY - favDrag.startY;
      if (Math.hypot(dx, dy) < 6) return;
      startFavDrag();
    }
    if (!favDrag.active) return;

    e.preventDefault();
    updateFavDragPosition(e.clientX, e.clientY);
    favDrag.lastX = e.clientX;
    favDrag.lastY = e.clientY;
    if (favDrag.phRaf) return;
    favDrag.phRaf = requestAnimationFrame(function () {
      favDrag.phRaf = 0;
      updateFavPlaceholder(favDrag.lastX, favDrag.lastY);
    });
  }

  function onFavPointerUp(e) {
    if (e.pointerId !== favDrag.pointerId) return;

    if (favDrag.el && favDrag.el.releasePointerCapture) {
      try { favDrag.el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    document.removeEventListener('pointermove', onFavPointerMove);
    document.removeEventListener('pointerup', onFavPointerUp);
    document.removeEventListener('pointercancel', onFavPointerUp);

    if (favDrag.active) {
      e.preventDefault();
      ensureEditableFavorites();
      var fromIndex = favDrag.fromIndex;
      var toIndex = getFavPlaceholderIndex();
      if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
        var moved = state.favorites.splice(fromIndex, 1)[0];
        state.favorites.splice(toIndex, 0, moved);
        saveFavorites();
      }
      cleanupFavDragDom();
      renderLauncher();
    } else {
      state.dragMoved = false;
    }

    resetFavDrag();
  }

  function renderLauncher() {
    var grid = $('#launcherGrid');
    grid.innerHTML = '';
    getLauncherFavorites().forEach(function (item, index) {
      grid.appendChild(createLinkItem(item, { deletable: true, index: index, trackRecent: true }));
    });
    var add = document.createElement('div');
    add.className = 'link-item link-item--add';
    add.innerHTML = '<div class="icon-placeholder">+</div><span class="label">添加</span>';
    add.addEventListener('click', openAddModal);
    grid.appendChild(add);
    refreshCatFavButtons();
  }

  function renderCatTabs() {
    var wrap = $('#catTabs');
    wrap.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-tab' + (state.activeCat === cat.id ? ' active' : '');
      btn.textContent = cat.name;
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', function () {
        selectCategory(cat.id);
      });
      wrap.appendChild(btn);
    });
  }

  function renderCatLinks() {
    var grid = $('#catLinks');
    grid.innerHTML = '';
    var cat = CATEGORIES.find(function (c) { return c.id === state.activeCat; });
    if (!cat) return;
    cat.links.forEach(function (link) {
      grid.appendChild(createLinkItem(link, {
        showDesc: true,
        catLayout: true,
        catAddFav: true,
        trackRecent: true,
      }));
    });
  }

  function onResize() {
    onFavViewportChange();
    renderCatLinks();
  }

  var hintTimer = null;
  var lastHintIndex = -1;

  function pickHintIndex() {
    if (FUN_HINTS.length <= 1) return 0;
    var idx;
    do {
      idx = Math.floor(Math.random() * FUN_HINTS.length);
    } while (idx === lastHintIndex);
    lastHintIndex = idx;
    return idx;
  }

  function renderHint(el, hint) {
    el.innerHTML =
      '<span class="top-hint-emoji" aria-hidden="true">' + hint.emoji + '</span>' +
      '<span class="top-hint-text">' + escapeHtml(hint.text) + '</span>';
  }

  function rotateHint() {
    var el = $('#topHint');
    if (!el) return;
    var next = FUN_HINTS[pickHintIndex()];
    el.classList.add('is-fading');
    setTimeout(function () {
      renderHint(el, next);
      el.classList.remove('is-fading');
    }, 350);
  }

  function startHintRotation() {
    if (hintTimer) clearInterval(hintTimer);
    hintTimer = setInterval(rotateHint, 6000);
  }

  function openAddModal() {
    $('#addName').value = '';
    $('#addUrl').value = '';
    $('#addModal').classList.add('show');
    setTimeout(function () { $('#addName').focus(); }, 80);
  }

  function closeAddModal() {
    $('#addModal').classList.remove('show');
  }

  function closeAllFavMenus() {
    document.querySelectorAll('.fav-menu-wrap.is-open').forEach(function (wrap) {
      var menu = wrap.querySelector('.fav-menu');
      var btn = wrap.querySelector('.fav-menu-btn');
      if (menu) menu.hidden = true;
      if (btn) btn.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('is-open');
    });
  }

  function openEditModal(index) {
    ensureEditableFavorites();
    var item = state.favorites[index];
    if (!item) return;
    state.editingIndex = index;
    $('#editName').value = item.name;
    $('#editUrl').value = item.url;
    $('#editModal').classList.add('show');
    setTimeout(function () { $('#editName').focus(); }, 80);
  }

  function closeEditModal() {
    $('#editModal').classList.remove('show');
    state.editingIndex = null;
  }

  function saveEditFavorite() {
    var idx = state.editingIndex;
    if (idx == null || idx < 0) return;
    var name = $('#editName').value.trim();
    var url = $('#editUrl').value.trim();
    if (!name || !url) { toast('请填写名称和链接'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch (e) { toast('链接格式不正确'); return; }
    var newKey = hostPath(url);
    var dup = state.favorites.findIndex(function (f, i) {
      return i !== idx && hostPath(f.url) === newKey;
    });
    if (dup >= 0) { toast('该链接已存在'); return; }
    state.favorites[idx] = { name: name, url: url };
    saveFavorites();
    renderLauncher();
    closeEditModal();
    toast('已保存');
  }

  function deleteFavoriteAt(index) {
    ensureEditableFavorites();
    if (index < 0 || index >= state.favorites.length) return;
    state.favorites.splice(index, 1);
    saveFavorites();
    renderLauncher();
    toast('已删除');
  }

  function addFavorite() {
    var name = $('#addName').value.trim();
    var url = $('#addUrl').value.trim();
    if (!name || !url) { toast('请填写名称和链接'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch (e) { toast('链接格式不正确'); return; }
    ensureEditableFavorites();
    if (state.favorites.some(function (f) { return hostPath(f.url) === hostPath(url); })) {
      toast('该链接已存在'); return;
    }
    state.favorites.push({ name: name, url: url });
    saveFavorites();
    renderLauncher();
    closeAddModal();
    toast('添加成功');
  }

  function parseBookmarksHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = [];
    var seen = {};
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').trim();
      if (!/^https?:\/\//i.test(href)) return;
      var name = (a.textContent || '').trim();
      if (!name) { try { name = new URL(href).hostname; } catch (e) { return; } }
      var key = hostPath(href);
      if (seen[key]) return;
      seen[key] = true;
      out.push({ name: name, url: href });
    });
    return out;
  }

  function normalizeBookmarkItem(item) {
    if (!item || typeof item !== 'object') return null;
    var url = String(item.url || item.link || item.href || '').trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) {
      if (/^\/\//.test(url)) url = 'https:' + url;
      else return null;
    }
    var name = String(item.name || item.title || item.text || '').trim();
    if (!name) {
      try { name = new URL(url).hostname; } catch (e) { return null; }
    }
    return { name: name, url: url };
  }

  function parseBookmarksJson(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    var items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === 'object') {
      ['favorites', 'bookmarks', 'items', 'links'].some(function (key) {
        if (Array.isArray(data[key])) {
          items = data[key];
          return true;
        }
        return false;
      });
    }
    var out = [];
    var seen = {};
    items.forEach(function (item) {
      var normalized = normalizeBookmarkItem(item);
      if (!normalized) return;
      var key = hostPath(normalized.url);
      if (seen[key]) return;
      seen[key] = true;
      out.push(normalized);
    });
    return out;
  }

  function parseImportFile(content, filename) {
    var name = (filename || '').toLowerCase();
    var tryJson = name.endsWith('.json') || /^\s*[\[{]/.test(content);
    if (tryJson) {
      var fromJson = parseBookmarksJson(content);
      if (fromJson.length || name.endsWith('.json')) return fromJson;
    }
    return parseBookmarksHtml(content);
  }

  function mergeImportedBookmarks(imported) {
    if (!imported.length) { toast('未找到有效书签'); return; }
    ensureEditableFavorites();
    var added = 0;
    imported.forEach(function (item) {
      if (!state.favorites.some(function (f) { return hostPath(f.url) === hostPath(item.url); })) {
        state.favorites.push(item);
        added++;
      }
    });
    if (added) {
      saveFavorites();
      renderLauncher();
      closeAddModal();
      toast('已导入 ' + added + ' 个');
    } else {
      toast('没有新书签');
    }
  }

  function importBookmarks(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      mergeImportedBookmarks(parseImportFile(reader.result, file.name));
    };
    reader.readAsText(file);
  }

  function handleBrandRandom(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    var pick = randomFunLink();
    recordRecent(pick);
    window.open(pick.url, '_blank');
    toast('随机打开：' + pick.name);
  }

  function handleSearch(e) {
    e.preventDefault();
    var q = $('#searchInput').value.trim();
    if (!q) {
      var input = $('#searchInput');
      if (input) input.focus();
      toast('请输入关键词');
      return;
    }
    var eng = SEARCH_ENGINES.find(function (x) { return x.id === state.engine; }) || SEARCH_ENGINES[0];
    window.open(eng.url.replace('{query}', encodeURIComponent(q)), '_blank');
  }

  function bindEvents() {
    var brandRandom = $('#brandRandom');
    if (brandRandom) brandRandom.addEventListener('click', handleBrandRandom);
    $('#searchForm').addEventListener('submit', handleSearch);
    $('#engineTrigger').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleEngineDropdown();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.engine-select-wrap')) closeEngineDropdown();
      if (!e.target.closest('.theme-select-wrap')) closeThemeDropdown();
      if (!e.target.closest('.fav-menu-wrap')) closeAllFavMenus();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        var input = $('#searchInput');
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }
      if (e.key === 'Escape') {
        closeEngineDropdown();
        closeThemeDropdown();
        closeAddModal();
        closeEditModal();
        closeSettingsModal();
        closeAllFavMenus();
        if (state.favSortMode) setFavSortMode(false);
      }
    });
    $('#themeTrigger').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleThemeDropdown();
    });
    $('#settingsBtn').addEventListener('click', openSettingsModal);
    $('#settingsClose').addEventListener('click', closeSettingsModal);
    $('#bgReset').addEventListener('click', function () { applyBgColor(null); });
    $('#bgColorPicker').addEventListener('input', function (e) {
      applyBgColor(e.target.value);
    });
    $('#settingsModal').addEventListener('click', function (e) {
      if (e.target === $('#settingsModal')) closeSettingsModal();
    });
    $('#exportJsonBtn').addEventListener('click', exportFavoritesJSON);
    $('#exportHtmlBtn').addEventListener('click', exportFavoritesHTML);
    $('#recentClear').addEventListener('click', clearRecent);
    $('#importBtn').addEventListener('click', function () { $('#bookmarkFile').click(); });
    $('#bookmarkFile').addEventListener('change', function (e) {
      importBookmarks(e.target.files[0]);
      e.target.value = '';
    });
    $('#addCancel').addEventListener('click', closeAddModal);
    $('#addConfirm').addEventListener('click', addFavorite);
    $('#addModal').addEventListener('click', function (e) {
      if (e.target === $('#addModal')) closeAddModal();
    });
    $('#editCancel').addEventListener('click', closeEditModal);
    $('#editConfirm').addEventListener('click', saveEditFavorite);
    $('#editModal').addEventListener('click', function (e) {
      if (e.target === $('#editModal')) closeEditModal();
    });
    var favSortBtn = $('#favSortBtn');
    if (favSortBtn) favSortBtn.addEventListener('click', toggleFavSortMode);
  }

  function init() {
    state.engine = localStorage.getItem(STORAGE_ENGINE) || 'baidu';
    initCatState();
    initTheme();
    renderBgPresets();
    initBg();
    loadFavorites();
    renderEngineSelector();
    updateSearchPlaceholder();
    renderLauncher();
    renderCatTabs();
    renderCatLinks();
    renderRecent();
    startHintRotation();
    bindEvents();
    updateFavSortUI();
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', applyCatFromHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
