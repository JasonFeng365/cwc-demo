(() => {
  const $ = (selector) => document.querySelector(selector);
  let socket;
  let activeLayout;
  let layoutIndex = 0;
  let userId;
  let testId;
  let startedAt = 0;
  let clicks = 0;
  let scrollDistance = 0;
  let previousScrollY = window.scrollY;
  let previousPanelScroll = 0;
  let submitting = false;
  let pendingPayload = null;

  const notice = $('#notice');
  const study = $('#study');
  const demo = $('#demo');
  const countdownEl = $('#countdown');
  const errorEl = $('#error');
  const progress = $('#progress');

  function prepareLayouts() {
    demo.innerHTML = window.STUDY_LAYOUTS.map((layout) => `
      <article class="layout-panel" data-layout="${layout.id}" hidden>
        <h2>${layout.title}</h2>
        <div class="prototype">${layout.render()}</div>
      </article>`).join('');
  }

  function showLayout(index) {
    if (index >= window.STUDY_LAYOUTS.length) {
      study.hidden = true;
      $('#finished').hidden = false;
      progress.textContent = 'Complete';
      activeLayout = null;
      return;
    }
    const layout = window.STUDY_LAYOUTS[index];
    activeLayout = layout.id;
    layoutIndex = index;
    demo.querySelectorAll('.layout-panel').forEach((panel) => {
      panel.hidden = panel.dataset.layout !== layout.id;
    });
    clicks = 0;
    scrollDistance = 0;
    previousScrollY = window.scrollY;
    previousPanelScroll = 0;
    const prototype = demo.querySelector(`[data-layout="${layout.id}"] .prototype`);
    if (prototype) prototype.scrollTop = 0;
    startedAt = performance.now();
    submitting = false;
    pendingPayload = null;
    errorEl.hidden = true;
    progress.textContent = `Layout ${index + 1} of ${window.STUDY_LAYOUTS.length}`;
  }

  async function runCountdown(seconds) {
    notice.hidden = true;
    countdownEl.hidden = false;
    for (let remaining = seconds; remaining > 0; remaining--) {
      countdownEl.textContent = remaining;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    countdownEl.textContent = 'Go!';
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    countdownEl.hidden = true;
    study.hidden = false;
    $('#finished').hidden = true;
    showLayout(0);
  }

  async function submitResult() {
    if (submitting || !activeLayout) return;
    submitting = true;
    errorEl.hidden = true;
    if (!pendingPayload) {
      pendingPayload = {
        user_id: userId,
        test_id: testId,
        ui_type: activeLayout,
        total_time: Math.round((performance.now() - startedAt) / 10) / 100,
        click_count: clicks,
        scroll_distance: Math.round(scrollDistance),
        success_status: true
      };
    }
    try {
      const response = await fetch(`${window.APP_CONFIG.backend.replace(/\/$/, '')}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPayload)
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      await response.json();
      showLayout(layoutIndex + 1);
    } catch (error) {
      submitting = false;
      errorEl.innerHTML = `Could not send your result. Check your connection and <button class="retry" data-action="retry">retry</button>.`;
      errorEl.hidden = false;
      console.error(error);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function updateSearch(input) {
    const query = input.value.trim().toLowerCase();
    const results = demo.querySelector('[data-search-results]');
    const hint = demo.querySelector('[data-search-hint]');
    if (!query) {
      results.innerHTML = '';
      hint.textContent = 'Search across all sections and settings';
      return;
    }
    const matches = [];
    window.SETTINGS_SECTIONS.forEach((section) => {
      if (section.title.toLowerCase().includes(query)) {
        matches.push(`<button class="search-result"><b>${escapeHtml(section.title)}</b><small>Section</small></button>`);
      }
      section.items.forEach((item) => {
        if (item.toLowerCase().includes(query)) {
          const target = section.id === 'account-settings' && item === 'Log out';
          matches.push(`<button class="search-result${target ? ' target-option' : ''}" ${target ? 'data-action="success"' : ''}><b>${escapeHtml(item)}</b><small>${escapeHtml(section.title)}</small></button>`);
        }
      });
    });
    results.innerHTML = matches.join('');
    hint.textContent = matches.length ? 'Search results' : 'No matching settings';
  }

  function onDemoClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button || !demo.contains(button) || !activeLayout || submitting) return;
    switch (button.dataset.action) {
      case 'success':
        submitResult();
        break;
      case 'search':
        updateSearch(button);
        break;
      case 'open-section': {
        demo.querySelectorAll('[data-options]').forEach((options) => {
          options.hidden = options.dataset.options !== button.dataset.section;
        });
        const section = window.SETTINGS_SECTIONS.find((item) => item.id === button.dataset.section);
        demo.querySelector('[data-menu-path]').textContent = `Settings and activity  ›  ${section.title}`;
        break;
      }
    }
  }

  function init(config) {
    userId = localStorage.getItem('hybrid-study-user-id');
    if (!userId) {
      userId = `participant-${crypto.randomUUID()}`;
      localStorage.setItem('hybrid-study-user-id', userId);
    }
    prepareLayouts();
    demo.addEventListener('click', onDemoClick);
    demo.addEventListener('input', (event) => {
      if (event.target.matches('[data-action="search"]')) updateSearch(event.target);
    });
    demo.addEventListener('mousedown', (event) => {
      if (activeLayout && event.target.closest('button, input, select, textarea, a')) clicks++;
    });
    errorEl.addEventListener('mousedown', (event) => {
      if (activeLayout && event.target.closest('button')) clicks++;
    });
    errorEl.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="retry"]')) submitResult();
    });
    window.addEventListener('scroll', () => {
      if (!activeLayout) return;
      const current = window.scrollY;
      scrollDistance += Math.abs(current - previousScrollY);
      previousScrollY = current;
    }, { passive: true });
    demo.addEventListener('scroll', (event) => {
      if (!activeLayout || !event.target.classList.contains('prototype')) return;
      const current = event.target.scrollTop;
      scrollDistance += Math.abs(current - previousPanelScroll);
      previousPanelScroll = current;
    }, true);

    socket = io(config.backend, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      socket.emit('register', { role: 'user' });
      notice.textContent = 'Connected. Waiting for the facilitator to start the test.';
    });
    socket.on('disconnect', () => {
      if (!activeLayout) notice.textContent = 'Connection lost. Reconnecting…';
    });
    socket.on('waiting', (data) => { notice.textContent = data.message; });
    socket.on('start_test', (data) => {
      activeLayout = null;
      study.hidden = true;
      prepareLayouts();
      testId = data.test_id;
      $('#finished').hidden = true;
      runCountdown(Number(data.countdown) || 0);
    });
  }

  window.CONFIG_READY.then(init).catch((error) => {
    notice.textContent = `Setup error: ${error.message}. Check public/config.json.`;
    console.error(error);
  });
})();
