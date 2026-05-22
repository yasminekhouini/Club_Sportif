const API         = 'http://localhost/JSproject/Club_Sportif/shared-backend/api/reservations.php';
const MEMBERS_API = 'http://localhost/JSproject/Club_Sportif/shared-backend/api/members.php';

const SALLES = {
  'Salle de Gym': ['Salle de Gym'],
  'Terrain Padel': ['Padel 1 (Extérieur)', 'Padel 2 (Intérieur)', 'Padel 3 (Extérieur)'],
  'Terrain Basketball': ['Terrain Basketball (Intérieur)', 'Terrain Basketball (Extérieur)'],
};

const ACTIVITY_COLORS = {
  'Salle de Gym':       '#4272d7',
  'Terrain Padel':      '#00ad5f',
  'Terrain Basketball': '#ff9800',
};

let reservations     = [];
let membersList      = [];
let calendarInstance = null;

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  loadMembers();
  loadReservations();
  document.getElementById('r_activite').addEventListener('change', e => updateSalles(e.target.value));
});

// ── Load members ──────────────────────────────────────────────────
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
    syncCalendar();
  } catch(e) {
    console.error('Erreur loadReservations:', e);
  }
}

// ── Stats ─────────────────────────────────────────────────────────
function renderStats(s) {
  if (!s) return;
  document.getElementById('sAujourd').textContent = s.aujourd_hui   || 0;
  document.getElementById('sSemaine').textContent = s.cette_semaine || 0;
  document.getElementById('sConfirm').textContent = s.confirmees    || 0;
  document.getElementById('sAttente').textContent = s.en_attente    || 0;
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
    const dateStr  = (r.date_reservation || '').trim();
    const debutStr = (r.heure_debut || '').trim().substring(0, 5);
    const finStr   = (r.heure_fin   || '').trim().substring(0, 5);
    if (!dateStr || !debutStr) return;

    calendarInstance.addEvent({
      id:              String(r.id),
      title:           `${r.activite}${r.membre_nom ? ' – ' + r.membre_nom : ''}`,
      start:           `${dateStr}T${debutStr}:00`,
      end:             finStr ? `${dateStr}T${finStr}:00` : undefined,
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
  document.getElementById('modalTitle').textContent   = 'Nouvelle Réservation';
  document.getElementById('r_date_reservation').value = date || new Date().toISOString().split('T')[0];
  document.getElementById('r_statut').value           = 'confirmee';
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
  document.getElementById('r_heure_debut').value            = (r.heure_debut || '').substring(0, 5);
  document.getElementById('r_heure_fin').value              = (r.heure_fin   || '').substring(0, 5);
  document.getElementById('r_membre_id').value              = r.membre_id || '';
  document.getElementById('r_statut').value                 = r.statut;
  document.getElementById('resModal').classList.add('active');
}

function closeModal() { document.getElementById('resModal').classList.remove('active'); }

function clearForm() {
  ['r_id', 'r_heure_debut', 'r_heure_fin'].forEach(id => document.getElementById(id).value = '');
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
      showToast('Erreur : ' + (result.error || 'inconnue'), 'danger');
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
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow`;
  t.style.cssText = 'z-index:9999;min-width:280px';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}