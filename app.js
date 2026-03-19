import { boliviaTaxData } from './data/countries/bolivia.js';

const svg = document.querySelector('#tree-canvas');
const treeLayer = document.querySelector('#tree-layer');
const panLayer = document.querySelector('#pan-layer');
const viewport = document.querySelector('#tree-viewport');
const detailTitle = document.querySelector('#detail-title');
const detailContent = document.querySelector('#detail-content');
const summaryContent = document.querySelector('#summary-content');
const countryPill = document.querySelector('#country-pill');
const updatedPill = document.querySelector('#updated-pill');
const resetButton = document.querySelector('#reset-button');
const resetViewButton = document.querySelector('#reset-view-button');
const activeCount = document.querySelector('#active-count');
const selectedRevenueLabel = document.querySelector('#selected-revenue');
const coverageValue = document.querySelector('#coverage-value');

let cachedNodes = [];
const initialTransform = { scale: 1, x: 0, y: 0 };

const state = {
  dataset: null,
  activeId: null,
  selectedIds: new Set(),
  view: { ...initialTransform },
  drag: {
    isDragging: false,
    originX: 0,
    originY: 0,
    startX: 0,
    startY: 0
  }
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
    group.taxes.map((tax) => ({
      ...tax,
      parentId: group.id,
      parentLabel: group.label,
      kind: 'tax'
    }))
  );
  return [...groups, ...taxes];
};

const getNode = (id) => cachedNodes.find((item) => item.id === id);
const getTaxNodes = () => cachedNodes.filter((item) => item.kind === 'tax');

const computeSelectedRevenue = () =>
  getTaxNodes()
    .filter((tax) => state.selectedIds.has(tax.id))
    .reduce((sum, tax) => sum + (tax.revenue || 0), 0);

const updateHud = () => {
  const selectedRevenue = computeSelectedRevenue();
  const total = state.dataset.revenueContext.amount || 0;
  const selectedCount = state.selectedIds.size;
  const totalCount = getTaxNodes().length;
  const coverage = total ? (selectedRevenue / total) * 100 : 0;

  activeCount.textContent = `${selectedCount} / ${totalCount}`;
  selectedRevenueLabel.textContent = fmtCurrency(selectedRevenue, state.dataset.currency);
  coverageValue.textContent = `${coverage.toFixed(1)}%`;
};

const renderDetail = (node) => {
  if (!node) {
    detailTitle.textContent = 'Tax folio briefing';
    detailContent.innerHTML = `
      <div class="info-banner">
        <span>How to use</span>
        Start with the fully selected tree, click any node to inspect its core info, then toggle it in or out of the revenue sandbox.
      </div>
      <div class="meta-grid">
        <div class="meta-card"><span>Country</span><strong>${state.dataset.country}</strong></div>
        <div class="meta-card"><span>Loaded nodes</span><strong>${cachedNodes.length}</strong></div>
      </div>
      <p class="detail-copy">${state.dataset.notes}</p>
      <div class="source-list">
        ${state.dataset.sources
          .map(
            (source) => `<a class="source-item" href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`
          )
          .join('')}
      </div>
    `;
    return;
  }

  detailTitle.textContent = node.name || node.label;

  if (node.kind === 'group') {
    const groupRevenue = node.taxes.reduce((sum, tax) => sum + (tax.revenue || 0), 0);
    detailContent.innerHTML = `
      <div class="meta-grid">
        <div class="meta-card"><span>Government layer</span><strong>${node.label}</strong></div>
        <div class="meta-card"><span>Tax nodes</span><strong>${node.taxes.length}</strong></div>
        <div class="meta-card"><span>Revenue shown</span><strong>${fmtCurrency(groupRevenue, state.dataset.currency)}</strong></div>
        <div class="meta-card"><span>Selection status</span><strong>${node.taxes.filter((tax) => state.selectedIds.has(tax.id)).length} selected</strong></div>
      </div>
      <p class="detail-copy">${node.description}</p>
      <ul class="bullet-list">
        ${node.taxes.map((tax) => `<li><strong>${tax.label}</strong> — ${tax.name} <span class="muted-label">${tax.rate}</span></li>`).join('')}
      </ul>
    `;
    return;
  }

  const isSelected = state.selectedIds.has(node.id);
  detailContent.innerHTML = `
    <div class="meta-grid">
      <div class="meta-card"><span>Layer</span><strong>${node.scope}</strong></div>
      <div class="meta-card"><span>Rate</span><strong>${node.rate}</strong></div>
      <div class="meta-card"><span>Revenue collected</span><strong>${fmtCurrency(node.revenue, state.dataset.currency)}</strong></div>
      <div class="meta-card"><span>Branch</span><strong>${node.parentLabel}</strong></div>
    </div>
    <button id="toggle-tax" class="ghost-button toggle-button">${isSelected ? 'Deselect from sandbox' : 'Select into sandbox'}</button>
    <p class="detail-copy">${node.description}</p>
    <ul class="bullet-list">
      ${node.notes.map((note) => `<li>${note}</li>`).join('')}
    </ul>
    <div class="source-list">
      <div class="source-item"><span>Maintenance note</span><strong>${node.source}</strong></div>
    </div>
  `;

  detailContent.querySelector('#toggle-tax')?.addEventListener('click', () => toggleSelection(node.id));
};

