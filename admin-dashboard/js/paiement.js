const API_PAY     = 'http://localhost/JSproject/Club_Sportif/shared-backend/api/paiement.php';
const API_MEMBERS = 'http://localhost/JSproject/Club_Sportif/shared-backend/api/members.php';

let allPaiements = [];
let allMembers   = [];
let toDeleteId   = null;

const STATUT_CONFIG = {
  paye:        { label: 'Payé',        cls: 'badge-paye' },
  partiel:     { label: 'Partiel',     cls: 'badge-partiel' },
  en_attente:  { label: 'En Attente',  cls: 'badge-attente' },
  rembourse:   { label: 'Remboursé',   cls: 'badge-rembourse' },
};

const MODE_LABELS = {
  especes:  'Espèces',
  carte:    'Carte',
  virement: 'Virement',
  cheque:   'Chèque',
};

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadPaiements(), loadMembersForSelect()]);
});

// ── Load payments ─────────────────────────────────────────────────
async function loadPaiements() {
  try {
    const res  = await fetch(API_PAY);
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    allPaiements = json.data || [];
    renderStats(json.stats);
    filterTable();
  } catch(err) {
    console.error(err);
    document.getElementById('paiementsTbody').innerHTML =
      `<tr class="empty-row"><td colspan="8">⚠️ Impossible de joindre l'API. Laragon actif ?</td></tr>`;
  }
}

// ── Load members for the select dropdown ──────────────────────────
async function loadMembersForSelect() {
  try {
    const res  = await fetch(API_MEMBERS);
    const json = await res.json();
    allMembers = json.data || [];

    const sel = document.getElementById('p_membre');
    sel.innerHTML = '<option value="">— Sélectionner un membre —</option>' +
      allMembers.map(m =>
        `<option value="${m.id}">${esc(m.nom)}${m.telephone ? ' · ' + m.telephone : ''}</option>`
      ).join('');
  } catch(err) {
    console.error('Impossible de charger les membres:', err);
  }
}

// ── Stats strip ───────────────────────────────────────────────────
function renderStats(s) {
  if (!s) return;
  document.getElementById('sTotalTx').textContent    = s.total || 0;
  document.getElementById('sTotalEnc').textContent   = Number(s.total_encaisse || 0).toLocaleString('fr-TN') + ' DT';
  document.getElementById('sAttente').textContent    = s.nb_attente || 0;
  document.getElementById('sRestant').textContent    = Number(s.total_restant || 0).toLocaleString('fr-TN') + ' DT';
}

// ── Filter ────────────────────────────────────────────────────────
function filterTable() {
  const q   = (document.getElementById('searchInput').value || '').toLowerCase();
  const st  = document.getElementById('filterStatut').value;

  const filtered = allPaiements.filter(p => {
    const matchQ  = !q || [p.membre_nom, p.type_transaction].some(v => (v||'').toLowerCase().includes(q));
    const matchSt = !st || p.statut === st;
    return matchQ && matchSt;
  });

  renderTable(filtered);
  document.getElementById('countLabel').textContent =
    `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} affichée${filtered.length !== 1 ? 's' : ''}`;
}

