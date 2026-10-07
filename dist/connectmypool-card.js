(async () => {
  try {
    await customElements.whenDefined('ha-panel-lovelace');
  } catch (e) {
    // Ignore load-order differences.
  }

  try {
    /* ConnectMyPool Lovelace Card v1.2.0
     *
     * Dashboard card for the ConnectMyPool integration.
     * - Channels are multi-state mode selectors (Off / Auto / On, filter pump speeds).
     * - Legacy channel switches from older integration versions are still supported.
     * - Active Favourite is a selector.
     * - Responsive layout and native visual editor.
     * - Interactive controls show clear busy feedback while HA/API calls complete.
     */

    const _panel = customElements.get('ha-panel-lovelace');
    const _haLit = window.LitElement;
    const LitElement =
      _haLit ||
      (_panel ? Object.getPrototypeOf(_panel) : null) ||
      Object.getPrototypeOf(customElements.get('ha-card') || HTMLElement);

    const html = window.html || LitElement.prototype.html;
    const css = window.css || LitElement.prototype.css;

    console.info('[connectmypool-card] loaded v1.2.0');

    function domainFromEntityId(entityId) {
      if (!entityId || typeof entityId !== 'string') return null;
      const idx = entityId.indexOf('.');
      return idx > 0 ? entityId.slice(0, idx) : null;
    }

    // Pending channel changes stay visible until the (lagging) cloud status catches up.
    const PENDING_TIMEOUT_MS = 90000;

    const CHANNEL_ICONS = {
      1: 'mdi:pump',
      3: 'mdi:heat-pump',
      12: 'mdi:hot-tub',
      18: 'mdi:weather-windy',
    };

    function isChannelSelect(st) {
      if (!st || domainFromEntityId(st.entity_id) !== 'select') return false;
      const ch = st.attributes?.channel_number;
      return ch !== undefined && ch !== null && !isNaN(Number(ch));
    }

    // Heater-pump channels energise heating circulation; keep them off the card unless opted in.
    function isHeaterPumpChannel(st) {
      const fn = Number(st.attributes?.function);
      const name = String(st.attributes?.friendly_name || st.entity_id).toLowerCase();
      return fn === 3 || name.includes('heat');
    }

    function modeTone(option) {
      const o = String(option || '').toLowerCase();
      if (o === 'off') return 'off';
      if (o === 'auto') return 'auto';
      return 'on';
    }

    function normalizeList(list) {
      return Array.isArray(list) ? list : [];
    }

    function normalizeItem(item) {
      if (typeof item === 'string') return { entity: item };
      if (item && typeof item === 'object' && item.entity) return item;
      return null;
    }

    function firstEntity(hass, predicate) {
      if (!hass?.states) return undefined;
      const match = Object.values(hass.states).find((st) => {
        try {
          return predicate(st);
        } catch (e) {
          return false;
        }
      });
      return match?.entity_id;
    }

    function connectMyPoolStub(hass) {
      const config = {
        type: 'custom:connectmypool-card',
        title: 'Swimming Pool',
        auto_discover: true,
        show_unavailable: false,
      };

      const temperature = firstEntity(
        hass,
        (st) =>
          domainFromEntityId(st.entity_id) === 'sensor' &&
          st.entity_id.includes('connectmypool') &&
          (st.entity_id.includes('pool_water_temperature') || st.attributes?.device_class === 'temperature'),
      );
      const favourite = firstEntity(
        hass,
        (st) =>
          domainFromEntityId(st.entity_id) === 'select' &&
          st.entity_id.includes('connectmypool') &&
          st.entity_id.includes('active_favourite'),
      );
      const heater = firstEntity(
        hass,
        (st) => domainFromEntityId(st.entity_id) === 'climate' && st.entity_id.includes('connectmypool'),
      );
      const poolSpa = firstEntity(
        hass,
        (st) =>
          domainFromEntityId(st.entity_id) === 'select' &&
          st.entity_id.includes('connectmypool') &&
          st.entity_id.includes('pool_spa'),
      );
      const solar = firstEntity(
        hass,
        (st) => domainFromEntityId(st.entity_id) === 'water_heater' && st.entity_id.includes('connectmypool'),
      );

      if (temperature) config.temperature = temperature;
      if (favourite) config.favourite = favourite;
      if (heater) config.heater = heater;
      if (poolSpa) config.pool_spa = poolSpa;
      if (solar) config.solar = solar;
      return config;
    }

    class ConnectMyPoolCard extends LitElement {
      static get properties() {
        return {
          hass: {},
          _config: {},
        };
      }

      constructor() {
        super();
        this._busyEntities = new Set();
        this._busyLabels = new Map();
        this._pending = new Map();
      }

      static getConfigElement() {
        return document.createElement('connectmypool-card-editor');
      }

      static getStubConfig(hass) {
        return connectMyPoolStub(hass);
      }

      setConfig(config) {
        if (!config) throw new Error('Invalid configuration');
        this._config = {
          title: config.title ?? 'ConnectMyPool',
          temperature: config.temperature,
          pool_spa: config.pool_spa,
          favourite: config.favourite,
          heater: config.heater,
          solar: config.solar,
          channels: normalizeList(config.channels).map(normalizeItem).filter(Boolean),
          valves: normalizeList(config.valves).map(normalizeItem).filter(Boolean),
          lights: normalizeList(config.lights).map(normalizeItem).filter(Boolean),
          extra: normalizeList(config.extra).map(normalizeItem).filter(Boolean),
          auto_discover: config.auto_discover !== false,
          show_unavailable: config.show_unavailable === true,
          show_heater_pump: config.show_heater_pump === true,
        };
      }

      getCardSize() {
        const c = this._config || {};
        const n =
          (c.channels?.length || 0) +
          (c.valves?.length || 0) +
          (c.lights?.length || 0) +
          (c.extra?.length || 0);
        return 3 + Math.ceil(n / 2);
      }

      static get styles() {
        return css`
          :host { display: block; min-width: 0; }
          ha-card { padding: 16px; overflow: hidden; }
          .top {
            display: flex; gap: 16px; align-items: baseline;
            justify-content: space-between; flex-wrap: wrap; min-width: 0;
          }
          .title { font-size: 1.1rem; font-weight: 600; line-height: 1.2; }
          .temp {
            font-size: 2.2rem; font-weight: 700;
            letter-spacing: -0.02em; white-space: nowrap;
          }
          .header-controls {
            display: flex; gap: 10px; align-items: center;
            flex-wrap: wrap; margin-top: 10px; min-width: 0;
          }
          .header-control { display: flex; align-items: center; gap: 8px; min-width: 0; }
          .header-label {
            font-size: 0.85rem; color: var(--secondary-text-color); white-space: nowrap;
          }
          .header-control ha-select {
            width: 220px; max-width: min(220px, 70vw); min-width: 150px;
          }
          .chip {
            padding: 6px 10px; border-radius: 999px;
            background: var(--secondary-background-color);
            font-size: 0.85rem; white-space: nowrap;
          }
          .section { margin-top: 14px; min-width: 0; }
          .section h3 {
            margin: 10px 0 6px; font-size: 0.9rem;
            font-weight: 600; opacity: 0.85;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
            gap: 10px; min-width: 0;
          }
          .row {
            display: flex; align-items: center; justify-content: space-between;
            gap: 10px; min-width: 0; max-width: 100%; box-sizing: border-box;
            padding: 10px 12px; border-radius: 12px;
            background: var(--card-background-color);
            box-shadow: 0 1px 0 rgba(0,0,0,0.05) inset;
            border: 1px solid var(--divider-color);
          }
          .row.select-row { grid-column: 1 / -1; flex-wrap: wrap; }
          .row.select-row .left { flex: 1 1 180px; }
          .row.select-row .controls { margin-left: auto; }
          .left {
            display: flex; align-items: center; gap: 10px;
            flex: 1 1 0; min-width: 0; cursor: pointer;
          }
          .left-text { min-width: 0; flex: 1 1 0; }
          ha-icon { color: var(--secondary-text-color); flex: 0 0 auto; }
          .name {
            font-weight: 600; font-size: 0.92rem; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
          }
          .state {
            font-size: 0.82rem; opacity: 0.8; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
          }
          .state.updating { color: var(--primary-color); opacity: 1; font-weight: 500; }
          .controls {
            display: flex; align-items: center; gap: 8px;
            flex: 0 1 auto; min-width: 0; max-width: 70%;
          }
          .controls ha-select { width: 180px; max-width: 100%; min-width: 135px; }
          .btn {
            border-radius: 999px; border: 1px solid var(--divider-color);
            padding: 6px 10px; background: transparent; cursor: pointer;
            font-size: 0.8rem; white-space: nowrap;
          }
          .btn[active] {
            background: var(--primary-color); color: var(--text-primary-color);
            border-color: var(--primary-color);
          }
          .btn:disabled { opacity: 0.55; cursor: default; }
          .modes { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
          .btn[pending] {
            border-color: var(--primary-color); border-style: dashed;
            color: var(--primary-color); opacity: 1;
          }
          ha-icon.tone-off { color: var(--disabled-text-color, var(--secondary-text-color)); }
          ha-icon.tone-auto { color: var(--primary-color); }
          ha-icon.tone-on { color: var(--state-active-color, var(--state-icon-active-color, #fdd835)); }
          .slider { width: 150px; max-width: 34vw; }
          .spinner {
            width: 18px; height: 18px; flex: 0 0 18px;
            box-sizing: border-box; border-radius: 50%;
            border: 2px solid var(--divider-color);
            border-top-color: var(--primary-color);
            animation: cmp-spin 0.8s linear infinite;
          }
          .busy-control {
            min-width: 180px;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-sizing: border-box;
            padding: 8px 12px;
            background: var(--secondary-background-color);
            border-radius: 8px;
            color: var(--primary-color);
            font-size: 0.86rem;
            font-weight: 500;
            white-space: nowrap;
          }
          .header-control .busy-control { width: 220px; }
          @keyframes cmp-spin { to { transform: rotate(360deg); } }
          .muted { opacity: 0.65; }

          @media (max-width: 560px) {
            ha-card { padding: 12px; }
            .temp { font-size: 1.9rem; }
            .header-control { width: 100%; }
            .header-control ha-select {
              flex: 1 1 auto; width: auto; max-width: none;
            }
            .header-control .busy-control { flex: 1 1 auto; width: auto; }
            .row { align-items: flex-start; flex-wrap: wrap; }
            .controls {
              flex: 1 1 100%; width: 100%; max-width: none; justify-content: flex-end;
            }
            .controls ha-select { flex: 1 1 auto; width: 100%; max-width: none; }
            .busy-control { flex: 1 1 auto; width: 100%; min-width: 0; }
            .slider { flex: 1 1 140px; width: auto; max-width: none; }
          }
        `;
      }

      _state(entityId) { return this.hass?.states?.[entityId]; }
      _available(entityId) {
        const st = this._state(entityId);
        return !!st && !['unavailable', 'unknown'].includes(st.state);
      }
      _friendlyName(entityId) {
        const st = this._state(entityId);
        return st?.attributes?.friendly_name || entityId;
      }
      _displayName(entityId, item = {}) {
        let name = item.name || this._friendlyName(entityId);
        const title = this._config?.title;
        if (title && name.startsWith(`${title} `)) name = name.slice(title.length + 1);
        return name;
      }
      _formatState(entityId) {
        const st = this._state(entityId);
        if (!st) return 'unavailable';
        const uom = st.attributes?.unit_of_measurement;
        const s = st.state;
        if (uom && s !== 'unknown' && s !== 'unavailable') return `${s} ${uom}`;
        return s;
      }
      _isBusy(entityId) { return this._busyEntities.has(entityId); }
      _busyLabel(entityId) { return this._busyLabels.get(entityId) || 'Updating…'; }

      async _runBusy(entityId, action, label = 'Updating…') {
        if (!entityId || this._isBusy(entityId)) return;
        this._busyEntities.add(entityId);
        this._busyLabels.set(entityId, label);
        this.requestUpdate();
        try {
          // Force one rendered frame before starting a potentially slow cloud call.
          await this.updateComplete;
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await action();
        } catch (err) {
          console.error(`[connectmypool-card] action failed for ${entityId}`, err);
        } finally {
          this._busyEntities.delete(entityId);
          this._busyLabels.delete(entityId);
          this.requestUpdate();
        }
      }

      _call(domain, service, data) {
        return this.hass.callService(domain, service, data);
      }
      _toggle(entityId) {
        const d = domainFromEntityId(entityId);
        if (!['switch', 'light'].includes(d)) return;
        const current = this._state(entityId)?.state;
        const target = current === 'on' ? 'Off' : 'On';
        return this._runBusy(
          entityId,
          () => this._call(d, 'toggle', { entity_id: entityId }),
          `Switching ${target}…`,
        );
      }
      _closeSelect(control) {
        if (!control) return;
        try { control.blur?.(); } catch (e) { /* ignore */ }
        try { if ('open' in control) control.open = false; } catch (e) { /* ignore */ }
        try { if ('menuOpen' in control) control.menuOpen = false; } catch (e) { /* ignore */ }
        try {
          const inner = control.shadowRoot?.querySelector('mwc-select, md-select');
          inner?.blur?.();
          if (inner && 'open' in inner) inner.open = false;
          if (inner && 'menuOpen' in inner) inner.menuOpen = false;
        } catch (e) { /* ignore */ }
      }
      _handleSelect(entityId, ev) {
        const control = ev?.currentTarget;
        const option = control?.value ?? ev?.target?.value;
        this._closeSelect(control);
        return this._setSelect(entityId, option);
      }
      _setSelect(entityId, option) {
        if (!option || this._state(entityId)?.state === option) return;
        return this._runBusy(
          entityId,
          () => this._call('select', 'select_option', { entity_id: entityId, option }),
          `Updating to ${option}…`,
        );
      }
      _setChannelMode(entityId, option) {
        if (!option || this._isBusy(entityId)) return;
        if (this._state(entityId)?.state === option && !this._pending.has(entityId)) return;
        this._pending.set(entityId, { target: option, until: Date.now() + PENDING_TIMEOUT_MS });
        return this._runBusy(
          entityId,
          async () => {
            try {
              await this._call('select', 'select_option', { entity_id: entityId, option });
            } catch (err) {
              this._pending.delete(entityId);
              throw err;
            }
            this._schedulePendingExpiry();
          },
          `Changing to ${option}…`,
        );
      }
      _pendingTarget(entityId) {
        const p = this._pending.get(entityId);
        if (!p) return null;
        const st = this._state(entityId);
        if (Date.now() > p.until || st?.state === p.target) {
          this._pending.delete(entityId);
          return null;
        }
        return p.target;
      }
      _schedulePendingExpiry() {
        if (this._pendingTimer) return;
        this._pendingTimer = setInterval(() => {
          for (const id of [...this._pending.keys()]) this._pendingTarget(id);
          if (!this._pending.size) {
            clearInterval(this._pendingTimer);
            this._pendingTimer = null;
          }
          this.requestUpdate();
        }, 2000);
      }
      disconnectedCallback() {
        super.disconnectedCallback?.();
        if (this._pendingTimer) clearInterval(this._pendingTimer);
        this._pendingTimer = null;
      }
      _setClimateMode(entityId, hvac_mode) {
        return this._runBusy(
          entityId,
          () => this._call('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode }),
          `Setting ${hvac_mode}…`,
        );
      }
      _setClimateTemp(entityId, temperature) {
        return this._runBusy(
          entityId,
          () => this._call('climate', 'set_temperature', { entity_id: entityId, temperature }),
          `Setting ${temperature}°…`,
        );
      }
      _setWaterHeaterMode(entityId, operation_mode) {
        return this._runBusy(
          entityId,
          () => this._call('water_heater', 'set_operation_mode', { entity_id: entityId, operation_mode }),
          `Setting ${operation_mode}…`,
        );
      }
      _setWaterHeaterTemp(entityId, temperature) {
        return this._runBusy(
          entityId,
          () => this._call('water_heater', 'set_temperature', { entity_id: entityId, temperature }),
          `Setting ${temperature}°…`,
        );
      }
      _moreInfo(entityId) {
        const event = new Event('hass-more-info', { bubbles: true, composed: true });
        event.detail = { entityId };
        this.dispatchEvent(event);
      }
      _spinner(entityId) {
        return this._isBusy(entityId)
          ? html`<span class="spinner" role="status" title=${this._busyLabel(entityId)}></span>`
          : html``;
      }
      _busyControl(entityId) {
        return html`
          <div class="busy-control" role="status">
            ${this._spinner(entityId)}
            <span>${this._busyLabel(entityId)}</span>
          </div>
        `;
      }

      _renderChip(label, entityId) {
        if (!entityId) return null;
        const st = this._state(entityId);
        if (!st || (!this._config.show_unavailable && ['unavailable', 'unknown'].includes(st.state))) return null;
        return html`<div class="chip">${label}: ${st.state}</div>`;
      }

      _renderFavourite(entityId) {
        if (!entityId) return null;
        const st = this._state(entityId);
        if (!st || (!this._config.show_unavailable && ['unavailable', 'unknown'].includes(st.state))) return null;
        if (domainFromEntityId(entityId) !== 'select') return this._renderChip('Favourite', entityId);
        const options = st.attributes?.options || [];
        const busy = this._isBusy(entityId);
        return html`
          <div class="header-control">
            <span class="header-label">Favourite</span>
            ${busy
              ? this._busyControl(entityId)
              : html`
                  <ha-select
                    .value=${st.state}
                    @selected=${(ev) => this._handleSelect(entityId, ev)}
                  >
                    ${options.map((o) => html`<mwc-list-item .value=${o}>${o}</mwc-list-item>`)}
                  </ha-select>
                `}
          </div>
        `;
      }

      _discoverChannels() {
        if (!this._config.auto_discover || !this.hass?.states) return [];
        const usable = (st) => !['unavailable', 'unknown'].includes(st.state);
        const hasChannel = (st) => {
          const ch = st.attributes?.channel_number;
          return ch !== undefined && ch !== null && !isNaN(Number(ch));
        };
        const byChannel = (a, b) => Number(a.attributes.channel_number) - Number(b.attributes.channel_number);
        const states = Object.values(this.hass.states).filter(usable);

        // Channel mode selects (every channel, including the filter pump). Disabled
        // entities (e.g. the Heater Pump by default) have no state and are skipped.
        // Heater-pump channels are only discovered when show_heater_pump is set.
        const selects = states.filter((st) =>
          isChannelSelect(st) && (this._config.show_heater_pump || !isHeaterPumpChannel(st)));
        const covered = new Set(selects.map((st) => Number(st.attributes.channel_number)));

        // Legacy on/off channel switches, only for channels without a mode select.
        const switches = states.filter((st) =>
          domainFromEntityId(st.entity_id) === 'switch' &&
          hasChannel(st) &&
          !covered.has(Number(st.attributes.channel_number)) &&
          (this._config.show_heater_pump || !isHeaterPumpChannel(st)));

        return [...selects, ...switches].sort(byChannel).map((st) => ({ entity: st.entity_id }));
      }

      _mergeItems(explicit, discovered = []) {
        const result = [];
        const seen = new Set();
        const add = (item) => {
          if (!item?.entity || seen.has(item.entity)) return;
          const st = this._state(item.entity);
          if (!st) return;
          if (!this._config.show_unavailable && ['unavailable', 'unknown'].includes(st.state)) return;
          seen.add(item.entity);
          result.push(item);
        };
        for (const item of explicit || []) add(item);
        for (const item of discovered || []) add(item);
        return result;
      }

      _renderRow(item) {
        const entityId = item.entity;
        const st = this._state(entityId);
        const domain = domainFromEntityId(entityId);
        const channel = isChannelSelect(st);
        const icon = item.icon || st?.attributes?.icon ||
          (channel ? CHANNEL_ICONS[Number(st.attributes.function)] : null) || null;
        const name = this._displayName(entityId, item);
        const busy = this._isBusy(entityId);
        const pending = channel && !busy ? this._pendingTarget(entityId) : null;
        const stateText = busy
          ? this._busyLabel(entityId)
          : pending
            ? `${this._formatState(entityId)} → ${pending} (waiting for controller…)`
            : this._formatState(entityId);
        const selectClass = domain === 'select' ? 'row select-row' : 'row';
        const iconClass = channel && !['unavailable', 'unknown'].includes(st.state)
          ? `tone-${modeTone(st.state)}`
          : '';
        return html`
          <div class=${selectClass}>
            <div class="left" @click=${() => this._moreInfo(entityId)}>
              <ha-icon class=${iconClass} .icon=${icon || 'mdi:pool'}></ha-icon>
              <div class="left-text">
                <div class="name" title=${name}>${name}</div>
                <div class=${busy || pending ? 'state updating' : 'state'}>${stateText}</div>
              </div>
            </div>
            <div class="controls">${this._renderControls(domain, entityId, st)}</div>
          </div>
        `;
      }

      _renderControls(domain, entityId, st) {
        if (!st || ['unavailable', 'unknown'].includes(st.state)) return html``;
        const busy = this._isBusy(entityId);

        if (domain === 'switch' || domain === 'light') {
          const isOn = st.state === 'on';
          return html`
            ${this._spinner(entityId)}
            <button class="btn" ?active=${isOn} ?disabled=${busy} @click=${() => this._toggle(entityId)}>
              ${isOn ? 'On' : 'Off'}
            </button>
          `;
        }

        if (domain === 'select' && isChannelSelect(st)) {
          const options = st.attributes?.options || [];
          const target = this._pending.get(entityId)?.target;
          return html`
            ${this._spinner(entityId)}
            <div class="modes" role="group">
              ${options.map((o) => html`
                <button
                  class="btn"
                  ?active=${st.state === o}
                  ?pending=${target === o && st.state !== o}
                  ?disabled=${busy}
                  aria-pressed=${st.state === o ? 'true' : 'false'}
                  @click=${() => this._setChannelMode(entityId, o)}
                >${o}</button>
              `)}
            </div>
          `;
        }

        if (domain === 'select') {
          const options = st.attributes?.options || [];
          if (busy) return this._busyControl(entityId);
          return html`
            <ha-select
              .value=${st.state}
              @selected=${(ev) => this._handleSelect(entityId, ev)}
            >
              ${options.map((o) => html`<mwc-list-item .value=${o}>${o}</mwc-list-item>`)}
            </ha-select>
          `;
        }

        if (domain === 'climate') {
          const modes = st.attributes?.hvac_modes || ['off', 'heat'];
          const current = st.state;
          const minTemp = st.attributes?.min_temp ?? 10;
          const maxTemp = st.attributes?.max_temp ?? 40;
          const target = st.attributes?.temperature;
          const modeBtns = modes
            .filter((m) => ['off', 'heat', 'cool'].includes(m))
            .map((m) => html`
              <button
                class="btn"
                ?active=${current === m}
                ?disabled=${busy}
                @click=${() => this._setClimateMode(entityId, m)}
              >${m}</button>
            `);
          return html`
            ${this._spinner(entityId)}
            ${modeBtns}
            ${typeof target === 'number' || (target && !isNaN(Number(target)))
              ? html`
                  <ha-slider
                    class="slider"
                    .min=${minTemp}
                    .max=${maxTemp}
                    .step=${1}
                    .value=${Number(target)}
                    ?disabled=${busy}
                    @change=${(ev) => this._setClimateTemp(entityId, Number(ev.target.value))}
                  ></ha-slider>
                `
              : html``}
          `;
        }

        if (domain === 'water_heater') {
          const opList = st.attributes?.operation_list || st.attributes?.operation_modes || ['Off', 'Auto', 'On'];
          const opMode = st.attributes?.operation_mode || st.attributes?.current_operation || st.state;
          const minTemp = st.attributes?.min_temp ?? 10;
          const maxTemp = st.attributes?.max_temp ?? 40;
          const target = st.attributes?.temperature;
          const modeBtns = opList
            .filter((m) => ['Off', 'Auto', 'On'].includes(m))
            .map((m) => html`
              <button
                class="btn"
                ?active=${opMode === m || st.state === m}
                ?disabled=${busy}
                @click=${() => this._setWaterHeaterMode(entityId, m)}
              >${m}</button>
            `);
          return html`
            ${this._spinner(entityId)}
            ${modeBtns}
            ${typeof target === 'number' || (target && !isNaN(Number(target)))
              ? html`
                  <ha-slider
                    class="slider"
                    .min=${minTemp}
                    .max=${maxTemp}
                    .step=${1}
                    .value=${Number(target)}
                    ?disabled=${busy}
                    @change=${(ev) => this._setWaterHeaterTemp(entityId, Number(ev.target.value))}
                  ></ha-slider>
                `
              : html``}
          `;
        }
        return html``;
      }

      _section(title, items) {
        const filtered = (items || []).filter((item) => {
          const st = this._state(item.entity);
          if (!st) return false;
          if (this._config.show_unavailable) return true;
          return !['unavailable', 'unknown'].includes(st.state);
        });
        if (!filtered.length) return null;
        return html`
          <div class="section">
            <h3>${title}</h3>
            <div class="grid">${filtered.map((it) => this._renderRow(it))}</div>
          </div>
        `;
      }

      render() {
        if (!this.hass || !this._config) return html``;
        const cfg = this._config;
        const tempText = cfg.temperature && this._available(cfg.temperature)
          ? this._formatState(cfg.temperature)
          : '—';
        const heaterRows = cfg.heater && this._available(normalizeItem(cfg.heater)?.entity)
          ? [normalizeItem(cfg.heater)].filter(Boolean)
          : [];
        const solarRows = cfg.solar && this._available(normalizeItem(cfg.solar)?.entity)
          ? [normalizeItem(cfg.solar)].filter(Boolean)
          : [];
        const channelRows = this._mergeItems(cfg.channels, this._discoverChannels());
        const valveRows = this._mergeItems(cfg.valves);
        const lightRows = this._mergeItems(cfg.lights);
        const extraRows = this._mergeItems(cfg.extra);
        const favouriteControl = this._renderFavourite(cfg.favourite);
        const poolSpaChip = this._renderChip('Mode', cfg.pool_spa);

        return html`
          <ha-card>
            <div class="top">
              <div class="title">${cfg.title}</div>
              <div class="temp">${tempText}</div>
            </div>
            ${favouriteControl || poolSpaChip
              ? html`<div class="header-controls">${favouriteControl}${poolSpaChip}</div>`
              : html``}
            ${this._section('Heater', heaterRows)}
            ${this._section('Solar', solarRows)}
            ${this._section('Channels', channelRows)}
            ${this._section('Valves', valveRows)}
            ${this._section('Lights', lightRows)}
            ${this._section('Extra', extraRows)}
          </ha-card>
        `;
      }
    }

    class ConnectMyPoolCardEditor extends LitElement {
      static get properties() {
        return { hass: {}, _config: {} };
      }
      setConfig(config) { this._config = { ...config }; }
      static get styles() {
        return css`
          :host { display: block; padding: 4px 0 12px; }
          .section { margin: 0 0 18px; }
          .section-title { font-size: 1rem; font-weight: 600; margin: 4px 0 10px; }
          .field { margin: 0 0 12px; }
          ha-textfield, ha-entity-picker { display: block; width: 100%; }
          .toggle { display: flex; align-items: center; min-height: 44px; }
          .hint {
            color: var(--secondary-text-color); font-size: 0.86rem;
            line-height: 1.4; margin-top: 6px;
          }
          .advanced { padding-top: 4px; border-top: 1px solid var(--divider-color); }
        `;
      }
      _fireConfigChanged(config) {
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config }, bubbles: true, composed: true,
        }));
      }
      _setValue(key, value) {
        const config = { ...this._config };
        if (value === undefined || value === null || value === '') delete config[key];
        else config[key] = value;
        this._config = config;
        this._fireConfigChanged(config);
      }
      _textChanged(key, ev) { this._setValue(key, ev?.target?.value ?? ''); }
      _entityChanged(key, ev) {
        this._setValue(key, ev?.detail?.value ?? ev?.target?.value ?? '');
      }
      _toggleChanged(key, ev) { this._setValue(key, !!ev?.target?.checked); }
      _entityPicker(label, key, domains) {
        return html`
          <div class="field">
            <ha-entity-picker
              .hass=${this.hass}
              .value=${this._config?.[key] || ''}
              .label=${label}
              .includeDomains=${domains}
              .allowCustomEntity=${true}
              @value-changed=${(ev) => this._entityChanged(key, ev)}
            ></ha-entity-picker>
          </div>
        `;
      }
      render() {
        if (!this.hass || !this._config) return html``;
        const autoDiscover = this._config.auto_discover !== false;
        const showUnavailable = this._config.show_unavailable === true;
        return html`
          <div class="section">
            <div class="section-title">General</div>
            <div class="field">
              <ha-textfield
                label="Card title"
                .value=${this._config.title || ''}
                @input=${(ev) => this._textChanged('title', ev)}
              ></ha-textfield>
            </div>
            ${this._entityPicker('Pool water temperature', 'temperature', ['sensor'])}
            ${this._entityPicker('Active favourite', 'favourite', ['select'])}
            ${this._entityPicker('Heater', 'heater', ['climate'])}
          </div>
          <div class="section">
            <div class="section-title">Discovery</div>
            <div class="toggle">
              <ha-formfield label="Automatically discover ConnectMyPool channels">
                <ha-switch
                  .checked=${autoDiscover}
                  @change=${(ev) => this._toggleChanged('auto_discover', ev)}
                ></ha-switch>
              </ha-formfield>
            </div>
            <div class="hint">
              Recommended. The card automatically finds every enabled channel mode selector
              (Filter Pump, Spa Jets, Spa Blower, …) from the integration's channel metadata.
            </div>
            <div class="toggle">
              <ha-formfield label="Show Heater Pump channel">
                <ha-switch
                  .checked=${this._config.show_heater_pump === true}
                  @change=${(ev) => this._toggleChanged('show_heater_pump', ev)}
                ></ha-switch>
              </ha-formfield>
            </div>
            <div class="toggle">
              <ha-formfield label="Show unavailable entities">
                <ha-switch
                  .checked=${showUnavailable}
                  @change=${(ev) => this._toggleChanged('show_unavailable', ev)}
                ></ha-switch>
              </ha-formfield>
            </div>
          </div>
          <div class="section advanced">
            <div class="section-title">Optional</div>
            ${this._entityPicker('Pool / Spa selector', 'pool_spa', ['select'])}
            ${this._entityPicker('Solar water heater', 'solar', ['water_heater'])}
            <div class="hint">
              Manual channel, valve, light and extra-entity lists remain available in YAML for advanced
              layouts. Existing YAML-only options are preserved when this editor is used.
            </div>
          </div>
        `;
      }
    }

    if (!customElements.get('connectmypool-card-editor')) {
      customElements.define('connectmypool-card-editor', ConnectMyPoolCardEditor);
    }
    if (!customElements.get('connectmypool-card')) {
      customElements.define('connectmypool-card', ConnectMyPoolCard);
    }

    window.customCards = window.customCards || [];
    const alreadyRegistered = window.customCards.some((card) => card.type === 'connectmypool-card');
    if (!alreadyRegistered) {
      window.customCards.push({
        type: 'connectmypool-card',
        name: 'ConnectMyPool Card',
        description: 'A dashboard card for the ConnectMyPool integration.',
        preview: true,
        documentationURL: 'https://github.com/Lazy-Ace/lovelace-connectmypool-card',
      });
    }
  } catch (e) {
    console.error('[connectmypool-card] failed to load', e);
  }
})();