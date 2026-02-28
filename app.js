(function () {
  'use strict';

  const STORAGE_KEY = 'ajet-times';
  const THEME_KEY = 'ajet-theme';

  let times = [];
  let selectedIds = new Set();
  let editingId = null;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const timesList = $('#timesList');
  const themeBtn = $('#themeBtn');
  const themeIcon = $('.theme-icon', themeBtn);
  const newBtn = $('#newBtn');
  const editBtn = $('#editBtn');
  const deleteBtn = $('#deleteBtn');
  const deleteAllBtn = $('#deleteAllBtn');
  const copyWhatsAppBtn = $('#copyWhatsAppBtn');
  const modal = $('#timeModal');
  const form = $('#timeForm');
  const modalCancel = $('#modalCancel');
  const timeLabel = $('#timeLabel');
  const timeValue = $('#timeValue');
  const utcNowValue = $('#utcNowValue');
  const setUtcNowBtn = $('#setUtcNowBtn');
  const flightDate = $('#flightDate');
  let utcUpdateInterval = null;

  function getUtcDateString() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function loadTimes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      times = raw ? JSON.parse(raw) : [];
    } catch (_) {
      times = [];
    }
  }

  function saveTimes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
  }

  function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if (themeIcon) themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  }

  function render() {
    if (!timesList) return;
    timesList.innerHTML = '';
    times.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'time-row' + (selectedIds.has(t.id) ? ' selected' : '');
      row.dataset.id = t.id;
      row.innerHTML = `
        <span class="time-label">${escapeHtml(t.label)}</span>
        <span class="time-value">${formatTime(t.value)}</span>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.time-row')) toggleSelect(t.id);
      });
      timesList.appendChild(row);
    });
    updateButtons();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatTime(value) {
    if (!value) return '--:--';
    const [h, m] = value.split(':');
    return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    render();
  }

  function updateButtons() {
    const hasSelection = selectedIds.size > 0;
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
    if (copyWhatsAppBtn) copyWhatsAppBtn.disabled = !hasSelection;
    if (deleteAllBtn) deleteAllBtn.disabled = times.length === 0;
  }

  function openModal(id = null) {
    editingId = id;
    const item = id ? times.find((t) => t.id === id) : null;
    timeLabel.value = item ? item.label : '';
    timeValue.value = item ? item.value : '';
    $('.modal-title', modal).textContent = item ? 'Edit time' : 'New time';
    modal.showModal();
    updateUtcDisplay();
    if (utcUpdateInterval) clearInterval(utcUpdateInterval);
    utcUpdateInterval = setInterval(updateUtcDisplay, 1000);
    timeLabel.focus();
  }

  function closeModal() {
    if (utcUpdateInterval) {
      clearInterval(utcUpdateInterval);
      utcUpdateInterval = null;
    }
    modal.close();
    editingId = null;
  }

  function getUtcTimeString(includeSeconds = false) {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const pad = (n) => String(n).padStart(2, '0');
    if (includeSeconds) return `${pad(h)}:${pad(m)}:${pad(now.getUTCSeconds())}`;
    return `${pad(h)}:${pad(m)}`;
  }

  function updateUtcDisplay() {
    if (utcNowValue) utcNowValue.textContent = getUtcTimeString(true);
  }

  function addOrUpdate(label, value) {
    const normalized = value.length === 5 ? value : value + ':00';
    if (editingId) {
      const i = times.findIndex((t) => t.id === editingId);
      if (i !== -1) {
        times[i].label = label.trim();
        times[i].value = normalized;
      }
    } else {
      times.push({
        id: 'id-' + Date.now(),
        label: label.trim(),
        value: normalized,
      });
    }
    saveTimes();
    render();
    closeModal();
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    times = times.filter((t) => !selectedIds.has(t.id));
    selectedIds.clear();
    saveTimes();
    render();
  }

  function deleteAll() {
    if (times.length === 0) return;
    if (!confirm('Delete all times?')) return;
    times = [];
    selectedIds.clear();
    saveTimes();
    render();
  }

  function copyWhatsApp() {
    if (selectedIds.size === 0) return;
    const selected = times.filter((t) => selectedIds.has(t.id));
    const lines = selected.map((t) => `${t.label}: ${formatTime(t.value)}`);
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(
      () => {
        const btn = copyWhatsAppBtn;
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = orig;
          updateButtons();
        }, 1500);
      },
      () => alert('Could not copy to clipboard')
    );
  }

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (newBtn) newBtn.addEventListener('click', () => openModal());
  if (editBtn) editBtn.addEventListener('click', () => {
    const first = selectedIds.size > 0 ? [...selectedIds][0] : null;
    openModal(first);
  });
  if (deleteBtn) deleteBtn.addEventListener('click', deleteSelected);
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAll);
  if (copyWhatsAppBtn) copyWhatsAppBtn.addEventListener('click', copyWhatsApp);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = timeLabel.value.trim();
      const value = timeValue.value;
      if (!label || !value) return;
      addOrUpdate(label, value);
    });
  }

  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  if (setUtcNowBtn) setUtcNowBtn.addEventListener('click', () => {
    if (timeValue) timeValue.value = getUtcTimeString(false);
  });
  if (timeValue) {
    timeValue.addEventListener('input', () => {
      const raw = timeValue.value.replace(/\D/g, '');
      if (raw.length <= 2) {
        timeValue.value = raw;
      } else {
        timeValue.value = raw.slice(0, 2) + ':' + raw.slice(2, 4);
      }
    });
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  loadTheme();
  loadTimes();
  if (flightDate) flightDate.value = getUtcDateString();
  render();
})();
