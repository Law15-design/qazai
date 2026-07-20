const PRAYERS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'zuhr', label: 'Zuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
  { key: 'witr', label: 'Witr' }
];

const setupPage = document.getElementById('setup-page');
const trackerPage = document.getElementById('tracker-page');
const resultsCard = document.getElementById('results-card');
const resultsList = document.getElementById('results-list');
const prayerList = document.getElementById('prayer-list');

let mode = 'date';

function daysToYearsText(days) {
  if (days <= 0) return '0 days';
  const years = Math.floor(days / 365.25);
  const remainingDays = Math.round(days - years * 365.25);
  if (years === 0) return `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  if (remainingDays === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
}

// ---------- Toggle: date vs years ----------
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    document.getElementById('date-input-group').classList.toggle('hidden', mode !== 'date');
    document.getElementById('years-input-group').classList.toggle('hidden', mode !== 'years');
    document.getElementById('age-input-group').classList.toggle('hidden', mode !== 'age');
  });
});

document.getElementById('gender-select').addEventListener('change', (e) => {
  document.getElementById('female-fields').classList.toggle('hidden', e.target.value !== 'female');
});

// ---------- Calculate ----------
document.getElementById('calculate-btn').addEventListener('click', () => {
  let totalDays;

if (mode === 'date') {
    const startDate = document.getElementById('start-date').value;
    if (!startDate) { alert('Please pick a start date'); return; }
    const start = new Date(startDate);
    const today = new Date();
    totalDays = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
  } else if (mode === 'years') {
    const years = parseFloat(document.getElementById('years-input').value);
    if (!years || years <= 0) { alert('Please enter number of years'); return; }
    totalDays = Math.round(years * 365.25);
  } else {
    const ageStopped = parseFloat(document.getElementById('age-stopped').value);
    const ageStarted = parseFloat(document.getElementById('age-started').value);
    if (ageStopped === '' || ageStarted === '' || isNaN(ageStopped) || isNaN(ageStarted)) {
      alert('Please enter both ages'); return;
    }
    const years = ageStarted - ageStopped;
    if (years <= 0) { alert('The second age should be greater than the first'); return; }
    totalDays = Math.round(years * 365.25);
  }

  const gender = document.getElementById('gender-select').value;
  if (gender === 'female') {
    const cycleDays = parseFloat(document.getElementById('cycle-days').value) || 0;
    const months = totalDays / 30.44;
    const excusedDays = Math.round(months * cycleDays);
    totalDays = Math.max(0, totalDays - excusedDays);
  }

  const includeWitr = document.getElementById('include-witr').checked;

  // Build editable results
  const alreadyDone = document.getElementById('already-done-toggle').checked;

  // Build editable results
  resultsList.innerHTML = '';
  PRAYERS.forEach(p => {
    if (p.key === 'witr' && !includeWitr) return;
    const row = document.createElement('div');
    row.className = 'result-row';

    if (alreadyDone) {
      row.innerHTML = `
        <span>${p.label}</span>
        <input type="number" id="result-${p.key}" value="${totalDays}" min="0" placeholder="Total owed">
        <input type="number" id="done-${p.key}" value="0" min="0" placeholder="Already made up">
      `;
    } else {
      row.innerHTML = `
        <span>${p.label}</span>
        <input type="number" id="result-${p.key}" value="${totalDays}" min="0">
      `;
    }
    resultsList.appendChild(row);
  });

  resultsCard.classList.remove('hidden');
  resultsCard.scrollIntoView({ behavior: 'smooth' });
});

// ---------- Save & start ----------
document.getElementById('save-start-btn').addEventListener('click', () => {
  const alreadyDone = document.getElementById('already-done-toggle').checked;
  const data = {};
  let errorFound = false;

  PRAYERS.forEach(p => {
    const input = document.getElementById(`result-${p.key}`);
    if (input) {
      const totalOwed = parseInt(input.value) || 0;
      const doneInput = document.getElementById(`done-${p.key}`);
      const completed = alreadyDone && doneInput ? (parseInt(doneInput.value) || 0) : 0;

      if (completed > totalOwed) {
        alert(`${p.label}: "Already made up" (${completed}) can't be more than total owed (${totalOwed}). Please fix it.`);
        input.style.border = '2px solid #c0392b';
        if (doneInput) doneInput.style.border = '2px solid #c0392b';
        errorFound = true;
      }

      data[p.key] = {
        owed: Math.max(0, totalOwed - completed),
        completed: completed
      };
    }
  });

  if (errorFound) return; // stop here, don't save yet

  saveData(data);
  showTracker();
});

