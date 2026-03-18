import { boliviaTaxData } from './data/countries/bolivia.js';

const svg = document.querySelector('#tree-canvas');
const detailTitle = document.querySelector('#detail-title');
const detailContent = document.querySelector('#detail-content');
const summaryContent = document.querySelector('#summary-content');
const countryPill = document.querySelector('#country-pill');
const updatedPill = document.querySelector('#updated-pill');
const resetButton = document.querySelector('#reset-button');

let state = {
  dataset: null,
  activeId: null,
  selectedIds: new Set()
};

const fmtCurrency = (value, currency = 'BOB') =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(value)
    : 'Not loaded';

const createSvgElement = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
};

const flattenNodes = (dataset) => {
  const groups = dataset.groups.map((group) => ({ ...group, kind: 'group' }));
  const taxes = dataset.groups.flatMap((group) =>
    group.taxes.map((tax) => ({ ...tax, parentId: group.id, parentLabel: group.label, kind: 'tax' }))
  );
  return [...groups, ...taxes];
};

const getNode = (id) => flattenNodes(state.dataset).find((item) => item.id === id);

const renderDetail = (node) => {
  if (!node) {
    detailTitle.textContent = 'Select a node';
    detailContent.innerHTML = `
      <div class="empty-state">
        Click any glowing node in the folio to inspect its role, rates, notes, and editable revenue inputs.
      </div>
    `;
    return;
  }

  detailTitle.textContent = node.name || node.label;

  if (node.kind === 'group') {
    detailContent.innerHTML = `
      <div class="meta-grid">
        <div class="meta-card"><span>Layer</span><strong>${node.label}</strong></div>
        <div class="meta-card"><span>Connected taxes</span><strong>${node.taxes.length}</strong></div>
      </div>
      <p class="detail-copy">${node.description}</p>
      <div class="stat-grid">
        <div class="stat-card"><span>Loaded revenue</span><strong>${fmtCurrency(
          node.taxes.reduce((sum, tax) => sum + (tax.revenue || 0), 0),
          state.dataset.currency
        )}</strong></div>
        <div class="stat-card"><span>Rates in this branch</span><strong>${node.taxes
          .map((tax) => tax.rate)
          .join(' · ')}</strong></div>
      </div>
      <div class="source-list">
        ${node.taxes
          .map(
            (tax) =>
              `<div class="source-item"><strong>${tax.label}</strong><br>${tax.name}<br><span class="muted-label">${tax.rate}</span></div>`
          )
          .join('')}
      </div>
    `;
    return;
  }

  const checked = state.selectedIds.has(node.id) ? 'checked' : '';
  detailContent.innerHTML = `
    <div class="meta-grid">
      <div class="meta-card"><span>Government level</span><strong>${node.scope}</strong></div>
      <div class="meta-card"><span>Displayed rate</span><strong>${node.rate}</strong></div>
      <div class="meta-card"><span>Revenue value</span><strong>${fmtCurrency(node.revenue, state.dataset.currency)}</strong></div>
      <div class="meta-card"><span>Branch</span><strong>${node.parentLabel}</strong></div>
    </div>
    <label class="check-row">
      <input id="select-tax" type="checkbox" ${checked} />
      Include this tax in the revenue sandbox
    </label>
    <p class="detail-copy">${node.description}</p>
    <div class="stat-grid">
      ${node.notes
        .map((note, index) => `<div class="stat-card"><span>Note ${index + 1}</span><strong>${note}</strong></div>`)
        .join('')}
    </div>
    <div class="source-list">
      <div class="source-item"><span>Source / maintenance note</span><strong>${node.source}</strong></div>
    </div>
  `;

  detailContent.querySelector('#select-tax')?.addEventListener('change', () => {
    toggleSelection(node.id);
  });
};

