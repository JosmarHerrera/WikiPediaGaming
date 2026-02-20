// ============================================
//  GAMERPEDIA - admin.js
// ============================================

const STORAGE_KEY = 'gamerWiki_games';
const JSON_PATH   = '../Json/videojuegos.json';
const ADMIN_USER  = 'admin';
const ADMIN_PASS  = 'gamer2024';

let games = [];
let editingId = null;

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  bindLoginForm();
});

// ── Auth ──────────────────────────────────
function checkAuth() {
  if (sessionStorage.getItem('gamerWiki_admin') === 'true') {
    showDashboard();
  }
}

function bindLoginForm() {
  const form = document.getElementById('loginForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err  = document.getElementById('loginError');

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem('gamerWiki_admin', 'true');
      document.getElementById('loginOverlay').style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(showDashboard, 400);
    } else {
      err.textContent = '⚠ Credenciales incorrectas. Intenta de nuevo.';
      err.style.display = 'block';
      document.getElementById('loginPass').value = '';
      document.getElementById('adminCard').style.animation = 'shake 0.4s ease';
      setTimeout(() => document.getElementById('adminCard').style.animation = '', 400);
    }
  });
}

function logout() {
  sessionStorage.removeItem('gamerWiki_admin');
  location.reload();
}

async function showDashboard() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('dashboard').style.display    = 'block';
  await loadGames();
  renderTable();
  bindDashboardEvents();
}

// ── Games CRUD ────────────────────────────
async function loadGames() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    games = JSON.parse(stored);
  } else {
    try {
      const res = await fetch(JSON_PATH);
      games = await res.json();
      saveGames();
    } catch (e) {
      games = [];
    }
  }
}