// ---------- Confetti burst ----------
function launchConfetti() {
  const colors = ['#C9A24B', '#E0C784', '#7FA98F', '#FAF7F0'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

// ---------- Data helpers ----------
function saveData(data) {
  localStorage.setItem('qazaData', JSON.stringify(data));
}
function loadData() {
  const raw = localStorage.getItem('qazaData');
  return raw ? JSON.parse(raw) : null;
}

// ---------- Render tracker ----------
function renderTracker() {
  const data = loadData();
  if (!data) return;

  // Only build the cards once. If they already exist, just update numbers.
  if (prayerList.children.length === 0) {
    PRAYERS.forEach((p, i) => {
      if (!data[p.key]) return;
      const card = document.createElement('div');
      card.className = 'prayer-card';
      card.id = `card-${p.key}`;
      card.style.animationDelay = (i * 0.08) + 's';
      card.innerHTML = `
        <div class="prayer-top">
          <span class="prayer-name">${p.label}</span>
          <span id="percent-${p.key}">0%</span>
        </div>
        <div class="prayer-stats">
          Remaining: <b id="remaining-${p.key}">0</b> &nbsp;•&nbsp; Completed: <b id="completed-${p.key}">0</b>
        </div>
        <div class="prayer-years" id="years-${p.key}">≈ 0 days done</div>
        <div class="prayer-bottom">
          <div class="progress-track">
            <div id="fill-${p.key}" class="progress-fill sage" style="width:0%"></div>
          </div>
         <button class="prayer-btn" data-key="${p.key}" style="position:relative;">${p.label} ✓</button>
        </div>
        <button class="undo-link" data-key="${p.key}">Undo last tap</button>
      `;
      prayerList.appendChild(card);
    });

    // Attach tap handlers once
    document.querySelectorAll('.prayer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = btn.dataset.key;
        const d = loadData();
        if (d[key].owed > 0) {
          d[key].owed -= 1;
          d[key].completed += 1;
          saveData(d);

          // Floating +1
          const plus = document.createElement('span');
          plus.className = 'float-plus';
          plus.textContent = '+1';
          btn.appendChild(plus);
          setTimeout(() => plus.remove(), 800);

          if (d[key].owed === 0) launchConfetti();
        }
        btn.classList.add('pulse');
        setTimeout(() => btn.classList.remove('pulse'), 350);
        updateUI();
      });
    });
    // Undo handlers
    document.querySelectorAll('.undo-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const d = loadData();
        if (d[key].completed > 0) {
          d[key].completed -= 1;
          d[key].owed += 1;
          saveData(d);
          updateUI();
        }
      });
    });
  }

  updateUI();
}

// Updates only the numbers/bars — no rebuilding, no re-animating
function updateUI() {
  const data = loadData();
  if (!data) return;

  let totalOwed = 0, totalCompleted = 0;

  PRAYERS.forEach(p => {
    if (!data[p.key]) return;
    const { owed, completed } = data[p.key];
    const total = owed + completed;
    totalOwed += owed;
    totalCompleted += completed;
    const percent = total > 0 ? ((completed / total) * 100) : 0;

    document.getElementById(`remaining-${p.key}`).textContent = owed;
    document.getElementById(`completed-${p.key}`).textContent = completed;
    document.getElementById(`percent-${p.key}`).textContent = percent.toFixed(1) + '%';
    document.getElementById(`fill-${p.key}`).style.width = percent + '%';
    document.getElementById(`years-${p.key}`).textContent = `≈ ${daysToYearsText(completed)} done`;

    const card = document.getElementById(`card-${p.key}`);
    card.classList.toggle('done', owed === 0 && completed > 0);
  });

  const overallPercent = (totalOwed + totalCompleted) > 0
    ? (totalCompleted / (totalOwed + totalCompleted)) * 100 : 0;
  document.getElementById('overall-percent').textContent = overallPercent.toFixed(1) + '%';
  document.getElementById('overall-fill').style.width = overallPercent + '%';
  const avgCompleted = totalCompleted / PRAYERS.filter(p => data[p.key]).length;
  document.getElementById('overall-years').textContent = `≈ ${daysToYearsText(avgCompleted)} worth of prayers made up`;
}

function showTracker() {
  setupPage.classList.add('hidden');
  trackerPage.classList.remove('hidden');
  renderTracker();
}

// ---------- Backup / Restore ----------
document.getElementById('backup-btn').addEventListener('click', () => {
  const data = loadData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qaza-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('restore-btn').addEventListener('click', () => {
  document.getElementById('restore-file').click();
});

document.getElementById('restore-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      saveData(data);
      renderTracker();
      alert('Backup restored!');
    } catch (err) {
      alert('That file could not be read. Please pick a valid backup file.');
    }
  };
  reader.readAsText(file);
});

// ---------- Edit setup ----------
document.getElementById('edit-setup-btn').addEventListener('click', () => {
  if (confirm('This lets you re-enter your starting numbers. Your completed counts stay the same. Continue?')) {
    trackerPage.classList.add('hidden');
    setupPage.classList.remove('hidden');
    resultsCard.classList.add('hidden');
  }
});

// ---------- On load ----------
window.addEventListener('load', () => {
  const data = loadData();
  if (data) {
    showTracker();
  }
});