// ============================================
//  GAMERPEDIA - main.js
// ============================================

const STORAGE_KEY = 'gamerWiki_games';
const JSON_PATH   = 'Json/videojuegos.json';

let allGames = [];
let filteredGames = [];
let activeCategory = 'all';

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadGames();
  renderCategoryDropdown();
  renderFilterTags();
  renderGames(allGames);
  updateGameCount();
  bindEvents();
});

// ── Load Games ────────────────────────────
async function loadGames() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    allGames = JSON.parse(stored);
  } else {
    try {
      const res = await fetch(JSON_PATH);
      allGames = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allGames));
    } catch (e) {
      allGames = [];
      console.warn('No se pudo cargar el JSON:', e);
    }
  }
  filteredGames = [...allGames];
}

// ── Render Games ──────────────────────────
function renderGames(games) {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (games.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🎮</div>
        <p class="no-results-text">Ningún videojuego encontrado</p>
      </div>`;
    return;
  }

  games.forEach(game => {
    const card = createGameCard(game);
    grid.appendChild(card);
  });

  updateGameCount(games.length);
}

function createGameCard(game) {
  const div = document.createElement('div');
  div.className = 'game-card';
  div.innerHTML = `
    <div class="card-image-wrap">
      <img src="${game.imagen || 'https://placehold.co/600x300/0a0a1a/00f5ff?text=SIN+IMAGEN'}"
           alt="${game.titulo}" loading="lazy"
           onerror="this.src='https://placehold.co/600x300/0a0a1a/00f5ff?text=SIN+IMAGEN'">
      <div class="card-image-overlay"></div>
      <span class="card-category-badge ${getCatClass(game.categoria)}">${game.categoria || 'General'}</span>
    </div>
    <div class="card-body">
      <div class="card-info">
        <h3 class="card-title">${game.titulo}</h3>
        <p class="card-desc">${game.descripcion}</p>
        <div class="card-meta">
          <span>📅 ${game.anio_salida || 'N/D'}</span>
          <span>🔄 ${game.anio_ultima_actualizacion || 'N/D'}</span>
        </div>
      </div>
    </div>
    <div class="card-footer">
      <span class="card-price">${game.precio != null ? 'MXN$' + Number(game.precio).toFixed(2) : 'GRATUITO'}</span>
      <button class="btn-ver" onclick="openGameModal('${game.id}')">
        <span>▶ Ver</span>
      </button>
    </div>
  `;
  return div;
}

// ── Game Detail Modal ─────────────────────
window.openGameModal = function(id) {
  const game = allGames.find(g => g.id === id);
  if (!game) return;

  const modal = document.getElementById('gameModal');
  const catClass = getCatClass(game.categoria);

  modal.querySelector('#mImg').src       = game.imagen || 'https://placehold.co/900x300/0a0a1a/00f5ff?text=SIN+IMAGEN';
  modal.querySelector('#mImg').alt       = game.titulo;
  modal.querySelector('#mCat').textContent = game.categoria || 'General';
  modal.querySelector('#mCat').className = `modal-cat-badge card-category-badge ${catClass}`;
  modal.querySelector('#mTitle').textContent = game.titulo;
  modal.querySelector('#mDesc').textContent  = game.descripcion;
  modal.querySelector('#mAnioSalida').textContent = game.anio_salida || 'N/D';
  modal.querySelector('#mAnioUpdate').textContent  = game.anio_ultima_actualizacion || 'N/D';
  modal.querySelector('#mPrice').textContent  = game.precio != null ? 'MXN$' + Number(game.precio).toFixed(2) : 'GRATUITO';

  const platforms = modal.querySelector('#mPlatforms');
  platforms.innerHTML = '';
  const plats = Array.isArray(game.plataformas) ? game.plataformas : (game.plataformas ? [game.plataformas] : ['N/D']);
  plats.forEach(p => {
    const chip = document.createElement('span');
    chip.className = 'platform-chip';
    chip.textContent = p;
    platforms.appendChild(chip);
  });

  openModal('gameModal');
};

// ── Categories ────────────────────────────
function getCategories() {
  return [...new Set(allGames.map(g => g.categoria).filter(Boolean))].sort();
}

function renderCategoryDropdown() {
  const menu = document.getElementById('categoriesMenu');
  if (!menu) return;
  const cats = getCategories();

  menu.innerHTML = `<span class="dropdown-item" onclick="filterByCategory('all')">🎮 Todos los juegos</span>`;
  cats.forEach(cat => {
    const item = document.createElement('span');
    item.className = 'dropdown-item';
    item.textContent = `${getCatEmoji(cat)} ${cat}`;
    item.onclick = () => filterByCategory(cat);
    menu.appendChild(item);
  });
}

function renderFilterTags() {
  const wrap = document.getElementById('filterTags');
  if (!wrap) return;
  const cats = getCategories();

  wrap.innerHTML = `<button class="filter-tag active" data-cat="all" onclick="filterByCategory('all', this)">Todos</button>`;
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-tag';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.onclick = function() { filterByCategory(cat, this); };
    wrap.appendChild(btn);
  });
}

window.filterByCategory = function(cat, el) {
  activeCategory = cat;

  // Update filter tags
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    const tag = document.querySelector(`.filter-tag[data-cat="${cat}"]`);
    if (tag) tag.classList.add('active');
  }

  // Apply search + category together
  applyFilters();
};

function applyFilters() {
  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  let result = [...allGames];

  if (activeCategory !== 'all') {
    result = result.filter(g => g.categoria === activeCategory);
  }

  if (searchVal) {
    result = result.filter(g =>
      g.titulo.toLowerCase().includes(searchVal) ||
      g.descripcion.toLowerCase().includes(searchVal) ||
      (g.categoria || '').toLowerCase().includes(searchVal)
    );
  }

  renderGames(result);
}

// ── Propuestas Modal ──────────────────────
function openPropuestasModal() {
  // Populate game titles select
  const sel = document.getElementById('propGameTitle');
  if (sel) {
    sel.innerHTML = '<option value="">-- Selecciona un videojuego --</option>';
    allGames.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.titulo;
      opt.textContent = g.titulo;
      sel.appendChild(opt);
    });
  }
  openModal('propuestasModal');
}

// ── Modal helpers ─────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
};

// ── Update count ──────────────────────────
function updateGameCount(count) {
  const el = document.getElementById('gameCount');
  if (el) el.textContent = (count ?? allGames.length) + ' JUEGOS AGREGADOS';
}

// ── Events ────────────────────────────────
function bindEvents() {
  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Propuestas trigger
  document.getElementById('propuestasBtn')?.addEventListener('click', openPropuestasModal);
  document.getElementById('propuestasNavBtn')?.addEventListener('click', openPropuestasModal);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Propuestas form
  const propForm = document.getElementById('propForm');
  if (propForm) {
    propForm.addEventListener('submit', e => {
      e.preventDefault();
      propForm.style.display = 'none';
      document.getElementById('propSuccess').classList.add('show');
    });
  }

  // Reset propuestas on close
  document.getElementById('closePropuestas')?.addEventListener('click', () => {
    closeModal('propuestasModal');
    setTimeout(() => {
      const form = document.getElementById('propForm');
      const succ = document.getElementById('propSuccess');
      if (form) { form.style.display = ''; form.reset(); }
      if (succ) succ.classList.remove('show');
    }, 300);
  });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        closeModal(m.id);
      });
    }
  });
}

// ── Helpers ───────────────────────────────
function getCatClass(cat) {
  if (!cat) return 'cat-default';
  const map = {
    'acción': 'cat-accion', 'accion': 'cat-accion',
    'rpg': 'cat-rpg',
    'deportes': 'cat-deportes',
    'terror': 'cat-terror',
    'aventura': 'cat-aventura',
    'estrategia': 'cat-estrategia',
    'ficción': 'cat-ficcion', 'ficcion': 'cat-ficcion',
    'simulación': 'cat-simulacion', 'simulacion': 'cat-simulacion',
  };
  return map[cat.toLowerCase()] || 'cat-default';
}

function getCatEmoji(cat) {
  const map = {
    'Acción': '⚔️', 'RPG': '🧙', 'Deportes': '⚽', 'Terror': '👻',
    'Aventura': '🗺️', 'Estrategia': '♟️', 'Ficción': '🚀', 'Simulación': '🎯'
  };
  return map[cat] || '🎮';
}