// ── Render table ──────────────────────────────────────────────────
function renderTable(paiements) {
  const tbody = document.getElementById('paiementsTbody');

  if (!paiements.length) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <i class="fas fa-search fa-2x mb-2" style="display:block;opacity:.3"></i>
          Aucun paiement trouvé
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = paiements.map(p => {
    const cfg     = STATUT_CONFIG[p.statut] || { label: p.statut, cls: '' };
    const initials= (p.membre_nom || '?').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
    const isPending = p.statut === 'en_attente' || p.statut === 'partiel';
    const montantDisplay = p.statut === 'paye'
      ? `${Number(p.montant_paye).toLocaleString('fr-TN')} DT`
      : `${Number(p.montant_paye).toLocaleString('fr-TN')} / ${Number(p.montant_total).toLocaleString('fr-TN')} DT`;

    return `
      <tr>
        <td style="font-weight:600;color:#6c757d;font-size:.82rem">#T${String(p.id).padStart(3,'0')}</td>
        <td style="font-size:.88rem">${formatDate(p.date_paiement)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="pay-avatar">${initials}</div>
            <div>
              <div class="member-name">${esc(p.membre_nom || '—')}</div>
              <div class="member-contact">${esc(p.type_transaction)}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:600;color:#2c3e50">${montantDisplay}</div>
          ${p.statut !== 'paye' && p.statut !== 'rembourse'
            ? `<div style="font-size:.78rem;color:#e74a3b">Reste: ${Number(p.montant_total - p.montant_paye).toLocaleString('fr-TN')} DT</div>`
            : ''}
        </td>
        <td>${p.mode_paiement ? MODE_LABELS[p.mode_paiement] || p.mode_paiement : '<span style="color:#aaa">—</span>'}</td>
        <td><span class="badge-pay ${cfg.cls}">${cfg.label}</span></td>
        <td style="text-align:right">
          <button class="btn-action btn-action-edit me-1" onclick="openEdit(${p.id})" title="Modifier">
            <i class="fas fa-edit"></i>
          </button>
          ${isPending
            ? `<button class="btn-action btn-action-remind me-1" onclick="markPaid(${p.id})" title="Marquer comme payé">
                 <i class="fas fa-check"></i>
               </button>`
            : ''}
          <button class="btn-action btn-action-delete" onclick="askDelete(${p.id})" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Quick mark as paid ────────────────────────────────────────────
async function markPaid(id) {
  const p = allPaiements.find(x => x.id == id);
  if (!p) return;

  try {
    const res = await fetch(API_PAY, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...p, montant_paye: p.montant_total })
    });
    const result = await res.json();
    if (result.success) {
      await loadPaiements();
      showToast('✅ Paiement marqué comme payé !', 'success');
    }
  } catch(e) {
    showToast('Erreur lors de la mise à jour.', 'danger');
  }
}

// ── Add modal ─────────────────────────────────────────────────────
function openAdd() {
  clearForm();
  document.getElementById('formTitle').textContent = 'Enregistrer un Paiement';
  // Set today's date
  document.getElementById('p_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('formModal').classList.add('active');
}

// ── Edit modal ────────────────────────────────────────────────────
function openEdit(id) {
  const p = allPaiements.find(x => x.id == id);
  if (!p) return;

  clearForm();
  document.getElementById('formTitle').textContent    = 'Modifier le Paiement';
  document.getElementById('p_id').value               = p.id;
  document.getElementById('p_membre').value           = p.membre_id;
  document.getElementById('p_type').value             = p.type_transaction;
  document.getElementById('p_total').value            = p.montant_total;
  document.getElementById('p_paye').value             = p.montant_paye;
  document.getElementById('p_mode').value             = p.mode_paiement;
  document.getElementById('p_statut_override').value  = p.statut === 'rembourse' ? 'rembourse' : '';
  document.getElementById('p_date').value             = p.date_paiement;
  document.getElementById('p_remarque').value         = p.remarque || '';
  updatePreview();
  document.getElementById('formModal').classList.add('active');
}

function closeForm() { document.getElementById('formModal').classList.remove('active'); }

function clearForm() {
  ['p_id','p_membre','p_type','p_total','p_paye','p_remarque'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('p_mode').value             = 'especes';
  document.getElementById('p_statut_override').value  = '';
  document.getElementById('p_date').value             = '';
  document.getElementById('statut-preview').textContent = '';
  document.getElementById('statut-preview').className   = '';
}

// ── Live statut preview ───────────────────────────────────────────
function updatePreview() {
  const total  = parseFloat(document.getElementById('p_total').value) || 0;
  const paye   = parseFloat(document.getElementById('p_paye').value)  || 0;
  const override = document.getElementById('p_statut_override').value;
  const preview  = document.getElementById('statut-preview');

  let statut;
  if (override === 'rembourse')   statut = 'rembourse';
  else if (paye <= 0)             statut = 'en_attente';
  else if (paye >= total && total > 0) statut = 'paye';
  else                            statut = 'partiel';

  const cfg = STATUT_CONFIG[statut] || { label: statut, cls: '' };
  preview.textContent = '→ Statut : ' + cfg.label;
  preview.className   = 'badge-pay ' + cfg.cls;
}

// ── Save ──────────────────────────────────────────────────────────
async function savePaiement() {
  const id         = document.getElementById('p_id').value;
  const membre_id  = document.getElementById('p_membre').value;
  const type       = document.getElementById('p_type').value.trim();
  const total      = document.getElementById('p_total').value;
  const paye       = document.getElementById('p_paye').value;

  if (!membre_id || !type || !total) {
    showToast('Membre, type et montant total sont obligatoires.', 'warning');
    return;
  }

  const payload = {
    id:               id ? parseInt(id) : undefined,
    membre_id:        parseInt(membre_id),
    type_transaction: type,
    montant_total:    parseFloat(total),
    montant_paye:     parseFloat(paye) || 0,
    mode_paiement:    document.getElementById('p_mode').value,
    statut:           document.getElementById('p_statut_override').value || undefined,
    date_paiement:    document.getElementById('p_date').value || new Date().toISOString().split('T')[0],
    remarque:         document.getElementById('p_remarque').value.trim() || null,
  };

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Enregistrement...';

  try {
    const res    = await fetch(API_PAY, {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      closeForm();
      await loadPaiements();
      showToast(id ? '✅ Paiement mis à jour !' : '✅ Paiement enregistré !', 'success');
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
    const res    = await fetch(API_PAY, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: toDeleteId })
    });
    const result = await res.json();
    if (result.success) {
      closeDelete();
      await loadPaiements();
      showToast('🗑️ Paiement supprimé.', 'success');
    }
  } catch(e) {
    showToast('Impossible de joindre l\'API.', 'danger');
  }
}

// ── Export CSV ────────────────────────────────────────────────────
function exportCSV() {
  const rows   = [['ID','Date','Membre','Type','Montant Payé','Montant Total','Mode','Statut']];
  allPaiements.forEach(p => {
    rows.push([
      `#T${String(p.id).padStart(3,'0')}`,
      formatDate(p.date_paiement),
      p.membre_nom || '—',
      p.type_transaction,
      p.montant_paye,
      p.montant_total,
      MODE_LABELS[p.mode_paiement] || p.mode_paiement || '—',
      STATUT_CONFIG[p.statut]?.label || p.statut,
    ]);
  });

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `paiements-smart-gym-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
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