// Генератор статических страниц профессий.
// Без npm-зависимостей: только встроенные модули Node. Запуск: node build.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'site', 'data', 'professions.json');
const OUT_DIR = path.join(ROOT, 'site', 'p');
const PHOTOS_DIR = path.join(ROOT, 'site', 'assets', 'img', 'photos');

function hasPhoto(slug) {
  return fs.existsSync(path.join(PHOTOS_DIR, `${slug}.png`));
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const bySlug = {};
data.professions.forEach((p) => { bySlug[p.slug] = p; });

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function tagList(text, cls) {
  if (!text) return '';
  return text
    .split(/[,;]\s*(?=[А-ЯA-Z])|\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => `<span class="tag ${cls}">${esc(t)}</span>`)
    .join('\n        ');
}

function similarLinks(similarNames) {
  return (similarNames || [])
    .map((name) => {
      const match = data.professions.find((p) => p.name === name);
      if (!match) return `<div class="similar-card">${esc(name)}</div>`;
      return `<a class="similar-card" href="${match.slug}.html" style="text-decoration:none;color:inherit">${esc(name)}</a>`;
    })
    .join('\n        ');
}

function renderPage(p) {
  const cardNum = String(p.id);
  const industryUpper = p.industry.toUpperCase();

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${esc(p.name)} — Электронный каталог профессий</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(p.name)}: чем занимается, сколько зарабатывает в регионе, где учиться и где работать.">
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="../page.css">
</head>
<body>

<div class="top-brand-bar">
  <img src="../assets/img/logo-dvizhenie-pervyh.svg" alt="Движение Первых · Гранты Первых" class="top-brand-logo">
  <img src="../assets/img/logo-proftracker.svg" alt="АНО «ПРОФТРЕКЕР»" class="top-brand-logo">
</div>

<header class="topbar">
  <button class="icon-btn" type="button" onclick="history.length>1?history.back():location.href='../catalog.html'" aria-label="Назад">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
  </button>
  <div class="crumb">КАРТА ${cardNum} · ${esc(industryUpper)}</div>
  <button class="icon-btn" type="button" id="bookmark-btn" aria-label="Отметить, чтобы вернуться" aria-pressed="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </button>
</header>

<main class="profession">

  <div class="profession-media">
    <figure class="blueprint profession-photo${hasPhoto(p.slug) ? ' has-photo' : ' duotone'}">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      ${hasPhoto(p.slug)
        ? `<img src="../assets/img/photos/${p.slug}.png" alt="Карточка профессии «${esc(p.name)}»" loading="lazy">`
        : `<div class="ph">фото профессии<br>с карточки колоды<br>(${esc(p.image || p.name + '.jpg')})</div>`}
    </figure>

    <div class="blueprint stat-grid">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <div class="stat">
        <div class="stat-label">Зарплата в регионе</div>
        <div class="stat-value" style="font-size:18px">${esc(p.salary)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Отрасль</div>
        <div class="stat-value" style="font-size:14px">${esc(p.industry)}</div>
      </div>
    </div>

    <button class="btn btn-primary btn-block blueprint desktop-cta" type="button" id="bookmark-btn-desktop">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      Отметить, чтобы вернуться
    </button>
  </div>

  <div class="profession-main">
    <h1 class="p-title">${esc(p.name)}</h1>
    <p class="p-short">${esc(p.short)}</p>

    <div class="sections">
      <div class="sec">
        <h6>Основной вид деятельности</h6>
        <p>${esc(p.activity)}</p>
      </div>

      <div class="sec">
        <h6>Что делает на рабочем месте</h6>
        <p>${esc(p.description)}</p>
      </div>

      <div class="sec span-2">
        <h6>Что производит</h6>
        <p>${esc(p.product)}</p>
      </div>

      <div class="sec span-2">
        <h6>Оборудование и инструменты</h6>
        <div class="equip-tags">
        ${tagList(p.equipment, 'tag-outline')}
        </div>
      </div>

      <div class="sec">
        <h6>Спецодежда и СИЗ</h6>
        <div class="wear-row clothing">
          <div class="ph">пиктограмма<br>одежды</div>
          <p>${esc(p.clothing)}</p>
        </div>
      </div>

      <div class="sec">
        <h6>Спецобувь</h6>
        <div class="wear-row footwear">
          <div class="ph">пиктограмма<br>обуви</div>
          <p>${esc(p.footwear)}</p>
        </div>
      </div>

      <div class="sec span-2">
        <h6>Где учиться</h6>
        <p>${esc(p.education)}</p>
      </div>

      <div class="sec span-2">
        <h6>Где работать</h6>
        <div class="employer-tags">
        ${tagList(p.employers, 'tag-accent')}
        </div>
      </div>

      <div class="sec span-2">
        <h6>Похожие профессии</h6>
        <div class="similar-rail">
        ${similarLinks(p.similar)}
        </div>
      </div>
    </div>

    <p class="data-note">Данные — карточка ${cardNum} из ${data.professions.length}, отрасль «${esc(p.industry)}». Зарплата — оценочная вилка по региону.</p>
  </div>

</main>

<div class="action-bar">
  <button class="btn btn-primary" type="button" id="bookmark-btn-mobile">Отметить, чтобы вернуться</button>
  <button class="btn btn-secondary btn-icon" type="button" id="share-btn" aria-label="Поделиться">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .05 3.9L8.91 11.6a3 3 0 1 0 0 4.8l6.14 3.7a3 3 0 1 0 .77-1.71L9.7 14.7a3 3 0 0 0 0-1.4l6.12-3.68A3 3 0 0 0 18 8Z"/></svg>
  </button>
</div>

<footer class="site-footer">
  <p class="footer-support">Проект реализуется при поддержке Общероссийского общественно-государственного движения детей и молодёжи «Движение Первых» в рамках программы «Гранты Первых». #ДвижениеПервых #ГрантыПервых</p>
  <p class="footer-support">Разработано ООО «ПРОФТРЕКЕР» · Игра «Создай предприятие»</p>
  <p class="footer-support footer-copyright">© ООО «ПРОФТРЕКЕР». Методика игры «Создай предприятие» защищена авторским правом — свидетельство о депонировании №4405819.</p>
</footer>

<script>window.SITE_ROOT = '../';</script>
<script src="../app.js"></script>
<script>
(function () {
  var SLUG = ${JSON.stringify(p.slug)};

  if (!ProfTrekerSite.getMyCard()) { ProfTrekerSite.setMyCard(SLUG); }
  ProfTrekerSite.pushRecent(SLUG);

  function render() {
    var on = ProfTrekerSite.isBookmarked(SLUG);
    ['bookmark-btn', 'bookmark-btn-desktop'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(on));
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    });
    document.getElementById('bookmark-btn-mobile').textContent = on ? 'Отмечено — вернуться позже' : 'Отметить, чтобы вернуться';
  }
  function toggle() { ProfTrekerSite.toggleBookmark(SLUG); render(); }

  document.getElementById('bookmark-btn').addEventListener('click', toggle);
  document.getElementById('bookmark-btn-mobile').addEventListener('click', toggle);
  var desktopBtn = document.getElementById('bookmark-btn-desktop');
  if (desktopBtn) desktopBtn.addEventListener('click', toggle);
  render();

  document.getElementById('share-btn').addEventListener('click', function () {
    ProfTrekerSite.share(${JSON.stringify(p.name)}, window.location.href);
  });
})();
</script>

</body>
</html>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const p of data.professions) {
  const html = renderPage(p);
  fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), html, 'utf8');
  count++;
}
console.log(`Собрано страниц профессий: ${count}`);
