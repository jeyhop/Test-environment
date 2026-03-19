import { boliviaTaxData } from './data/countries/bolivia.js';

const INITIAL_VIEWBOX = { x: 0, y: 0, width: 1400, height: 900 };
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.9;

const svg = document.querySelector('#tree-canvas');
const treeStage = document.querySelector('#tree-stage');
const treeBackdrop = document.querySelector('#tree-backdrop');
const viewport = document.querySelector('#canvas-viewport');
const detailTitle = document.querySelector('#detail-title');
const detailContent = document.querySelector('#detail-content');
const summaryContent = document.querySelector('#summary-content');
const countryPill = document.querySelector('#country-pill');
const updatedPill = document.querySelector('#updated-pill');
const resetButton = document.querySelector('#reset-button');
const recenterButton = document.querySelector('#recenter-button');
const zoomButtons = document.querySelectorAll('[data-zoom]');

const state = {
  dataset: boliviaTaxData,
  activeId: null,
  selectedIds: new Set(),
  viewBox: { ...INITIAL_VIEWBOX },
  drag: null
};

const fmtCurrency = (value) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: state.dataset.currency,
        maximumFractionDigits: 0
      }).format(value)
    : 'Not loaded';

const createSvgElement = (tag, attrs = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

const getTaxes = () => state.dataset.groups.flatMap((group) => group.taxes.map((tax) => ({ ...tax, parent: group })));

const getGroups = () => state.dataset.groups;

const getNodeById = (id) => {
  for (const group of getGroups()) {
    if (group.id === id) {
      return { ...group, kind: 'group' };
    }
    const tax = group.taxes.find((entry) => entry.id === id);
    if (tax) {
      return { ...tax, parent: group, kind: 'tax' };
    }
  }
  return null;
};

const getBranchKey = (groupId) => {
  if (groupId === 'national') return 'national';
  if (groupId === 'departmental') return 'departmental';
  return 'municipal';
};

const setViewBox = () => {
  const { x, y, width, height } = state.viewBox;
  svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
};

const zoom = (factor) => {
  const nextWidth = INITIAL_VIEWBOX.width * factor;
  const nextHeight = INITIAL_VIEWBOX.height * factor;
  const centerX = state.viewBox.x + state.viewBox.width / 2;
  const centerY = state.viewBox.y + state.viewBox.height / 2;

  state.viewBox.width = Math.min(INITIAL_VIEWBOX.width * MAX_ZOOM, Math.max(INITIAL_VIEWBOX.width * MIN_ZOOM, nextWidth));
  state.viewBox.height = Math.min(INITIAL_VIEWBOX.height * MAX_ZOOM, Math.max(INITIAL_VIEWBOX.height * MIN_ZOOM, nextHeight));
  state.viewBox.x = centerX - state.viewBox.width / 2;
  state.viewBox.y = centerY - state.viewBox.height / 2;
  setViewBox();
};

const screenToSvgDelta = (dx, dy) => ({
  dx: (dx / viewport.clientWidth) * state.viewBox.width,
  dy: (dy / viewport.clientHeight) * state.viewBox.height
});

const renderBackdrop = () => {
  treeBackdrop.innerHTML = '';

  [180, 280, 420, 560].forEach((radius) => {
    treeBackdrop.appendChild(createSvgElement('circle', {
      class: 'backdrop-ring',
      cx: 990,
      cy: 510,
      r: radius
    }));
  });

  [
    { x: 160, y: 170, size: 180 },
    { x: 640, y: 250, size: 220 },
    { x: 1020, y: 640, size: 300 }
  ].forEach((orb) => {
    treeBackdrop.appendChild(createSvgElement('circle', {
      cx: orb.x,
      cy: orb.y,
      r: orb.size,
      fill: 'rgba(88, 64, 27, 0.05)'
    }));
  });

  const script = createSvgElement('text', {
    class: 'backdrop-script',
    x: 770,
    y: 215,
    transform: 'rotate(-7 770 215)'
  });
  script.textContent = 'Bolivia · National / Departmental / Municipal';
  treeBackdrop.appendChild(script);
};

const renderSummary = () => {
  const taxes = getTaxes();
  const selectedTaxes = taxes.filter((tax) => state.selectedIds.has(tax.id));
  const totalRevenue = state.dataset.revenueContext.amount;
  const selectedRevenue = selectedTaxes.reduce((sum, tax) => sum + (tax.revenue || 0), 0);
  const percentage = totalRevenue ? (selectedRevenue / totalRevenue) * 100 : 0;
  const byBranch = getGroups().map((group) => {
    const revenue = group.taxes
      .filter((tax) => state.selectedIds.has(tax.id))
      .reduce((sum, tax) => sum + (tax.revenue || 0), 0);
    return { label: group.label, revenue };
  });

  summaryContent.innerHTML = `
    <p class="summary-copy">${selectedTaxes.length} of ${taxes.length} tax nodes are currently selected.</p>
    <div class="summary-total">${fmtCurrency(selectedRevenue)}</div>
    <p class="summary-copy">This equals ${percentage.toFixed(1)}% of the loaded Bolivia total revenue context.</p>
    <div class="progress-shell"><div class="progress-bar" style="width:${Math.min(percentage, 100)}%"></div></div>
    <div class="branch-breakdown">
      ${byBranch
        .map(
          (entry) => `
            <div class="branch-item">
              <strong>${entry.label}</strong><br>
              <span>${fmtCurrency(entry.revenue)}</span>
            </div>`
        )
        .join('')}
    </div>
    <div class="selection-list">
      ${selectedTaxes
        .map(
          (tax) => `
            <div class="selection-item">
              <strong>${tax.label}</strong> · ${tax.parent.label}<br>
              <span>${tax.rate} · ${fmtCurrency(tax.revenue)}</span>
            </div>`
        )
        .join('')}
    </div>
  `;
};

const renderDetail = (node) => {
  if (!node) {
    detailTitle.textContent = 'All tax nodes active';
    detailContent.innerHTML = `
      <div class="info-empty">
        Every Bolivia tax node starts selected so you immediately see the full loaded revenue total. Click any glowing node to focus its tax card, then click the same node again to toggle it in or out of the total.
      </div>
    `;
    return;
  }

  if (node.kind === 'group') {
    const groupRevenue = node.taxes.reduce((sum, tax) => sum + (tax.revenue || 0), 0);
    detailTitle.textContent = node.label;
    detailContent.innerHTML = `
      <div class="info-core">
        <div class="info-card"><span>Layer</span><strong>${node.label}</strong></div>
        <div class="info-card"><span>Connected taxes</span><strong>${node.taxes.length}</strong></div>
        <div class="info-card"><span>Revenue loaded</span><strong>${fmtCurrency(groupRevenue)}</strong></div>
      </div>
    `;
    return;
  }

  detailTitle.textContent = node.name;
  detailContent.innerHTML = `
    <div class="info-core">
      <div class="info-card"><span>Branch</span><strong>${node.parent.label}</strong></div>
      <div class="info-card"><span>Rate</span><strong>${node.rate}</strong></div>
      <div class="info-card"><span>Revenue collected</span><strong>${fmtCurrency(node.revenue)}</strong></div>
      <div class="info-card"><span>Status in total</span><strong>${state.selectedIds.has(node.id) ? 'Included' : 'Excluded'}</strong></div>
    </div>
  `;
};

const drawTree = () => {
  treeStage.innerHTML = '';

  getGroups().forEach((group) => {
    group.taxes.forEach((tax) => {
      const active = state.activeId === group.id || state.activeId === tax.id || state.selectedIds.has(tax.id);
      treeStage.appendChild(createSvgElement('path', {
        class: `link-line ${active ? '' : 'muted'}`,
        d: `M ${group.position.x} ${group.position.y} C ${group.position.x + 40} ${group.position.y + 90}, ${tax.position.x - 50} ${tax.position.y - 90}, ${tax.position.x} ${tax.position.y}`
      }));
    });
  });

  const renderNode = (item, options) => {
    const node = createSvgElement('g', {
      class: `node ${options.kind} ${state.activeId === item.id ? 'active' : ''} ${state.selectedIds.has(item.id) ? 'selected' : ''}`,
      transform: `translate(${item.position.x}, ${item.position.y})`,
      tabindex: '0',
      role: 'button',
      'aria-label': item.name || item.label,
      'data-branch': options.branch
    });

    node.append(
      createSvgElement('circle', { class: 'node-plate', r: options.radius + 18 }),
      createSvgElement('circle', { class: 'node-ring', r: options.radius + 6 }),
      createSvgElement('circle', { class: 'node-core', r: options.radius })
    );

    const glyph = createSvgElement('text', { class: 'node-glyph', y: 8, 'font-size': options.glyphSize });
    glyph.textContent = options.glyph;
    const label = createSvgElement('text', { class: 'node-label', y: options.radius + 42 });
    label.textContent = item.label;
    const sub = createSvgElement('text', { class: 'node-sub', y: options.radius + 62 });
    sub.textContent = options.kind === 'group' ? `${item.taxes.length} TAXES` : item.rate;

    node.append(glyph, label, sub);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      if (options.kind === 'tax' && state.activeId === item.id) {
        toggleTax(item.id);
      } else {
        state.activeId = item.id;
        renderDetail(getNodeById(item.id));
        drawTree();
      }
    });
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        node.dispatchEvent(new Event('click'));
      }
    });

    treeStage.appendChild(node);
  };

  getGroups().forEach((group) => renderNode(group, {
    kind: 'group',
    branch: getBranchKey(group.id),
    radius: 34,
    glyphSize: 24,
    glyph: group.glyph || '◈'
  }));

  getTaxes().forEach((tax) => renderNode(tax, {
    kind: 'tax',
    branch: getBranchKey(tax.parent.id),
    radius: 24,
    glyphSize: 18,
    glyph: tax.glyph || '✦'
  }));
};