const renderSummary = () => {
  const selectedTaxes = getTaxNodes().filter((tax) => state.selectedIds.has(tax.id));
  const selectedRevenue = computeSelectedRevenue();
  const totalRevenue = state.dataset.revenueContext.amount;
  const pct = totalRevenue ? (selectedRevenue / totalRevenue) * 100 : 0;

  summaryContent.innerHTML = `
    <span class="muted-label">${state.dataset.revenueContext.label}</span>
    <div class="summary-total">${fmtCurrency(selectedRevenue, state.dataset.currency)}</div>
    <p class="summary-copy">${selectedTaxes.length} selected tax node(s), representing ${pct.toFixed(2)}% of the loaded total.</p>
    <div class="progress-shell"><div class="progress-bar" style="width: ${Math.min(pct, 100)}%"></div></div>
    <p class="summary-copy">${state.dataset.revenueContext.coverageNote}</p>
    <div class="selection-list">
      ${selectedTaxes
        .map(
          (tax) => `
          <div class="selection-item">
            <strong>${tax.label} · ${tax.parentLabel}</strong><br />
            ${tax.name}<br />
            <span class="muted-label">${tax.rate} · ${fmtCurrency(tax.revenue, state.dataset.currency)}</span>
          </div>`
        )
        .join('')}
    </div>
  `;

  updateHud();
};

const createLinkPath = (from, to) => {
  const dx = to.x - from.x;
  const curve = Math.max(90, Math.abs(dx) * 0.35);
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + curve}, ${to.x} ${to.y - curve}, ${to.x} ${to.y}`;
};

const createSigil = (item) => {
  if (item.kind === 'group') {
    return createSvgElement('path', {
      class: 'node-sigil',
      d: 'M -14 0 L 0 -14 L 14 0 L 0 14 Z'
    });
  }

  return createSvgElement('path', {
    class: 'node-sigil',
    d: 'M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z'
  });
};

const drawTree = () => {
  treeLayer.replaceChildren();

  state.dataset.groups.forEach((group) => {
    group.taxes.forEach((tax) => {
      const isHighlighted = state.activeId === group.id || state.activeId === tax.id;
      const isSelected = state.selectedIds.has(tax.id);
      const path = createSvgElement('path', {
        class: `link-line ${isHighlighted ? 'active' : ''} ${isSelected ? 'selected' : ''}`,
        d: createLinkPath(group.position, tax.position)
      });
      treeLayer.appendChild(path);
    });
  });

  const makeNode = (item, radius) => {
    const node = createSvgElement('g', {
      class: `node ${item.kind} ${state.activeId === item.id ? 'active' : ''} ${state.selectedIds.has(item.id) ? 'selected' : ''}`,
      transform: `translate(${item.position.x}, ${item.position.y})`,
      tabindex: '0',
      role: 'button',
      'aria-label': item.name || item.label
    });

    const halo = createSvgElement('circle', { class: 'node-border', r: radius + 10 });
    const outer = createSvgElement('circle', { class: 'node-ring', r: radius });
    const inner = createSvgElement('circle', { class: 'node-core', r: radius - 9 });
    const sigil = createSigil(item);
    const label = createSvgElement('text', { class: 'node-label', y: 4 });
    label.textContent = item.label;
    const value = createSvgElement('text', { class: 'node-value', y: radius + 22 });
    value.textContent = item.kind === 'group' ? `${item.taxes.length} taxes` : item.rate;

    node.append(halo, outer, inner, sigil, label, value);
    node.addEventListener('click', () => activateNode(item.id));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateNode(item.id);
      }
    });

    treeLayer.appendChild(node);
  };

  state.dataset.groups.forEach((group) => makeNode({ ...group, kind: 'group' }, 64));
  state.dataset.groups.forEach((group) => group.taxes.forEach((tax) => makeNode({ ...tax, kind: 'tax' }, 46)));
};

const applyPanZoom = () => {
  panLayer.setAttribute('transform', `translate(${state.view.x} ${state.view.y}) scale(${state.view.scale})`);
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setView = (nextView) => {
  state.view = {
    scale: clamp(nextView.scale, 0.7, 2.25),
    x: clamp(nextView.x, -420, 420),
    y: clamp(nextView.y, -260, 280)
  };
  applyPanZoom();
};

const bindPanZoom = () => {
  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.12 : -0.12;
    setView({ ...state.view, scale: state.view.scale + delta });
  });

  viewport.addEventListener('pointerdown', (event) => {
    state.drag.isDragging = true;
    state.drag.originX = event.clientX;
    state.drag.originY = event.clientY;
    state.drag.startX = state.view.x;
    state.drag.startY = state.view.y;
    viewport.classList.add('dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!state.drag.isDragging) {
      return;
    }

    setView({
      ...state.view,
      x: state.drag.startX + (event.clientX - state.drag.originX),
      y: state.drag.startY + (event.clientY - state.drag.originY)
    });
  });

  const endDrag = (event) => {
    if (state.drag.isDragging) {
      state.drag.isDragging = false;
      viewport.classList.remove('dragging');
      if (event?.pointerId !== undefined && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    }
  };

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointerleave', endDrag);
};

const init = async () => {
  state.dataset = boliviaTaxData;
  cachedNodes = flattenNodes(state.dataset);
  state.selectedIds = new Set(getTaxNodes().map((tax) => tax.id));

  renderSourcePills();
  renderDetail(null);
  renderSummary();
  drawTree();
  applyPanZoom();
  bindPanZoom();

  resetButton.addEventListener('click', () => {
    state.selectedIds = new Set(getTaxNodes().map((tax) => tax.id));
    renderDetail(getNode(state.activeId));
    renderSummary();
    drawTree();
  });

  resetViewButton.addEventListener('click', () => setView(initialTransform));
};

init().catch((error) => {
  detailTitle.textContent = 'Failed to load data';
  detailContent.innerHTML = `<div class="empty-state">${error.message}</div>`;
});
