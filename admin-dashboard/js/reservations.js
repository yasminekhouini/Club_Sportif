const API         = 'http://localhost/Club_Sportif_Project/shared-backend/api/reservations.php';
const MEMBERS_API = 'http://localhost/Club_Sportif_Project/shared-backend/api/members.php';

// ── Salle options per activity (UPDATED — only real spaces) ──────
const SALLES = {
  'Salle de Gym': [
    'Salle de Gym'
  ],
  'Terrain Padel': [
    'Padel 1 (Extérieur)',
    'Padel 2 (Intérieur)',
    'Padel 3 (Extérieur)',
  ],
  'Terrain Basketball': [
    'Terrain Basketball (Intérieur)',
    'Terrain Basketball (Extérieur)',
  ],
};

const ACTIVITY_COLORS = {
  'Salle de Gym':        '#4272d7',
  'Terrain Padel':       '#00ad5f',
  'Terrain Basketball':  '#ff9800',
};

let reservations     = [];
let membersList      = [];
let calendarInstance = null;

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  loadMembers();
  loadReservations();

  document.getElementById('resSearch').addEventListener('input',  filterTable);
  document.getElementById('filterActivite').addEventListener('change', filterTable);
  document.getElementById('filterStatut').addEventListener('change',   filterTable);
  document.getElementById('r_activite').addEventListener('change', e => updateSalles(e.target.value));
});

// ── Load members for select ───────────────────────────────────────
async function loadMembers() {
  try {
    const res  = await fetch(MEMBERS_API);
    const json = await res.json();
    membersList = json.data || [];

    const sel = document.getElementById('r_membre_id');
    sel.innerHTML = '<option value="">— Aucun membre —</option>' +
      membersList.map(m =>
        `<option value="${m.id}">${esc(m.nom)}${m.telephone ? ' · ' + m.telephone : ''}</option>`
      ).join('');
  } catch(e) {
    console.error('Membres non chargés:', e);
  }
}

// ── Load reservations ─────────────────────────────────────────────
async function loadReservations() {
  try {
    const res  = await fetch(API);
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    reservations = json.data || [];
    renderStats(json.stats);
    filterTable();
    syncCalendar();
    renderUpcoming();
  } catch(e) {
    console.error(e);
    document.getElementById('resTbody').innerHTML =
      '<tr><td colspan="8" class="text-center text-muted py-4">⚠️ Impossible de joindre l\'API.</td></tr>';
  }
}

// ── Stats strip ───────────────────────────────────────────────────
function renderStats(s) {
  if (!s) return;
  document.getElementById('sAujourd').textContent  = s.aujourd_hui   || 0;
  document.getElementById('sSemaine').textContent  = s.cette_semaine || 0;
  document.getElementById('sConfirm').textContent  = s.confirmees    || 0;
  document.getElementById('sAttente').textContent  = s.en_attente    || 0;
}

// ── Filter & render table ─────────────────────────────────────────
function filterTable() {
  const q   = (document.getElementById('resSearch').value || '').toLowerCase();
  const act = document.getElementById('filterActivite').value;
  const st  = document.getElementById('filterStatut').value;

  const filtered = reservations.filter(r => {
    const txt = [r.activite, r.salle, r.membre_nom].join(' ').toLowerCase();
    return (!q   || txt.includes(q))
        && (!act || r.activite === act)
        && (!st  || r.statut  === st);
  });

  renderTable(filtered);
  document.getElementById('resCount').textContent =
    `${filtered.length} réservation${filtered.length !== 1 ? 's' : ''} affichée${filtered.length !== 1 ? 's' : ''}`;
}