function saveGames() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ── Table Render ──────────────────────────
function renderTable(filterText = '') {
  const tbody = document.getElementById('gamesTableBody');
  if (!tbody) return;

  const list = filterText
    ? games.filter(g => g.titulo.toLowerCase().includes(filterText.toLowerCase()))
    : games;

  document.getElementById('adminGameCount').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="no-data">No hay videojuegos registrados aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(game => `
    <tr>
      <td>
        <div class="tbl-img-wrap">
          <img src="${game.imagen || ''}" alt="${game.titulo}"
               onerror="this.src='https://placehold.co/60x40/0a0a1a/00f5ff?text=N/A'"
               class="tbl-img">
        </div>
      </td>
      <td>
        <span class="tbl-title">${game.titulo}</span>
      </td>
      <td><span class="tbl-badge cat-badge-${slugCat(game.categoria)}">${game.categoria || '—'}</span></td>
      <td class="tbl-mono">${game.anio_salida || '—'}</td>
      <td class="tbl-mono">${formatPlatforms(game.plataformas)}</td>
      <td class="tbl-price">${game.precio != null ? '$' + Number(game.precio).toFixed(2) : 'F2P'}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn-edit" onclick="openEditForm('${game.id}')">✏ Editar</button>
          <button class="btn-delete" onclick="confirmDelete('${game.id}')">✕ Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function formatPlatforms(plats) {
  if (!plats) return '—';
  const arr = Array.isArray(plats) ? plats : [plats];
  return arr.slice(0, 2).join(', ') + (arr.length > 2 ? ` +${arr.length - 2}` : '');
}

// ── Form ──────────────────────────────────
function openCreateForm() {
  editingId = null;
  const form = document.getElementById('gameForm');
  form.reset();
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('formModalTitle').textContent = '[ NUEVO VIDEOJUEGO ]';
  document.getElementById('formSubmitBtn').textContent  = 'PUBLICAR VIDEOJUEGO';
  openModal('formModal');
}

window.openEditForm = function(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;

  editingId = id;
  document.getElementById('formModalTitle').textContent = '[ EDITAR VIDEOJUEGO ]';
  document.getElementById('formSubmitBtn').textContent  = 'GUARDAR CAMBIOS';

  document.getElementById('fTitulo').value      = game.titulo || '';
  document.getElementById('fDescripcion').value = game.descripcion || '';
  document.getElementById('fImagen').value      = game.imagen || '';
  document.getElementById('fAnioSalida').value  = game.anio_salida || '';
  document.getElementById('fAnioUpdate').value  = game.anio_ultima_actualizacion || '';
  document.getElementById('fCategoria').value   = game.categoria || '';
  document.getElementById('fPlataformas').value = Array.isArray(game.plataformas)
    ? game.plataformas.join(', ') : (game.plataformas || '');
  document.getElementById('fPrecio').value = game.precio ?? '';

  // Image preview
  if (game.imagen) {
    const preview = document.getElementById('imagePreview');
    preview.src = game.imagen;
    preview.style.display = 'block';
  }

  openModal('formModal');
};

function handleFormSubmit(e) {
  e.preventDefault();
  const titulo = document.getElementById('fTitulo').value.trim();
  if (!titulo) return;

  const platsRaw  = document.getElementById('fPlataformas').value;
  const platsArr  = platsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const precioRaw = document.getElementById('fPrecio').value.trim();

  const gameData = {
    titulo,
    descripcion: document.getElementById('fDescripcion').value.trim(),
    imagen:      document.getElementById('fImagen').value.trim(),
    anio_salida: parseInt(document.getElementById('fAnioSalida').value) || null,
    anio_ultima_actualizacion: parseInt(document.getElementById('fAnioUpdate').value) || null,
    categoria:   document.getElementById('fCategoria').value,
    plataformas: platsArr,
    precio:      precioRaw !== '' ? parseFloat(precioRaw) : null,
  };

  if (editingId) {
    // Update existing
    const idx = games.findIndex(g => g.id === editingId);
    if (idx !== -1) {
      games[idx] = { ...games[idx], ...gameData };
    }
    showToast('Videojuego actualizado correctamente ✓');
  } else {
    // Create new
    gameData.id = generateId();
    games.unshift(gameData);
    showToast('Videojuego publicado correctamente ✓');
  }

  saveGames();
  renderTable(document.getElementById('tableSearch').value);
  closeModal('formModal');
}

// ── Delete ────────────────────────────────
let deleteTargetId = null;

window.confirmDelete = function(id) {
  deleteTargetId = id;
  const game = games.find(g => g.id === id);
  document.getElementById('deleteGameName').textContent = game?.titulo || 'este juego';
  openModal('deleteModal');
};

function executeDelete() {
  if (!deleteTargetId) return;
  games = games.filter(g => g.id !== deleteTargetId);
  saveGames();
  renderTable(document.getElementById('tableSearch').value);
  closeModal('deleteModal');
  showToast('Videojuego eliminado ✓');
  deleteTargetId = null;
}

// ── Image preview ─────────────────────────
function previewImage() {
  const url = document.getElementById('fImagen').value.trim();
  const preview = document.getElementById('imagePreview');
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    preview.onerror = () => { preview.style.display = 'none'; };
  } else {
    preview.style.display = 'none';
  }
}

// ── Toast ─────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
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

// ── Bind events ───────────────────────────
function bindDashboardEvents() {
  document.getElementById('btnNewGame')?.addEventListener('click', openCreateForm);
  document.getElementById('gameForm')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', executeDelete);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.getElementById('tableSearch')?.addEventListener('input', e => {
    renderTable(e.target.value);
  });

  document.getElementById('fImagen')?.addEventListener('blur', previewImage);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });
}

// ── Helpers ───────────────────────────────
function slugCat(cat) {
  if (!cat) return 'default';
  const map = {
    'Acción': 'accion', 'RPG': 'rpg', 'Deportes': 'deportes',
    'Terror': 'terror', 'Aventura': 'aventura', 'Estrategia': 'estrategia',
    'Ficción': 'ficcion', 'Simulación': 'simulacion',
  };
  return map[cat] || 'default';
}