const toggleTax = (id) => {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  state.activeId = id;
  renderDetail(getNodeById(id));
  renderSummary();
  drawTree();
};

const selectAllTaxes = () => {
  state.selectedIds = new Set(getTaxes().map((tax) => tax.id));
  state.activeId = null;
  renderDetail(null);
  renderSummary();
  drawTree();
};

const attachCanvasInteractions = () => {
  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.node')) {
      return;
    }

    state.drag = { x: event.clientX, y: event.clientY };
    viewport.classList.add('dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!state.drag) {
      return;
    }

    const delta = screenToSvgDelta(event.clientX - state.drag.x, event.clientY - state.drag.y);
    state.viewBox.x -= delta.dx;
    state.viewBox.y -= delta.dy;
    state.drag = { x: event.clientX, y: event.clientY };
    setViewBox();
  });

  viewport.addEventListener('pointerup', (event) => {
    state.drag = null;
    viewport.classList.remove('dragging');
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  });

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const nextFactor = state.viewBox.width / INITIAL_VIEWBOX.width + (event.deltaY > 0 ? 0.12 : -0.12);
    zoom(nextFactor);
  }, { passive: false });

  svg.addEventListener('click', () => {
    state.activeId = null;
    renderDetail(null);
    drawTree();
  });
};

const init = () => {
  countryPill.textContent = state.dataset.country;
  updatedPill.textContent = state.dataset.lastUpdated;

  renderBackdrop();
  setViewBox();
  selectAllTaxes();
  attachCanvasInteractions();

  resetButton.addEventListener('click', selectAllTaxes);
  recenterButton.addEventListener('click', () => {
    state.viewBox = { ...INITIAL_VIEWBOX };
    setViewBox();
  });

  zoomButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const delta = button.dataset.zoom === 'in' ? -0.12 : 0.12;
      const nextFactor = state.viewBox.width / INITIAL_VIEWBOX.width + delta;
      zoom(nextFactor);
    });
  });
};

init();
