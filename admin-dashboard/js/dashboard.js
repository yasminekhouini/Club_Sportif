const API    = 'http://localhost/JSproject/Club_Sportif/shared-backend/api';
const COLORS = ['#4272d7','#00ad5f','#ff9800','#e91e63','#9c27b0','#00bcd4'];

// ── Boot — window.onload garantit que Chart.js est dispo ────────
window.addEventListener('load', () => {
  initMiniCharts();
  loadDashboard();
  setupAddMemberForm();
});

// ── Mini sparklines (decorative, static) ────────────────────────
function initMiniCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js non chargé');
    return;
  }
  const mini = (id, type, data, color) => {
    const el = document.getElementById(id);
    if (!el) return;
    new Chart(el, {
      type,
      data: {
        labels: data.map(() => ''),
        datasets: [{
          data,
          borderColor: '#fff',
          backgroundColor: 'rgba(255,255,255,.25)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: .4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales:  { x: { display: false }, y: { display: false } }
      }
    });
  };
  mini('widgetChart1', 'line', [200,215,210,230,240,238,245]);
  mini('widgetChart2', 'line', [40000,42000,44000,45000,46000,47000,48350]);
  mini('widgetChart3', 'line', [65,70,72,75,76,77,78]);
  mini('widgetChart4', 'bar',  [5,8,10,12,15,14,12]);
}

// ── Load everything ─────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/dashboard_stats.php`);
    const json = await res.json();

    if (!json.success) {
      console.error('API error:', json.error);
      showToast('Erreur API : ' + json.error, 'danger');
      return;
    }

    const d = json.data;
    renderStatCards(d);
    renderRevenueChart(d.revenus_chart);
    renderDoughnutChart(d.repartition);
    renderRecentMembers(d.nouveaux_membres);
    renderReservations(d.reservations_today);

    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = d.expirations_7j || 0;

  } catch (err) {
    console.error('Dashboard load failed:', err);
    showToast('Impossible de contacter le serveur.', 'danger');
  }
}

// ── Stat cards ──────────────────────────────────────────────────
function renderStatCards(d) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('statMembres',     d.membres_actifs);
  set('statRevenus',     Number(d.revenus_mensuel).toLocaleString('fr-TN') + ' DT');
  set('statExpirations', d.expirations_7j);
}

// ── Revenue line chart ──────────────────────────────────────────
let revenueChart = null;
function renderRevenueChart(data) {
  const ctx = document.getElementById('recent-rep-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'],
      datasets: [{
        label: 'Revenus ' + new Date().getFullYear(),
        data:  data || Array(12).fill(0),
        borderColor: '#4272d7',
        backgroundColor: 'rgba(66,114,215,.12)',
        borderWidth: 3,
        fill: true,
        tension: .4,
        pointRadius: 4,
        pointBackgroundColor: '#4272d7'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => v.toLocaleString('fr-TN') + ' DT' }
        }
      }
    }
  });
}

// ── Doughnut chart ──────────────────────────────────────────────
let doughnutChart = null;
function renderDoughnutChart(repartition) {
  const ctx = document.getElementById('percent-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (!repartition?.length) {
    ctx.parentElement.innerHTML += '<p class="text-muted text-center mt-3">Aucune donnée</p>';
    return;
  }
  if (doughnutChart) doughnutChart.destroy();

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: repartition.map(r => r.type_abonnement),
      datasets: [{
        data: repartition.map(r => parseInt(r.total)),
        backgroundColor: COLORS.slice(0, repartition.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '60%'
    }
  });
}

// ── Recent members table ────────────────────────────────────────
function renderRecentMembers(membres) {
  const tbody = document.getElementById('recentMembersTbody');
  if (!tbody) return;

  if (!membres?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Aucun nouveau membre cette semaine</td></tr>';
    return;
  }

  tbody.innerHTML = membres.map(m => `
    <tr>
      <td><strong>${esc(m.nom)}</strong></td>
      <td>${esc(m.type_abonnement || '—')}</td>
      <td>${formatDate(m.date_inscription)}</td>
      <td><span class="badge bg-${m.statut === 'actif' ? 'success' : 'secondary'}">${esc(m.statut)}</span></td>
    </tr>
  `).join('');
}

// ── Today's reservations ────────────────────────────────────────
function renderReservations(reservations) {
  const tbody = document.getElementById('reservationsTbody');
  if (!tbody) return;

  if (!reservations?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Aucune réservation aujourd\'hui</td></tr>';
    return;
  }

  const ACTIVITY_COLORS = {
    'Salle de Gym':       '#4272d7',
    'Terrain Padel':      '#00ad5f',
    'Terrain Basketball': '#ff9800',
  };

  tbody.innerHTML = reservations.map(r => {
    const color = ACTIVITY_COLORS[r.activite] || '#888';
    return `
      <tr>
        <td><strong>${String(r.heure_debut || '').substring(0,5)}</strong></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
            ${esc(r.activite)}
          </span>
        </td>
        <td>${esc(r.membre || 'Non assigné')}</td>
        <td><span class="text-muted" style="font-size:.82rem">${esc(r.salle || '—')}</span></td>
      </tr>
    `;
  }).join('');
}

// ── Add member form ─────────────────────────────────────────────
function setupAddMemberForm() {
  const btn = document.getElementById('btnSaveMember');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const nom   = document.getElementById('f_nom').value.trim();
    const email = document.getElementById('f_email').value.trim();
    const tel   = document.getElementById('f_tel').value.trim();
    const dob   = document.getElementById('f_dob').value;
    const type  = document.getElementById('f_type').value;
    const debut = document.getElementById('f_debut').value;

    if (!nom || !tel) { showToast('Nom et téléphone sont obligatoires.', 'warning'); return; }
    if (!type)        { showToast('Veuillez sélectionner un type d\'abonnement.', 'warning'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Enregistrement...';

    try {
      const res = await fetch(`${API}/members.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone: tel, date_naissance: dob, type_abonnement: type, date_debut: debut })
      });
      const result = await res.json();

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
        ['f_nom','f_email','f_tel','f_dob','f_type','f_debut'].forEach(id => {
          document.getElementById(id).value = '';
        });
        await loadDashboard();
        showToast('✅ Membre ajouté avec succès !', 'success');
      } else {
        showToast('Erreur serveur : ' + (result.error || 'inconnue'), 'danger');
      }
    } catch (err) {
      showToast('Impossible de joindre l\'API.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
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