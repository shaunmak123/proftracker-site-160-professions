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

// — фирменная надпись ЕВРАЗ под логотипом: пока клиент не прислал файл,
//   показываем плейсхолдер; как только положат картинку по этому пути —
//   она подхватится сама, без правок кода —
const EVRAZ_CAPTION_PATH = path.join(ROOT, 'site', 'assets', 'img', 'evraz-caption.svg');
const HAS_EVRAZ_CAPTION = fs.existsSync(EVRAZ_CAPTION_PATH);

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

// — пиктограммы спецодежды/СИЗ/спецобуви: простые линейные иконки, подобранные
//   по ключевым словам, отдельная иконка на каждый пункт списка (без внешних файлов) —
const WEAR_ICONS = {
  shirt: '<path d="M7 3 3 7v3l4-1v12h10V9l4 1V7l-4-4h-3.5L12 6 9.5 3Z"/>',
  overall: '<path d="M7 3 3 7v3l4-1v6h2v5h2v-4h2v4h2v-5h2V9l4 1V7l-4-4h-3.5L12 6 9.5 3Z"/>',
  cap: '<path d="M5 16a7 7 0 0 1 14 0"/><rect x="4" y="16" width="16" height="3.5" rx="1.2"/>',
  helmet: '<path d="M4 14a8 8 0 0 1 16 0"/><line x1="2.5" y1="14" x2="21.5" y2="14"/>',
  goggles: '<circle cx="7.5" cy="12" r="4"/><circle cx="16.5" cy="12" r="4"/><line x1="11.3" y1="12" x2="12.7" y2="12"/><path d="M4.5 9.5 3 8M19.5 9.5 21 8"/>',
  glove: '<path d="M8 21v-9a4 4 0 0 1 8 0v9Z"/><path d="M8 14H6.5A1.5 1.5 0 0 0 5 15.5V18a2 2 0 0 0 2 2h1"/>',
  headphones: '<path d="M4 15v-2a8 8 0 0 1 16 0v2"/><rect x="2.3" y="14" width="4" height="6.5" rx="1.6"/><rect x="17.7" y="14" width="4" height="6.5" rx="1.6"/>',
  mask: '<path d="M4 11a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z"/><path d="M4 12.5c-1.3 0-2.2.7-2.2 2M20 12.5c1.3 0 2.2.7 2.2 2"/>',
  harness: '<rect x="2" y="10.5" width="20" height="3" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1.2"/>',
  boot: '<path d="M8 3v9.5c0 1-.4 1.6-1.2 2.3L5 16.5c-.7.6-1 1.2-1 2.1V20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1c0-2.8-1.8-4-4-4H10"/>',
  felt_boot: '<path d="M9 2v11.5c0 1-.4 1.7-1.2 2.4l-2 1.6C5 18.2 4.5 19 4.5 20v0a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1c0-2.8-2-4-4.5-4H10"/><path d="M9 2h5v11.5"/>',
  clog: '<path d="M4 20v-4.5c0-1.7 1-3 3-3.3V10c0-1.1.9-2 2-2h1c1.1 0 2 .9 2 2v2.2"/><path d="M4 20h16v-1a3 3 0 0 0-3-3H7"/>',
};

function wearIconSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${WEAR_ICONS[key]}</svg>`;
}

// — одна иконка на весь раздел (не на каждый пункт): смотрим на все пункты
//   списка сразу и выбираем один представительный значок по приоритету —
function clothingSectionIcon(items) {
  const t = items.join(' ').toLowerCase();
  if (/костюм|комбинезон/.test(t)) return 'overall';
  if (/косынк|колпак|шапочк/.test(t)) return 'cap';
  return 'shirt';
}

function sizSectionIcon(items) {
  const t = items.join(' ').toLowerCase();
  if (/каск|шлем|подшлемник/.test(t)) return 'helmet';
  if (/очки|щиток/.test(t)) return 'goggles';
  if (/перчатк|рукавиц|краги/.test(t)) return 'glove';
  if (/наушник|вкладыш|беруш/.test(t)) return 'headphones';
  if (/респиратор|сизод|противога|полумаск|\bмаск/.test(t)) return 'mask';
  if (/пояс предохранительн|страховочн|стропы/.test(t)) return 'harness';
  return 'mask';
}

function footwearSectionIcon(items) {
  const t = items.join(' ').toLowerCase();
  if (/валенк/.test(t)) return 'felt_boot';
  if (/сабо/.test(t)) return 'clog';
  return 'boot';
}

// — в паре мест исходный текст физически переносится посреди предложения
//   (напр. «...производственных\nзагрязнений и механических\nвоздействий»,
//   это одно предложение, разорванное переносами строк при вводе, а не три
//   разных пункта). Строка, начинающаяся со строчной буквы, почти наверняка
//   продолжение предыдущей — склеиваем её обратно, а не заводим новый пункт —
function joinWrappedLines(lines) {
  const result = [];
  lines.forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (result.length && /^[а-яё]/.test(t)) {
      result[result.length - 1] += ' ' + t;
    } else {
      result.push(t);
    }
  });
  return result;
}

// — спецобувь тоже дробим на отдельные пункты (та же логика, что и для
//   спецодежды/СИЗ, но без деления на две группы) —
// — если после дробления остался осиротевший союз «или»/«ИЛИ» отдельным
//   пунктом (когда в тексте встречается ", ИЛИ" перед переносом строки),
//   приклеиваем его к соседнему пункту, а не показываем как отдельную строку —
function mergeOrphanConnectors(fragments) {
  const result = [];
  fragments.forEach((f) => {
    if (/^или$/i.test(f)) {
      if (result.length) {
        result[result.length - 1] += ' ' + f.toLowerCase();
      } else {
        result.push(f);
      }
    } else {
      result.push(f);
    }
  });
  return result;
}

function splitFootwear(text) {
  const fragments = [];
  joinWrappedLines((text || '').split(/\n+/)).forEach((line) => {
    line
      .split(/\s*[,;]\s*(?=[А-ЯЁ])|(?<=[а-яё])\.\s+(?=[А-ЯЁ])/)
      .forEach((frag) => {
        let t = frag.trim().replace(/^[./]+|[./,]+$/g, '').trim();
        if (t && !t.includes('(') && t.endsWith(')')) t = t.slice(0, -1).trim();
        if (t) fragments.push(t);
      });
  });
  return mergeOrphanConnectors(fragments);
}

// — «Где учиться»: отделяем номер специальности (по гос. стандарту) от её
//   названия и разбиваем на отдельные строки-специальности. В исходных
//   данных несколько специальностей иногда идут через перенос строки, а
//   иногда просто подряд в одном абзаце — делим по каждому вхождению кода
//   специальности (ХХ.ХХ.ХХ), а не по переносам строк, иначе перенос имени
//   на новую строку ошибочно считается новой специальностью, а несколько
//   специальностей в одном абзаце — одной нечитаемой —
function eduRows(text) {
  if (!text) return [];
  // отрицательный lookbehind не даёт распознать код внутри более длинного
  // 4-сегментного кода (напр. "15.02.10.01" не должен резаться на "15." + "02.10.01")
  const CODE = '(?<![\\d.])\\d{2}\\.\\d{2}\\.\\d{2}(?:\\.\\d{2})?';
  const norm = text.replace(/^["']+|["']+$/g, '').trim();
  const rows = [];
  norm
    .split(new RegExp(`(?=${CODE})`))
    .map((s) => s.replace(/\s+/g, ' ').trim().replace(/[,;]+$/, ''))
    .filter(Boolean)
    .forEach((part) => {
      const m = part.match(new RegExp(`^(${CODE})\\.?\\s*(.*)$`));
      rows.push(m ? { code: m[1], name: m[2].trim().replace(/[,;]+$/, '') } : { code: null, name: part });
    });
  return rows;
}

// — делим общий текст «спецодежда и СИЗ» на два раздела по ключевым словам:
//   средства защиты (каска/очки/перчатки/наушники/респиратор и т.п.) отдельно
//   от собственно одежды (костюм/куртка/халат и т.п.). Дробим не только по
//   переносам строк, но и по запятым/точкам внутри одного абзаца — иначе,
//   если спецодежда и СИЗ перечислены в одном предложении, всё предложение
//   целиком утаскивает за собой одно случайно попавшее слово вроде «каска» —
const SIZ_RE = /каск|шлем|очки|щиток|маск|перчатк|рукавиц|наушник|вкладыш|беруш|респиратор|сизод|противога|самоспасат|пояс предохранительн|страховочн|стропы|краги|накомарник|ремни безопасности|перчаточные|наплечник|защиты органов дыхания|защиты глаз|индивидуальной защиты/i;
const NOT_SIZ_RE = /костюм|куртк|халат|фартук|жилет|рубашк|футболк|брюки|плать|юбк|обувь|ботинк|сапог|туфл|кроссовк|тапочк|валенк|комбинезон|белье|бельё|плащ|китель|колпак|косынк|одежд/i;

function splitClothingSiz(text) {
  const fragments = [];
  joinWrappedLines((text || '').split(/\n+/)).forEach((line) => {
    line
      .split(/\s*[,;]\s*(?=[А-ЯЁ])|(?<=[а-яё])\.\s+(?=[А-ЯЁ])/)
      .forEach((frag) => {
        let t = frag.trim().replace(/^[./]+|[./,]+$/g, '').trim();
        if (t && !t.includes('(') && t.endsWith(')')) t = t.slice(0, -1).trim();
        if (t) fragments.push(t);
      });
  });
  const clothing = [];
  const siz = [];
  mergeOrphanConnectors(fragments).forEach((item) => {
    const isSiz = SIZ_RE.test(item) && !NOT_SIZ_RE.test(item);
    (isSiz ? siz : clothing).push(item);
  });
  return { clothing, siz };
}

function wearItemsHtml(items) {
  return items.map((t) => `<p class="wear-item">${esc(t)}</p>`).join('\n          ');
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
  const industryUpper = p.industry.toUpperCase();
  const eduList = eduRows(p.education);
  const wear = splitClothingSiz(p.clothing);
  const footwearItems = splitFootwear(p.footwear);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${esc(p.name)} — Электронный каталог профессий</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(p.name)}: чем занимается, сколько зарабатывает в регионе, где учиться и где работать.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Roboto:wght@400;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="../page.css">
</head>
<body>

<div class="top-brand-bar">
  <img src="../assets/img/logo-dvizhenie-pervyh.svg" alt="Движение Первых · Гранты Первых" class="top-brand-logo">
  <img src="../assets/img/logo-proftracker.svg" alt="АНО «ПРОФТРЕКЕР»" class="top-brand-logo">
  <div class="top-brand-actions">
    <a class="home-btn" href="../index.html" aria-label="На главную" title="На главную">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>
    </a>
    <a class="vk-btn" href="https://vk.ru/proftreker" target="_blank" rel="noopener" aria-label="Сообщество ВКонтакте" title="Мы ВКонтакте">VK</a>
  </div>
</div>

<header class="topbar">
  <button class="icon-btn" type="button" onclick="history.length>1?history.back():location.href='../catalog.html'" aria-label="Назад">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
  </button>
  <button class="icon-btn" type="button" id="bookmark-btn" aria-label="Отметить, чтобы вернуться" aria-pressed="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </button>
</header>

<main class="profession">
  <div class="folder-tab">${esc(p.name)}</div>
  <div class="profession-sheet">

  <div class="profession-media">
    <figure class="profession-photo${hasPhoto(p.slug) ? ' has-photo' : ''}">
      <div class="photo-frame">
        ${hasPhoto(p.slug)
          ? `<img src="../assets/img/photos/${p.slug}.png" alt="Карточка профессии «${esc(p.name)}»" loading="lazy">`
          : `<div class="ph">фото профессии<br>с карточки колоды<br>(${esc(p.image || p.name + '.jpg')})</div>`}
      </div>
    </figure>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-label">Зарплата в регионе</div>
        <div class="stat-value" style="font-size:18px">${esc(p.salary)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Отрасль</div>
        <div class="stat-value" style="font-size:14px">${esc(p.industry)}</div>
      </div>
    </div>

    <div class="partner-figure profession-partner">
      <span class="partner-logo-zone">
        <img src="../assets/img/logo-evraz.svg" alt="ЕВРАЗ" class="partner-logo">
      </span>
      <span class="partner-label">Партнёр проекта</span>
    </div>
    <div class="partner-caption">
      ${HAS_EVRAZ_CAPTION
        ? `<img src="../assets/img/evraz-caption.svg" alt="" class="partner-caption-img">`
        : `<div class="ph partner-caption-ph">здесь будет фирменная<br>надпись ЕВРАЗ</div>`}
    </div>

    <button class="btn btn-primary btn-block desktop-cta" type="button" id="bookmark-btn-desktop">
      Отметить, чтобы вернуться
    </button>
  </div>

  <div class="profession-main">
    <p class="crumb" style="margin-bottom:6px">${esc(industryUpper)}</p>
    <h1 class="p-title">${esc(p.name)}</h1>
    <p class="p-short">${esc(p.short)}</p>

    <div class="sections">
      <div class="sec span-2">
        <h6>Основной вид деятельности</h6>
        <p>${esc(p.activity)}</p>
      </div>

      <div class="sec span-2">
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

      <div class="sec sec-clothing">
        <h6>Спецодежда</h6>
        <div class="wear-row clothing">
          <div class="wear-icon wear-icon-clothing" role="img" aria-label="Спецодежда"></div>
          <div class="wear-items">
          ${wear.clothing.length ? wearItemsHtml(wear.clothing) : `<p class="wear-item">${esc(p.clothing)}</p>`}
          </div>
        </div>
      </div>

      <div class="sec sec-footwear">
        <h6>Спецобувь</h6>
        <div class="wear-row footwear">
          <div class="wear-icon wear-icon-footwear" role="img" aria-label="Спецобувь"></div>
          <div class="wear-items">
          ${footwearItems.length ? wearItemsHtml(footwearItems) : `<p class="wear-item">${esc(p.footwear)}</p>`}
          </div>
        </div>
      </div>

      <div class="sec sec-siz">
        <h6>СИЗ</h6>
        <div class="wear-row siz">
          ${wear.siz.length ? '<div class="wear-icon wear-icon-siz" role="img" aria-label="СИЗ"></div>' : ''}
          <div class="wear-items">
          ${wear.siz.length ? wearItemsHtml(wear.siz) : '<p class="wear-item wear-item-muted">Для этой профессии специальные средства защиты не требуются.</p>'}
          </div>
        </div>
      </div>

      <div class="sec span-2">
        <h6>Где учиться</h6>
        <p class="edu-hint">Это официальное название и номер специальности в колледже или вузе — он понадобится при поступлении.</p>
        <div class="edu-list">
        ${eduList[0] ? `<div class="edu-row">
            ${eduList[0].code ? `<span class="edu-code">№ ${esc(eduList[0].code)}</span>` : ''}
            <span class="edu-name">${esc(eduList[0].name)}</span>
          </div>` : ''}
        ${eduList.length > 1 ? `<p class="edu-hint edu-more-hint">Ещё варианты, куда можно поступить на эту профессию — подойдёт любой один, учиться сразу на все не нужно:</p>` : ''}
        ${eduList.slice(1).map((e) => `
          <div class="edu-row">
            ${e.code ? `<span class="edu-code">№ ${esc(e.code)}</span>` : ''}
            <span class="edu-name">${esc(e.name)}</span>
          </div>`).join('\n        ')}
        </div>
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

    <p class="data-note">Данные по профессии «${esc(p.name)}», отрасль «${esc(p.industry)}». Зарплата — оценочная вилка по региону.</p>
  </div>

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
