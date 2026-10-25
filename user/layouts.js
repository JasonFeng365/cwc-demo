/* Swap or restyle these renderers while keeping the shared settings catalog. */
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

window.STUDY_LAYOUTS = [
  {
    id: 'vertical-list',
    title: 'Vertical List',
    render: () => window.SETTINGS_SECTIONS.map((section) => `
      <section class="settings-section">
        <h3>${escapeHtml(section.title)}</h3>
        <div class="option-list">${section.items.map((item) => {
          const target = section.id === 'account-settings' && item === 'Log out';
          return `<button class="option-row" ${target ? 'data-action="success"' : ''}>${escapeHtml(item)}<span>›</span></button>`;
        }).join('')}</div>
      </section>`).join('')
  },
  {
    id: 'grid',
    title: 'Grid',
    render: () => `<div class="settings-grid">${window.SETTINGS_SECTIONS.map((section) => `
      <section class="settings-card">
        <h3>${escapeHtml(section.title)}</h3>
        <div class="card-options">${section.items.map((item) => {
          const target = section.id === 'account-settings' && item === 'Log out';
          return `<button class="option-chip" ${target ? 'data-action="success"' : ''}>${escapeHtml(item)}</button>`;
        }).join('')}</div>
      </section>`).join('')}</div>`
  },
  {
    id: 'search',
    title: 'Search Bar',
    render: () => `
      <label class="search-box"><span>⌕</span><input type="search" data-action="search" placeholder="Search settings" aria-label="Search settings"></label>
      <div class="search-hint" data-search-hint>Search across all sections and settings</div>
      <div class="search-results" data-search-results></div>`
  },
  {
    id: 'hierarchical-menu',
    title: 'Hierarchical Menu',
    render: () => `
      <p class="menu-path" data-menu-path>Settings and activity</p>
      <div class="menu-sections">${window.SETTINGS_SECTIONS.map((section) => `
        <section class="menu-section">
          <button class="menu-row" data-action="open-section" data-section="${section.id}">
            <span>${escapeHtml(section.title)}</span><span class="chevron">›</span>
          </button>
          <div class="menu-options" data-options="${section.id}" hidden>
            ${section.items.map((item) => {
              const target = section.id === 'account-settings' && item === 'Log out';
              return `<button class="option-row" ${target ? 'data-action="success"' : ''}>${escapeHtml(item)}<span>›</span></button>`;
            }).join('')}
          </div>
        </section>`).join('')}</div>`
  }
];