const renderSummary = () => {
  const allTaxes = flattenNodes(state.dataset).filter((item) => item.kind === 'tax');
  const selectedTaxes = allTaxes.filter((tax) => state.selectedIds.has(tax.id));
  const selectedRevenue = selectedTaxes.reduce((sum, tax) => sum + (tax.revenue || 0), 0);
  const totalRevenue = state.dataset.revenueContext.amount;
  const pct = totalRevenue ? (selectedRevenue / totalRevenue) * 100 : 0;

  summaryContent.innerHTML = `
    <span class="muted-label">${state.dataset.revenueContext.label}</span>
    <div class="summary-total">${fmtCurrency(selectedRevenue, state.dataset.currency)}</div>
    <p class="summary-copy">${selectedTaxes.length} tax node(s) selected, representing ${pct.toFixed(
      2
    )}% of the currently loaded total.</p>
    <div class="progress-shell"><div class="progress-bar" style="width: ${Math.min(pct, 100)}%"></div></div>
    <p class="summary-copy">${state.dataset.revenueContext.coverageNote}</p>
    <div class="selection-list">
      ${
        selectedTaxes.length
          ? selectedTaxes
              .map(
                (tax) => `
            <div class="selection-item">
              <strong>${tax.label} · ${tax.parentLabel}</strong><br>
              ${tax.name}<br>
              <span class="muted-label">${tax.rate} · ${fmtCurrency(tax.revenue, state.dataset.currency)}</span>
            </div>`
              )
              .join('')
          : '<div class="empty-state">Select one or more tax nodes to simulate their share of the loaded revenue total.</div>'
      }
    </div>
  `;
};

const drawTree = () => {
  svg.querySelectorAll('.rendered').forEach((node) => node.remove());
  const renderedGroup = createSvgElement('g', { class: 'rendered' });
  const dataset = state.dataset;

  dataset.groups.forEach((group) => {
    group.taxes.forEach((tax) => {
      const path = createSvgElement('path', {
        class: `link-line ${state.activeId === tax.id || state.activeId === group.id ? 'active' : ''}`,
        d: `M ${group.position.x} ${group.position.y} C ${group.position.x} ${group.position.y + 110}, ${tax.position.x} ${tax.position.y - 110}, ${tax.position.x} ${tax.position.y}`
      });
      renderedGroup.appendChild(path);
    });
  });

  const makeNode = (item, radius) => {
    const group = createSvgElement('g', {
      class: `node ${item.kind} ${state.activeId === item.id ? 'active' : ''} ${state.selectedIds.has(item.id) ? 'selected' : ''}`,
      transform: `translate(${item.position.x}, ${item.position.y})`,
      tabindex: '0',
      role: 'button',
      'aria-label': item.name || item.label
    });

    const outer = createSvgElement('circle', { class: 'node-ring', r: radius });
    const inner = createSvgElement('circle', { class: 'node-core', r: radius - 8 });
    const label = createSvgElement('text', { class: 'node-label', y: -2 });
    label.textContent = item.label;
    const value = createSvgElement('text', { class: 'node-value', y: 18 });
    value.textContent = item.kind === 'group' ? `${item.taxes.length} taxes` : item.rate;

    group.append(outer, inner, label, value);
    group.addEventListener('click', () => activateNode(item.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateNode(item.id);
      }
    });
    renderedGroup.appendChild(group);
  };

  dataset.groups.forEach((group) => makeNode({ ...group, kind: 'group' }, 62));
  dataset.groups.forEach((group) => group.taxes.forEach((tax) => makeNode({ ...tax, kind: 'tax' }, 50)));

  svg.appendChild(renderedGroup);
};

const activateNode = (id) => {
  state.activeId = id;
  renderDetail(getNode(id));
  renderSummary();
  drawTree();
};

const toggleSelection = (id) => {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  renderDetail(getNode(state.activeId));
  renderSummary();
  drawTree();
};

const renderSourcePills = () => {
  countryPill.textContent = `${state.dataset.country} · ${state.dataset.currency}`;
  updatedPill.textContent = `Updated ${state.dataset.lastUpdated}`;
};

const init = async () => {
  state.dataset = boliviaTaxData;
  renderSourcePills();
  renderDetail(null);
  renderSummary();
  drawTree();

  resetButton.addEventListener('click', () => {
    state.selectedIds.clear();
    state.activeId = null;
    renderDetail(null);
    renderSummary();
    drawTree();
  });
};

init().catch((error) => {
  detailTitle.textContent = 'Failed to load data';
  detailContent.innerHTML = `<div class="empty-state">${error.message}</div>`;
});
