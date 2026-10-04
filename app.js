(function () {
  "use strict";

  function init() {
    const STORAGE_KEY = "ajet-times";
    const THEME_KEY = "ajet-theme-ios";

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
    const moreBtn = $("#moreBtn");
    const actionsMenu = $("#actionsMenu");
    const newFlightBtn = $("#newFlightBtn");
    const copyWhatsAppBtn = $("#copyWhatsAppBtn");
    const copyWhatsAppBtnDesktop = $("#copyWhatsAppBtnDesktop");
    const modal = $("#timeModal");
    const form = $("#timeForm");
    const modalCancel = $("#modalCancel");
    const labelPicker = $("#labelPicker");
    const timeLabelCustom = $("#timeLabelCustom");
    const timeValue = $("#timeValue");
    const utcNowValue = $("#utcNowValue");
    const setUtcNowBtn = $("#setUtcNowBtn");
    const flightDate = $("#flightDate");
    const flightNumber = $("#flightNumber");
    const additionalInfo = $("#additionalInfo");
    const jsStatus = $("#jsStatus");
    let utcUpdateInterval = null;
    let selectedLabelKey = "";
    let labelPickerExpanded = true;

    const CUSTOM_LABEL_KEY = "__custom__";
    const LABEL_GROUPS = [
      {
        title: "Arrival",
        labels: [
          "Crew Pickup (Hotel)",
          "Arrived to the Airport",
          "Leave Fly Wise",
          "Arrived to the Aircraft",
        ],
      },
      {
        title: "On ground",
        labels: [
          "Security Search Complete",
          "Deboarding Complete",
          "Boarding Start",
          "Boarding Done",
        ],
      },
      {
        title: "Departure",
        labels: [
          "Door Close",
          "Bridge Off",
          "Cargo Door Closed",
          "Pushback Start",
          "Deice Start",
          "Deice Complete",
        ],
      },
    ];
    const PRESET_LABELS = LABEL_GROUPS.flatMap((g) => g.labels);

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
      const theme = localStorage.getItem(THEME_KEY) || "dark";
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
      if (copyWhatsAppBtnDesktop) copyWhatsAppBtnDesktop.disabled = false;
      if (deleteAllBtn) deleteAllBtn.disabled = false;
      if (newFlightBtn) newFlightBtn.disabled = false;
    }

    function syncCustomLabelVisibility() {
      if (!timeLabelCustom) return;
      const isCustom = selectedLabelKey === CUSTOM_LABEL_KEY;
      timeLabelCustom.classList.toggle("hidden", !isCustom);
      timeLabelCustom.hidden = !isCustom;
      timeLabelCustom.required = isCustom;
      if (!isCustom) timeLabelCustom.value = "";
    }

    function syncLabelPickerMode() {
      if (!labelPicker) return;
      const hasSelection = Boolean(selectedLabelKey);
      const collapsed = hasSelection && !labelPickerExpanded;
      labelPicker.classList.toggle("is-collapsed", collapsed);
      labelPicker.classList.toggle("is-expanded", !collapsed);
    }

    function updateCustomOptionLabel() {
      if (!labelPicker) return;
      const customBtn = $(
        `.label-option[data-value="${CUSTOM_LABEL_KEY}"]`,
        labelPicker,
      );
      if (!customBtn) return;
      const customText =
        timeLabelCustom && selectedLabelKey === CUSTOM_LABEL_KEY
          ? timeLabelCustom.value.trim()
          : "";
      customBtn.textContent = customText || "Custom…";
    }

    function updateLabelPickerSelection() {
      if (!labelPicker) return;
      $$(".label-option", labelPicker).forEach((btn) => {
        const isSelected = btn.dataset.value === selectedLabelKey;
        btn.classList.toggle("is-selected", isSelected);
        btn.setAttribute("aria-checked", isSelected ? "true" : "false");
      });
      updateCustomOptionLabel();
      syncCustomLabelVisibility();
      syncLabelPickerMode();
    }

    function selectLabelKey(key, { focusCustom = false, expand = false } = {}) {
      selectedLabelKey = key || "";
      if (!selectedLabelKey) {
        labelPickerExpanded = true;
      } else if (expand) {
        labelPickerExpanded = true;
      } else {
        labelPickerExpanded = false;
      }
      updateLabelPickerSelection();
      if (
        focusCustom &&
        selectedLabelKey === CUSTOM_LABEL_KEY &&
        timeLabelCustom
      ) {
        timeLabelCustom.focus();
      }
    }

    function getLabelValue() {
      if (selectedLabelKey === CUSTOM_LABEL_KEY) {
        return timeLabelCustom ? timeLabelCustom.value.trim() : "";
      }
      return (selectedLabelKey || "").trim();
    }

    function setLabelValue(label, { expand = false } = {}) {
      const normalized = (label || "").trim();
      if (!normalized) {
        selectLabelKey("", { expand: true });
        if (timeLabelCustom) timeLabelCustom.value = "";
        return;
      }
      if (PRESET_LABELS.includes(normalized)) {
        selectLabelKey(normalized, { expand });
        if (timeLabelCustom) timeLabelCustom.value = "";
        return;
      }
      selectLabelKey(CUSTOM_LABEL_KEY, { expand });
      if (timeLabelCustom) timeLabelCustom.value = normalized;
      updateCustomOptionLabel();
    }

    function applySectionOpenState(openTitles) {
      if (!labelPicker) return;
      const openSet = new Set(openTitles);
      $$(".label-group[data-group]", labelPicker).forEach((group) => {
        const title = group.dataset.group || "";
        const isOpen = openSet.has(title);
        group.classList.toggle("is-section-collapsed", !isOpen);
        const toggle = $(".label-group-toggle", group);
        if (toggle)
          toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    function openSectionForLabel(labelKey) {
      if (!labelKey || labelKey === CUSTOM_LABEL_KEY) {
        applySectionOpenState(["On ground", "Departure"]);
        return;
      }
      const group = LABEL_GROUPS.find((g) => g.labels.includes(labelKey));
      if (group) applySectionOpenState([group.title]);
      else applySectionOpenState(["On ground", "Departure"]);
    }

    function applyNewSectionDefaults() {
      applySectionOpenState(["On ground", "Departure"]);
      if (labelPicker) labelPicker.scrollTop = 0;
    }

    function renderLabelPicker() {
      if (!labelPicker) return;
      const parts = LABEL_GROUPS.map((group) => {
        const options = group.labels
          .map(
            (label) => `
          <button
            type="button"
            class="label-option"
            role="radio"
            data-value="${escapeHtml(label)}"
            aria-checked="false"
          >${escapeHtml(label)}</button>`,
          )
          .join("");
        const optionsId = `label-group-${group.title.toLowerCase().replace(/\s+/g, "-")}`;
        return `
        <div class="label-group" data-group="${escapeHtml(group.title)}">
          <button
            type="button"
            class="label-group-toggle"
            aria-expanded="true"
            aria-controls="${optionsId}"
          >
            <span class="label-group-title-text">${escapeHtml(group.title)}</span>
            <span class="label-group-chevron" aria-hidden="true"></span>
          </button>
          <div class="label-group-options" id="${optionsId}">${options}</div>
        </div>`;
      });
      parts.push(`
        <div class="label-group label-group-custom">
          <div class="label-group-options">
            <button
              type="button"
              class="label-option label-option-custom"
              role="radio"
              data-value="${CUSTOM_LABEL_KEY}"
              aria-checked="false"
            >Custom…</button>
          </div>
        </div>`);
      labelPicker.innerHTML = parts.join("");
      applyNewSectionDefaults();
      updateLabelPickerSelection();
    }

    function focusTimeInput() {
      if (!timeValue) return;
      timeValue.focus();
      const len = timeValue.value.length;
      try {
        timeValue.setSelectionRange(len, len);
      } catch (_) {
        /* some input types may not support selection */
      }
    }

    function openModal(id = null) {
      if (!modal) return;
      editingId = id;
      const item = id ? times.find((t) => t.id === id) : null;
      const isEditing = Boolean(item);
      if (isEditing) {
        setLabelValue(item.label, { expand: false });
      } else {
        setLabelValue("");
      }
      if (timeValue) timeValue.value = item ? item.value : "";
      const titleEl = $(".modal-title", modal);
      if (titleEl) titleEl.textContent = isEditing ? "Edit time" : "New time";

      if (isEditing && timeValue) timeValue.setAttribute("autofocus", "");
      modal.showModal();
      if (timeValue) timeValue.removeAttribute("autofocus");

      updateUtcDisplay();
      if (utcUpdateInterval) clearInterval(utcUpdateInterval);
      utcUpdateInterval = setInterval(updateUtcDisplay, 1000);

      if (isEditing) {
        openSectionForLabel(
          PRESET_LABELS.includes(item.label) ? item.label : CUSTOM_LABEL_KEY,
        );
        focusTimeInput();
        requestAnimationFrame(focusTimeInput);
      } else {
        applyNewSectionDefaults();
        // Dialog focuses the first control (Arrival); clear it so no focus ring shows.
        const active = document.activeElement;
        if (active && labelPicker && labelPicker.contains(active)) {
          active.blur();
        }
      }
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
        alert("Nothing to delete.");
        return;
      }
      if (!confirm("Delete all times? This cannot be undone.")) return;
      times = [];
      selectedIds.clear();
      saveTimes();
      render();
    }

    function newFlight() {
      const hasTimes = times.length > 0;
      const hasFlightNumber =
        flightNumber && flightNumber.value.trim() !== "VF";
      const hasExtraInfo = additionalInfo && additionalInfo.value.trim() !== "";
      if (!hasTimes && !hasFlightNumber && !hasExtraInfo) {
        alert("Nothing to reset.");
        return;
      }
      if (
        !confirm(
          "Start a new flight? This clears all times, the flight number, and additional information.",
        )
      )
        return;
      times = [];
      selectedIds.clear();
      if (flightNumber) flightNumber.value = "VF ";
      if (additionalInfo) {
        additionalInfo.value = "";
        autoResizeAdditionalInfo();
      }
      saveTimes();
      render();
    }

    function autoResizeAdditionalInfo() {
      if (!additionalInfo) return;
      additionalInfo.style.height = "auto";
      additionalInfo.style.height = `${additionalInfo.scrollHeight}px`;
    }

    function copyTextSync(text) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (_) {
        return false;
      }
    }

    function copyWhatsApp() {
      const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
      if (times.length === 0) {
        alert("No times to copy.");
        return;
      }
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
        ? `${bodyText}\n\n\nADDITIONAL INFO:\n\n${extraInfoText}`
        : bodyText;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      // LAN HTTP (Live Server on phone) is not a secure context, so
      // navigator.clipboard is unavailable. Use sync fallback, then open WA
      // in the same user-gesture turn (critical on mobile).
      let copied = false;
      if (
        window.isSecureContext &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        // Fire-and-forget async copy; do not gate WhatsApp on it.
        navigator.clipboard.writeText(text).then(
          () => {},
          () => {},
        );
        copied = true;
      } else {
        copied = copyTextSync(text);
      }

      const btn = isMobile ? copyWhatsAppBtn : copyWhatsAppBtnDesktop;
      if (btn && copied) {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = orig;
          updateButtons();
        }, 1500);
      }

      if (isMobile) {
        window.location.href = whatsappUrl;
        return;
      }

      const shareWindow = window.open(whatsappUrl, "_blank");
      if (!shareWindow) {
        alert(
          copied
            ? "Copied. Please allow popups to open WhatsApp share."
            : "Could not open WhatsApp. Text may not have been copied.",
        );
      }
    }

    function closeActionsMenu() {
      if (!actionsMenu || !moreBtn) return;
      actionsMenu.hidden = true;
      moreBtn.setAttribute("aria-expanded", "false");
    }

    function openActionsMenu() {
      if (!actionsMenu || !moreBtn) return;
      actionsMenu.hidden = false;
      moreBtn.setAttribute("aria-expanded", "true");
    }

    function toggleActionsMenu() {
      if (!actionsMenu) return;
      if (actionsMenu.hidden) openActionsMenu();
      else closeActionsMenu();
    }

    function showHowToUse() {
      const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
      const message = isMobile
        ? [
            "How to use:",
            "",
            "• Tap + NEW to add a time.",
            "• Tap a row to select it.",
            "• Use ⋯ next to Times to edit, delete, delete all, or reset flight.",
            "• COPY WHATSAPP (next to ⋯) shares all times.",
            "• Tap ! for this help again.",
          ].join("\n")
        : [
            "How to use:",
            "",
            "• NEW adds a time.",
            "• Select a row, then EDIT or DELETE.",
            "• DELETE ALL clears all times.",
            "• RESET FLIGHT clears times and flight details for the next flight.",
            "• COPY WHATSAPP shares all times.",
          ].join("\n");
      alert(message);
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
      newFlight: newFlight,
      copyWhatsApp: copyWhatsApp,
      toggleTheme: toggleTheme,
      showHowToUse: showHowToUse,
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
          "newFlightBtn",
          "copyWhatsAppBtn",
          "copyWhatsAppBtnDesktop",
          "howToUseBtn",
          "themeBtn",
          "fabNewBtn",
          "moreBtn",
          "menuEditBtn",
          "menuDeleteBtn",
          "menuDeleteAllBtn",
          "menuResetFlightBtn",
        ]);
        if (!handledButtonIds.has(btn.id)) return;
        // Prevent duplicate execution from inline onclick fallbacks on the same button.
        e.preventDefault();
        e.stopPropagation();

        switch (btn.id) {
          case "newBtn":
          case "fabNewBtn":
            closeActionsMenu();
            openModal();
            break;
          case "editBtn":
          case "menuEditBtn":
            closeActionsMenu();
            if (selectedIds.size > 0) openModal([...selectedIds][0]);
            else alert("Please select a row first.");
            break;
          case "deleteBtn":
          case "menuDeleteBtn":
            closeActionsMenu();
            deleteSelected();
            break;
          case "deleteAllBtn":
          case "menuDeleteAllBtn":
            closeActionsMenu();
            deleteAll();
            break;
          case "newFlightBtn":
          case "menuResetFlightBtn":
            closeActionsMenu();
            newFlight();
            break;
          case "copyWhatsAppBtn":
          case "copyWhatsAppBtnDesktop":
            closeActionsMenu();
            copyWhatsApp();
            break;
          case "howToUseBtn":
            closeActionsMenu();
            showHowToUse();
            break;
          case "themeBtn":
            closeActionsMenu();
            toggleTheme();
            break;
          case "moreBtn":
            toggleActionsMenu();
            break;
          default:
            break;
        }
      },
      true,
    );

    document.addEventListener("click", (e) => {
      if (!actionsMenu || actionsMenu.hidden) return;
      if (e.target.closest("#moreBtn") || e.target.closest("#actionsMenu")) {
        return;
      }
      closeActionsMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeActionsMenu();
    });

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
    if (labelPicker) {
      labelPicker.addEventListener("click", (e) => {
        const toggle = e.target.closest(".label-group-toggle");
        if (toggle && labelPicker.contains(toggle)) {
          const group = toggle.closest(".label-group");
          if (!group) return;
          const willOpen = group.classList.contains("is-section-collapsed");
          group.classList.toggle("is-section-collapsed", !willOpen);
          toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
          return;
        }

        const btn = e.target.closest(".label-option");
        if (!btn || !labelPicker.contains(btn)) return;
        const value = btn.dataset.value || "";
        const collapsed =
          labelPicker.classList.contains("is-collapsed") &&
          Boolean(selectedLabelKey);
        if (collapsed && value === selectedLabelKey) {
          labelPickerExpanded = true;
          openSectionForLabel(value);
          updateLabelPickerSelection();
          return;
        }
        selectLabelKey(value, { focusCustom: true });
        if (value !== CUSTOM_LABEL_KEY) focusTimeInput();
      });
    }
    if (timeLabelCustom) {
      timeLabelCustom.addEventListener("input", updateCustomOptionLabel);
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

    if (additionalInfo) {
      additionalInfo.addEventListener("input", autoResizeAdditionalInfo);
      autoResizeAdditionalInfo();
    }

    loadTheme();
    loadTimes();
    renderLabelPicker();
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