function renderTable(items) {
  const tbody = document.getElementById('resTbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
      <i class="fas fa-calendar-times fa-2x mb-2" style="display:block;opacity:.3"></i>
      Aucune réservation trouvée</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(r => `
    <tr>
      <td style="font-size:.85rem">${formatDate(r.date_reservation)}</td>
      <td>${r.heure_debut?.substring(0,5) || '—'}</td>
      <td>${r.heure_fin?.substring(0,5)   || '—'}</td>
      <td>
        <span class="act-dot" style="background:${ACTIVITY_COLORS[r.activite] || '#888'}"></span>
        ${esc(r.activite)}
      </td>
      <td>${esc(r.salle || '—')}</td>
      <td>
        <div class="member-name">${esc(r.membre_nom || 'Non assigné')}</div>
      </td>
      <td>${statusBadge(r.statut)}</td>
      <td style="text-align:right">
        <button class="btn-action btn-action-edit me-1" onclick="openEdit(${r.id})" title="Modifier">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action btn-action-delete" onclick="askDelete(${r.id})" title="Supprimer">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function statusBadge(statut) {
  const map = {
    confirmee:  '<span class="res-badge badge-confirmee">Confirmée</span>',
    en_attente: '<span class="res-badge badge-attente">En attente</span>',
    annulee:    '<span class="res-badge badge-annulee">Annulée</span>',
  };
  return map[statut] || `<span class="res-badge">${esc(statut)}</span>`;
}

// ── Upcoming reservations panel ───────────────────────────────────
function renderUpcoming() {
  const container = document.getElementById('upcomingList');
  const today     = new Date().toISOString().split('T')[0];
  const upcoming  = reservations
    .filter(r => r.date_reservation >= today && r.statut !== 'annulee')
    .sort((a, b) => a.date_reservation.localeCompare(b.date_reservation) || a.heure_debut.localeCompare(b.heure_debut))
    .slice(0, 8);

  if (!upcoming.length) {
    container.innerHTML = '<p class="text-muted text-center py-3">Aucune réservation à venir</p>';
    return;
  }

  const MONTHS = ['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'];

  container.innerHTML = upcoming.map(r => {
    const d     = new Date(r.date_reservation);
    const day   = d.getDate();
    const month = MONTHS[d.getMonth()];
    const color = ACTIVITY_COLORS[r.activite] || '#888';

    return `
      <div class="upcoming-item">
        <div class="upcoming-date" style="color:${color}">
          <div class="upcoming-month">${month}</div>
          <div class="upcoming-day">${day}</div>
        </div>
        <div class="upcoming-info">
          <div class="upcoming-title">${esc(r.activite)}</div>
          <div class="upcoming-sub">${esc(r.membre_nom || 'Non assigné')} · ${r.heure_debut?.substring(0,5)}${r.heure_fin ? '–' + r.heure_fin.substring(0,5) : ''}</div>
          <div class="upcoming-salle">${esc(r.salle || '')}</div>
        </div>
        ${statusBadge(r.statut)}
      </div>
    `;
  }).join('');
}

// ── FullCalendar ──────────────────────────────────────────────────
function initCalendar() {
  const el = document.getElementById('calendarEl');
  if (!el || typeof FullCalendar === 'undefined') return;

  calendarInstance = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    locale: 'fr',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,listWeek',
    },
    buttonText: { today: "Aujourd'hui", month: 'Mois', week: 'Semaine', list: 'Liste' },
    height: 'auto',
    dayMaxEvents: 3,
    eventClick: info => openEdit(parseInt(info.event.id)),
    dateClick:  info => openAdd(info.dateStr),
  });

  calendarInstance.render();
}

function syncCalendar() {
  if (!calendarInstance) return;
  calendarInstance.removeAllEvents();
  reservations.forEach(r => {
    calendarInstance.addEvent({
      id:              r.id,
      title:           `${r.activite}${r.membre_nom ? ' – ' + r.membre_nom : ''}`,
      start:           `${r.date_reservation}T${r.heure_debut}`,
      end:             r.heure_fin ? `${r.date_reservation}T${r.heure_fin}` : undefined,
      backgroundColor: ACTIVITY_COLORS[r.activite] || '#888',
      borderColor:     ACTIVITY_COLORS[r.activite] || '#888',
      textColor:       '#fff',
    });
  });
}

// ── Salle dropdown ────────────────────────────────────────────────
function updateSalles(activity, selected = '') {
  const sel     = document.getElementById('r_salle');
  const options = SALLES[activity] || [];

  sel.innerHTML = '<option value="">— Sélectionner une salle —</option>' +
    options.map(s =>
      `<option value="${s}"${s === selected ? ' selected' : ''}>${s}</option>`
    ).join('');
  sel.disabled = options.length === 0;
}

// ── Modals ────────────────────────────────────────────────────────
function openAdd(date = '') {
  clearForm();
  document.getElementById('modalTitle').textContent     = 'Nouvelle Réservation';
  document.getElementById('r_date_reservation').value   = date || new Date().toISOString().split('T')[0];
  document.getElementById('r_statut').value             = 'confirmee';
  document.getElementById('resModal').classList.add('active');
}

function openEdit(id) {
  const r = reservations.find(x => x.id == id);
  if (!r) return;

  clearForm();
  document.getElementById('modalTitle').textContent         = 'Modifier la Réservation';
  document.getElementById('r_id').value                     = r.id;
  document.getElementById('r_activite').value               = r.activite;
  updateSalles(r.activite, r.salle || '');
  document.getElementById('r_date_reservation').value       = r.date_reservation;
  document.getElementById('r_heure_debut').value            = r.heure_debut?.substring(0,5) || '';
  document.getElementById('r_heure_fin').value              = r.heure_fin?.substring(0,5)   || '';
  document.getElementById('r_membre_id').value              = r.membre_id || '';
  document.getElementById('r_statut').value                 = r.statut;
  document.getElementById('resModal').classList.add('active');
}

function closeModal() { document.getElementById('resModal').classList.remove('active'); }

function clearForm() {
  ['r_id','r_heure_debut','r_heure_fin'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('r_activite').value         = '';
  document.getElementById('r_membre_id').value        = '';
  document.getElementById('r_date_reservation').value = '';
  document.getElementById('r_statut').value           = 'confirmee';
  updateSalles('');
}

// ── Save ──────────────────────────────────────────────────────────
async function saveReservation() {
  const id       = document.getElementById('r_id').value;
  const activite = document.getElementById('r_activite').value;
  const date     = document.getElementById('r_date_reservation').value;
  const debut    = document.getElementById('r_heure_debut').value;

  if (!activite || !date || !debut) {
    showToast('Activité, date et heure de début sont obligatoires.', 'warning');
    return;
  }

  const payload = {
    activite,
    salle:            document.getElementById('r_salle').value,
    date_reservation: date,
    heure_debut:      debut,
    heure_fin:        document.getElementById('r_heure_fin').value || null,
    membre_id:        document.getElementById('r_membre_id').value || null,
    statut:           document.getElementById('r_statut').value,
  };
  if (id) payload.id = parseInt(id);

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Enregistrement...';

  try {
    const res    = await fetch(API, {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    if (result.success) {
      closeModal();
      await loadReservations();
      showToast(id ? '✅ Réservation mise à jour !' : '✅ Réservation enregistrée !', 'success');
    } else {
      showToast('Erreur: ' + (result.error || 'inconnue'), 'danger');
    }
  } catch(e) {
    showToast('Impossible de joindre l\'API.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i> Enregistrer';
  }
}

// ── Delete ────────────────────────────────────────────────────────
let toDeleteId = null;

function askDelete(id) {
  toDeleteId = id;
  document.getElementById('deleteModal').classList.add('active');
}
function closeDelete() {
  document.getElementById('deleteModal').classList.remove('active');
  toDeleteId = null;
}
async function confirmDelete() {
  if (!toDeleteId) return;
  try {
    const res    = await fetch(API, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: toDeleteId }),
    });
    const result = await res.json();
    if (result.success) {
      closeDelete();
      await loadReservations();
      showToast('🗑️ Réservation supprimée.', 'success');
    }
  } catch(e) {
    showToast('Impossible de joindre l\'API.', 'danger');
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}
function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow`;
  t.style.cssText = 'z-index:9999;min-width:280px';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}