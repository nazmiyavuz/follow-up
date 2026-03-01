(function () {
  "use strict";

  function init() {
    const STORAGE_KEY = "ajet-times";
    const THEME_KEY = "ajet-theme";

    let times = [];
    let selectedIds = new Set();
    let editingId = null;

    const $ = (sel, el = document) => el && el.querySelector(sel);
    const $$ = (sel, el = document) =>
      el ? [...el.querySelectorAll(sel)] : [];

    const timesList = $("#timesList");
    const themeBtn = $("#themeBtn");
    const themeIcon = themeBtn ? $(".theme-icon", themeBtn) : null;
    const newBtn = $("#newBtn");
    const editBtn = $("#editBtn");
    const deleteBtn = $("#deleteBtn");
    const deleteAllBtn = $("#deleteAllBtn");
    const copyWhatsAppBtn = $("#copyWhatsAppBtn");
    const modal = $("#timeModal");
    const form = $("#timeForm");
    const modalCancel = $("#modalCancel");
    const timeLabel = $("#timeLabel");
    const timeLabelCustom = $("#timeLabelCustom");
    const timeValue = $("#timeValue");
    const utcNowValue = $("#utcNowValue");
    const setUtcNowBtn = $("#setUtcNowBtn");
    const flightDate = $("#flightDate");
    const flightNumber = $("#flightNumber");
    const additionalInfo = $("#additionalInfo");
    const jsStatus = $("#jsStatus");
    let utcUpdateInterval = null;

    if (jsStatus) jsStatus.textContent = "JS status: ready";

    function getUtcDateString() {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth() + 1;
      const d = now.getUTCDate();
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
      const theme = localStorage.getItem(THEME_KEY) || "light";
      document.documentElement.setAttribute("data-theme", theme);
      if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    }

    function toggleTheme() {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      if (themeIcon) themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
    }

    function render() {
      if (!timesList) return;
      timesList.innerHTML = "";
      times.forEach((t) => {
        const row = document.createElement("div");
        row.className = "time-row" + (selectedIds.has(t.id) ? " selected" : "");
        row.dataset.id = t.id;
        row.innerHTML = `
        <span class="time-label">${escapeHtml(t.label)}</span>
        <span class="time-value">${formatTime(t.value)}</span>
      `;
        row.addEventListener("click", (e) => {
          if (e.target.closest(".time-row")) toggleSelect(t.id);
        });
        timesList.appendChild(row);
      });
      updateButtons();
    }

    function escapeHtml(s) {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    function formatTime(value) {
      if (!value) return "--:--";
      const [h, m] = value.split(":");
      return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
    }

    /** Format YYYY-MM-DD as DD.MM.YYYY for WhatsApp copy */
    function formatDateForWhatsApp(dateValue) {
      if (!dateValue) return "";
      const [y, m, d] = dateValue.split("-");
      return [d, m, y].join(".");
    }

    function toggleSelect(id) {
      if (selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
      render();
    }

    function updateButtons() {
      // Keep buttons clickable; show feedback in handlers when no data/selection.
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      if (copyWhatsAppBtn) copyWhatsAppBtn.disabled = false;
      if (deleteAllBtn) deleteAllBtn.disabled = false;
    }

    function syncCustomLabelVisibility() {
      if (!timeLabel || !timeLabelCustom) return;
      const isCustom = timeLabel.value === "__custom__";
      timeLabelCustom.classList.toggle("hidden", !isCustom);
      timeLabelCustom.hidden = !isCustom;
      timeLabelCustom.required = isCustom;
      if (!isCustom) timeLabelCustom.value = "";
    }

    function getLabelValue() {
      if (!timeLabel) return "";
      if (timeLabel.value === "__custom__") {
        return timeLabelCustom ? timeLabelCustom.value.trim() : "";
      }
      return timeLabel.value.trim();
    }

    function setLabelValue(label) {
      if (!timeLabel) return;
      const normalized = (label || "").trim();
      if (!normalized) {
        timeLabel.value = "";
        if (timeLabelCustom) timeLabelCustom.value = "";
        syncCustomLabelVisibility();
        return;
      }
      const hasPreset = [...timeLabel.options].some(
        (opt) => opt.value === normalized,
      );
      if (hasPreset) {
        timeLabel.value = normalized;
        if (timeLabelCustom) timeLabelCustom.value = "";
      } else {
        timeLabel.value = "__custom__";
        if (timeLabelCustom) timeLabelCustom.value = normalized;
      }
      syncCustomLabelVisibility();
    }

    function openModal(id = null) {
      if (!modal) return;
      editingId = id;
      const item = id ? times.find((t) => t.id === id) : null;
      setLabelValue(item ? item.label : "");
      if (timeValue) timeValue.value = item ? item.value : "";
      const titleEl = $(".modal-title", modal);
      if (titleEl) titleEl.textContent = item ? "Edit time" : "New time";
      modal.showModal();
      updateUtcDisplay();
      if (utcUpdateInterval) clearInterval(utcUpdateInterval);
      utcUpdateInterval = setInterval(updateUtcDisplay, 1000);
      if (timeLabel) timeLabel.focus();
    }

    function closeModal() {
      if (utcUpdateInterval) {
        clearInterval(utcUpdateInterval);
        utcUpdateInterval = null;
      }
      if (modal) modal.close();
      editingId = null;
    }

    function getUtcTimeString(includeSeconds = false) {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const pad = (n) => String(n).padStart(2, "0");
      if (includeSeconds)
        return `${pad(h)}:${pad(m)}:${pad(now.getUTCSeconds())}`;
      return `${pad(h)}:${pad(m)}`;
    }

    function updateUtcDisplay() {
      if (utcNowValue) utcNowValue.textContent = getUtcTimeString(true);
    }

    function addOrUpdate(label, value) {
      const normalized = value.length === 5 ? value : value + ":00";
      if (editingId) {
        const i = times.findIndex((t) => t.id === editingId);
        if (i !== -1) {
          times[i].label = label.trim();
          times[i].value = normalized;
        }
      } else {
        times.push({
          id: "id-" + Date.now(),
          label: label.trim(),
          value: normalized,
        });
      }
      saveTimes();
      render();
      closeModal();
    }

    function deleteSelected() {
      if (selectedIds.size === 0) {
        alert("Please select a row first.");
        return;
      }
      const selectedCount = selectedIds.size;
      const message =
        selectedCount === 1
          ? "Delete selected row?"
          : `Delete ${selectedCount} selected rows?`;
      if (!confirm(message)) return;
      times = times.filter((t) => !selectedIds.has(t.id));
      selectedIds.clear();
      saveTimes();
      render();
    }

    function deleteAll() {
      if (times.length === 0) {
        alert("No times to delete.");
        return;
      }
      if (!confirm("Delete all times? This cannot be undone.")) return;
      times = [];
      selectedIds.clear();
      saveTimes();
      render();
    }

    function copyWhatsApp() {
      if (times.length === 0) {
        alert("No times to copy.");
        return;
      }
      const openWhatsAppShare = (text) => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        const shareWindow = window.open(
          whatsappUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (!shareWindow) {
          alert("Copied. Please allow popups to open WhatsApp share.");
        }
      };
      const toMinutes = (value) => {
        if (!value) return null;
        const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (!match) return null;
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
      };
      const flightCode = flightNumber ? flightNumber.value.trim() : "";
      const dateStr = flightDate ? formatDateForWhatsApp(flightDate.value) : "";
      const header = [
        `FLIGHT CODE: ${flightCode || ""}`,
        "",
        `DATE: ${dateStr}`,
        "",
        "",
      ].join("\n");
      const sortedTimes = [...times].sort((a, b) => {
        const aMinutes = toMinutes(a.value);
        const bMinutes = toMinutes(b.value);
        if (aMinutes === null && bMinutes === null) {
          return a.label.localeCompare(b.label);
        }
        if (aMinutes === null) return 1;
        if (bMinutes === null) return -1;
        return aMinutes - bMinutes;
      });
      const timeLines = sortedTimes.map((t) => {
        const hasTime = t.value && /^\d{1,2}:\d{2}/.test(t.value);
        const timePart = hasTime ? formatTime(t.value) : "N/A";
        return `${t.label} — ${timePart}`;
      });
      const extraInfoText = additionalInfo ? additionalInfo.value.trim() : "";
      const bodyText = header + timeLines.join("\n");
      const text = extraInfoText
        ? `${bodyText}\n\nADDITIONAL INFORMATION:\n${extraInfoText}`
        : bodyText;
      navigator.clipboard.writeText(text).then(
        () => {
          openWhatsAppShare(text);
          const btn = copyWhatsAppBtn;
          const orig = btn.textContent;
          btn.textContent = "Copied!";
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = orig;
            updateButtons();
          }, 1500);
        },
        () => alert("Could not copy to clipboard"),
      );
    }

    // Expose actions for inline onclick fallback (so buttons work even if something blocks addEventListener)
    window.ajet = {
      openModal: function () {
        openModal();
      },
      openModalEdit: function () {
        if (selectedIds.size > 0) openModal([...selectedIds][0]);
        else alert("Please select a row first.");
      },
      deleteSelected: deleteSelected,
      deleteAll: deleteAll,
      copyWhatsApp: copyWhatsApp,
      toggleTheme: toggleTheme,
    };

    // Toolbar + theme: capture phase on document so we get clicks before anything else
    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest("button");
        if (!btn || !btn.id || btn.disabled) return;
        // Only handle our toolbar/bottom buttons (ignore modal buttons — they have their own handlers)
        const app = document.querySelector(".app");
        if (!app || !app.contains(btn)) return;
        if (btn.closest("dialog")) return; // modal has its own handlers

        const handledButtonIds = new Set([
          "newBtn",
          "editBtn",
          "deleteBtn",
          "deleteAllBtn",
          "copyWhatsAppBtn",
          "themeBtn",
        ]);
        if (!handledButtonIds.has(btn.id)) return;
        // Prevent duplicate execution from inline onclick fallbacks on the same button.
        e.preventDefault();
        e.stopPropagation();

        switch (btn.id) {
          case "newBtn":
            openModal();
            break;
          case "editBtn":
            if (selectedIds.size > 0) openModal([...selectedIds][0]);
            else alert("Please select a row first.");
            break;
          case "deleteBtn":
            deleteSelected();
            break;
          case "deleteAllBtn":
            deleteAll();
            break;
          case "copyWhatsAppBtn":
            copyWhatsApp();
            break;
          case "themeBtn":
            toggleTheme();
            break;
          default:
            break;
        }
      },
      true,
    );

    // Keep direct listeners only for non-toolbar (modal, form, inputs)
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const label = getLabelValue();
        const value = timeValue.value;
        if (!label || !value) return;
        addOrUpdate(label, value);
      });
    }

    if (modalCancel) modalCancel.addEventListener("click", closeModal);
    if (timeLabel) {
      const handleLabelSelection = () => {
        syncCustomLabelVisibility();
        if (timeLabel.value === "__custom__" && timeLabelCustom) {
          timeLabelCustom.focus();
        }
      };
      timeLabel.addEventListener("change", handleLabelSelection);
      timeLabel.addEventListener("input", handleLabelSelection);
    }
    if (setUtcNowBtn)
      setUtcNowBtn.addEventListener("click", () => {
        if (timeValue) timeValue.value = getUtcTimeString(false);
      });
    if (timeValue) {
      timeValue.addEventListener("input", () => {
        const raw = timeValue.value.replace(/\D/g, "");
        if (raw.length <= 2) {
          timeValue.value = raw;
        } else {
          timeValue.value = raw.slice(0, 2) + ":" + raw.slice(2, 4);
        }
      });
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (flightNumber) {
      flightNumber.addEventListener("input", () => {
        flightNumber.value = flightNumber.value.toUpperCase();
      });
    }

    loadTheme();
    loadTimes();
    syncCustomLabelVisibility();
    if (flightDate) flightDate.value = getUtcDateString();
    if (flightNumber) flightNumber.value = "VF ";
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
