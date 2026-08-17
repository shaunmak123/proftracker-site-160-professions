// Общая клиентская логика сайта: поиск, закладки/история, шаринг.
// Без зависимостей, без сборки — грузится как обычный <script> на каждой странице.
(function (global) {
  'use strict';

  var DATA_URL = (window.SITE_ROOT || '') + 'data/professions.json';
  var BOOKMARKS_KEY = 'proftreker:bookmarks';
  var RECENT_KEY = 'proftreker:recent';
  var MYCARD_KEY = 'proftreker:mycard';
  var RECENT_MAX = 20;

  var dataPromise = null;
  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL).then(function (r) { return r.json(); });
    }
    return dataPromise;
  }

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .trim();
  }

  // Расстояние Левенштейна, обрезанное сверху — не считаем дальше maxDist+1.
  function levenshtein(a, b, maxDist) {
    if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
    var m = a.length, n = b.length;
    var prev = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      var cur = new Array(n + 1);
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[n];
  }

  // Ищет профессии по названию: точная подстрока — выше, нечёткое совпадение
  // первых слов (расстояние Левенштейна ≤2) — ниже. Возвращает до `limit` штук.
  function searchProfessions(query, professions, limit) {
    var q = normalize(query);
    if (q.length < 2) return [];
    limit = limit || 6;
    var scored = [];
    for (var i = 0; i < professions.length; i++) {
      var p = professions[i];
      var name = normalize(p.name);
      var score = null;
      var idx = name.indexOf(q);
      if (idx === 0) score = 0;
      else if (idx > 0) score = 10 + idx;
      else {
        var words = name.split(/\s+/);
        var best = 99;
        for (var w = 0; w < words.length; w++) {
          var d = levenshtein(q, words[w].slice(0, q.length + 2), 2);
          if (d < best) best = d;
        }
        if (best <= 2) score = 100 + best * 10;
      }
      if (score !== null) scored.push({ p: p, score: score });
    }
    scored.sort(function (a, b) { return a.score - b.score || a.p.id - b.p.id; });
    return scored.slice(0, limit).map(function (s) { return s.p; });
  }

  function readList(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }
  function writeList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

  function readBookmarks() { return readList(BOOKMARKS_KEY); }
  function isBookmarked(slug) { return readBookmarks().indexOf(slug) !== -1; }
  function toggleBookmark(slug) {
    var list = readBookmarks();
    var i = list.indexOf(slug);
    if (i === -1) list.unshift(slug); else list.splice(i, 1);
    writeList(BOOKMARKS_KEY, list);
    return list.indexOf(slug) !== -1;
  }

  function readRecent() { return readList(RECENT_KEY); }
  function pushRecent(slug) {
    var list = readRecent().filter(function (s) { return s !== slug; });
    list.unshift(slug);
    if (list.length > RECENT_MAX) list = list.slice(0, RECENT_MAX);
    writeList(RECENT_KEY, list);
  }

  function getMyCard() { try { return localStorage.getItem(MYCARD_KEY) || null; } catch (e) { return null; } }
  function setMyCard(slug) { localStorage.setItem(MYCARD_KEY, slug); }

  async function share(title, url) {
    if (navigator.share) {
      try { await navigator.share({ title: title, url: url }); return 'shared'; }
      catch (e) { return 'cancelled'; }
    }
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch (e) { return 'failed'; }
  }

  // Подключает поиск с подсказками к <input> + контейнеру подсказок.
  // onPick(profession) вызывается при выборе через клик/Enter/стрелки.
  function initSearch(inputEl, listEl, onPick) {
    var items = [];
    var activeIndex = -1;
    var debounceTimer = null;

    function render(professions) {
      items = professions;
      activeIndex = -1;
      listEl.innerHTML = '';
      if (!professions.length) { listEl.hidden = true; return; }
      professions.forEach(function (p, i) {
        var row = document.createElement('div');
        row.className = 'suggest-row';
        row.setAttribute('role', 'option');
        row.id = 'suggest-' + i;
        row.innerHTML = '<span class="suggest-name">' + p.name + '</span><span class="suggest-industry">' + p.industry + '</span>';
        row.addEventListener('mousedown', function (e) { e.preventDefault(); onPick(p); });
        listEl.appendChild(row);
      });
      listEl.hidden = false;
    }

    function setActive(i) {
      var rows = listEl.querySelectorAll('.suggest-row');
      rows.forEach(function (r) { r.classList.remove('is-active'); });
      if (i >= 0 && rows[i]) {
        rows[i].classList.add('is-active');
        inputEl.setAttribute('aria-activedescendant', rows[i].id);
      } else {
        inputEl.removeAttribute('aria-activedescendant');
      }
      activeIndex = i;
    }

    inputEl.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = inputEl.value;
      debounceTimer = setTimeout(function () {
        loadData().then(function (data) {
          render(searchProfessions(q, data.professions));
        });
      }, 150);
    });

    inputEl.addEventListener('keydown', function (e) {
      if (listEl.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) onPick(items[activeIndex]);
        else if (items.length === 1) onPick(items[0]);
      } else if (e.key === 'Escape') { listEl.hidden = true; }
    });

    document.addEventListener('click', function (e) {
      if (!listEl.contains(e.target) && e.target !== inputEl) listEl.hidden = true;
    });
  }

  // Аккордеон отраслей на странице каталога.
  function initIndustryAccordion(container) {
    container.addEventListener('click', function (e) {
      var header = e.target.closest('.industry-header');
      if (!header) return;
      var item = header.closest('.industry-item');
      item.classList.toggle('is-open');
    });
  }

  global.ProfTrekerSite = {
    loadData: loadData,
    normalize: normalize,
    levenshtein: levenshtein,
    searchProfessions: searchProfessions,
    readBookmarks: readBookmarks,
    isBookmarked: isBookmarked,
    toggleBookmark: toggleBookmark,
    readRecent: readRecent,
    pushRecent: pushRecent,
    getMyCard: getMyCard,
    setMyCard: setMyCard,
    share: share,
    initSearch: initSearch,
    initIndustryAccordion: initIndustryAccordion
  };
})(window);
