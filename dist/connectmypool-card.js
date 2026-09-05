(async () => {
  try {
    await customElements.whenDefined('ha-panel-lovelace');
  } catch (e) {
    // Ignore load-order differences.
  }

  try {
    /* ConnectMyPool Lovelace Card v1.0.3
     *
     * Lightweight custom card for the ConnectMyPool integration.
     * v1.0.3 understands the filter pump as a multi-state select and can
     * auto-discover channel entities by the integration's channel metadata.
     */

    const _panel = customElements.get('ha-panel-lovelace');
    const _haLit = window.LitElement;
    const LitElement =
      _haLit ||
      (_panel ? Object.getPrototypeOf(_panel) : null) ||
      Object.getPrototypeOf(customElements.get('ha-card') || HTMLElement);

    const html = window.html || LitElement.prototype.html;
    const css = window.css || LitElement.prototype.css;

    console.info('[connectmypool-card] loaded v1.0.3');

    function domainFromEntityId(entityId) {
      if (!entityId || typeof entityId !== 'string') return null;
      const idx = entityId.indexOf('.');
      return idx > 0 ? entityId.slice(0, idx) : null;
    }

    function normalizeList(list) {
      return Array.isArray(list) ? list : [];
    }

    function normalizeItem(item) {
      if (typeof item === 'string') return { entity: item };
      if (item && typeof item === 'object' && item.entity) return item;
      return null;
    }

    class ConnectMyPoolCard extends LitElement {
      static get properties() {
        return {
          hass: {},
          _config: {},
        };
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
          ha-card {
            padding: 16px;
          }
          .top {
            display: flex;
            gap: 16px;
            align-items: baseline;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          .title {
            font-size: 1.1rem;
            font-weight: 600;
            line-height: 1.2;
          }
          .temp {
            font-size: 2.2rem;
            font-weight: 700;
            letter-spacing: -0.02em;
          }
          .chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin: 10px 0 2px 0;
          }
          .chip {
            padding: 6px 10px;
            border-radius: 999px;
            background: var(--secondary-background-color);
            font-size: 0.85rem;
          }
          .section {
            margin-top: 14px;
          }
          .section h3 {
            margin: 10px 0 6px 0;
            font-size: 0.9rem;
            font-weight: 600;
            opacity: 0.85;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          @media (min-width: 520px) {
            .grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          .row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 12px;
            background: var(--card-background-color);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) inset;
            border: 1px solid var(--divider-color);
          }
          .left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            cursor: pointer;
          }
          ha-icon {
            color: var(--secondary-text-color);
          }
          .name {
            font-weight: 600;
            font-size: 0.92rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 220px;
          }
          .state {
            font-size: 0.82rem;
            opacity: 0.8;
          }
          .controls {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
          ha-select {
            min-width: 145px;
          }
          .btn {
            border-radius: 999px;
            border: 1px solid var(--divider-color);
            padding: 6px 10px;
            background: transparent;
            cursor: pointer;
            font-size: 0.8rem;
          }
          .btn[active] {
            background: var(--primary-color);
            color: var(--text-primary-color);
            border-color: var(--primary-color);
          }
          .slider {
            width: 160px;
          }
          .muted {
            opacity: 0.65;
          }
        `;
      }

      _state(entityId) {
        return this.hass?.states?.[entityId];
      }

      _available(entityId) {
        const st = this._state(entityId);
        return !!st && !['unavailable', 'unknown'].includes(st.state);
      }

      _friendlyName(entityId) {
        const st = this._state(entityId);
        return st?.attributes?.friendly_name || entityId;
      }

      _formatState(entityId) {
        const st = this._state(entityId);
        if (!st) return 'unavailable';
        const uom = st.attributes?.unit_of_measurement;
        const s = st.state;
        if (uom && s !== 'unknown' && s !== 'unavailable') return `${s} ${uom}`;
        return s;
      }

      _call(domain, service, data) {
        return this.hass.callService(domain, service, data);
      }

      _toggle(entityId) {
        const d = domainFromEntityId(entityId);
        if (d === 'switch') return this._call('switch', 'toggle', { entity_id: entityId });
        if (d === 'light') return this._call('light', 'toggle', { entity_id: entityId });
        return null;
      }

      _setSelect(entityId, option) {
        return this._call('select', 'select_option', { entity_id: entityId, option });
      }

      _setClimateMode(entityId, hvac_mode) {
        return this._call('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode });
      }

      _setClimateTemp(entityId, temperature) {
        return this._call('climate', 'set_temperature', { entity_id: entityId, temperature });
      }

      _setWaterHeaterMode(entityId, operation_mode) {
        return this._call('water_heater', 'set_operation_mode', { entity_id: entityId, operation_mode });
      }

      _setWaterHeaterTemp(entityId, temperature) {
        return this._call('water_heater', 'set_temperature', { entity_id: entityId, temperature });
      }

      _moreInfo(entityId) {
        const event = new Event('hass-more-info', { bubbles: true, composed: true });
        event.detail = { entityId };
        this.dispatchEvent(event);
      }

      _renderChip(label, entityId) {
        if (!entityId) return null;
        const st = this._state(entityId);
        if (!st || (!this._config.show_unavailable && ['unavailable', 'unknown'].includes(st.state))) {
          return null;
        }
        return html`<div class="chip">${label}: ${st.state}</div>`;
      }

      _discoverChannels() {
        if (!this._config.auto_discover || !this.hass?.states) return [];

        const states = Object.values(this.hass.states);
        const discovered = [];

        // Filter pump is function 1 / channel 0 and is intentionally a multi-state select.
        const filterSelect = states.find((st) => {
          if (domainFromEntityId(st.entity_id) !== 'select') return false;
          if (['unavailable', 'unknown'].includes(st.state)) return false;
          const ch = Number(st.attributes?.channel_number);
          const fn = Number(st.attributes?.function);
          return ch === 0 || fn === 1;
        });
        if (filterSelect) discovered.push({ entity: filterSelect.entity_id });

        // All other ConnectMyPool channels are ordinary on/off switches.
        const switches = states
          .filter((st) => {
            if (domainFromEntityId(st.entity_id) !== 'switch') return false;
            if (['unavailable', 'unknown'].includes(st.state)) return false;
            const ch = st.attributes?.channel_number;
            const fn = Number(st.attributes?.function);
            return ch !== undefined && ch !== null && fn !== 1 && Number(ch) !== 0;
          })
          .sort((a, b) => Number(a.attributes.channel_number) - Number(b.attributes.channel_number));

        for (const st of switches) discovered.push({ entity: st.entity_id });
        return discovered;
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
        const icon = item.icon || st?.attributes?.icon || null;
        const name = item.name || this._friendlyName(entityId);
        const stateText = this._formatState(entityId);

        const left = html`
          <div class="left" @click=${() => this._moreInfo(entityId)}>
            ${icon
              ? html`<ha-icon .icon=${icon}></ha-icon>`
              : html`<ha-icon .icon=${'mdi:pool'}></ha-icon>`}
            <div style="min-width:0;">
              <div class="name" title=${name}>${name}</div>
              <div class="state">${stateText}</div>
            </div>
          </div>
        `;

        return html`
          <div class="row">
            ${left}
            <div class="controls">${this._renderControls(domain, entityId, st)}</div>
          </div>
        `;
      }

      _renderControls(domain, entityId, st) {
        if (!st || ['unavailable', 'unknown'].includes(st.state)) return html``;

        if (domain === 'switch' || domain === 'light') {
          const isOn = st.state === 'on';
          return html`
            <button class="btn" ?active=${isOn} @click=${() => this._toggle(entityId)}>
              ${isOn ? 'On' : 'Off'}
            </button>
          `;
        }

        if (domain === 'select') {
          const options = st.attributes?.options || [];
          return html`
            <ha-select .value=${st.state} @selected=${(ev) => this._setSelect(entityId, ev.target.value)}>
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
            .map(
              (m) => html`
                <button class="btn" ?active=${current === m} @click=${() => this._setClimateMode(entityId, m)}>
                  ${m}
                </button>
              `,
            );

          return html`
            ${modeBtns}
            ${typeof target === 'number' || (target && !isNaN(Number(target)))
              ? html`
                  <ha-slider
                    class="slider"
                    .min=${minTemp}
                    .max=${maxTemp}
                    .step=${1}
                    .value=${Number(target)}
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
            .map(
              (m) => html`
                <button
                  class="btn"
                  ?active=${opMode === m || st.state === m}
                  @click=${() => this._setWaterHeaterMode(entityId, m)}
                >
                  ${m}
                </button>
              `,
            );

          return html`
            ${modeBtns}
            ${typeof target === 'number' || (target && !isNaN(Number(target)))
              ? html`
                  <ha-slider
                    class="slider"
                    .min=${minTemp}
                    .max=${maxTemp}
                    .step=${1}
                    .value=${Number(target)}
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

        const tempText = cfg.temperature && this._available(cfg.temperature) ? this._formatState(cfg.temperature) : '—';

        const header = html`
          <div class="top">
            <div class="title">${cfg.title}</div>
            <div class="temp">${tempText}</div>
          </div>
          <div class="chips">
            ${this._renderChip('Mode', cfg.pool_spa)}
            ${this._renderChip('Favourite', cfg.favourite)}
          </div>
        `;

        const heaterRows = cfg.heater ? [normalizeItem(cfg.heater)].filter(Boolean) : [];
        const solarRows = cfg.solar ? [normalizeItem(cfg.solar)].filter(Boolean) : [];
        const channels = this._mergeItems(cfg.channels, this._discoverChannels());
        const valves = this._mergeItems(cfg.valves);
        const lights = this._mergeItems(cfg.lights);
        const extra = this._mergeItems(cfg.extra);

        return html`
          <ha-card>
            ${header}
            ${this._section('Heater', heaterRows)}
            ${this._section('Solar', solarRows)}
            ${this._section('Channels', channels)}
            ${this._section('Valves', valves)}
            ${this._section('Lights', lights)}
            ${this._section('Extra', extra)}
          </ha-card>
        `;
      }
    }

    if (!customElements.get('connectmypool-card')) {
      customElements.define('connectmypool-card', ConnectMyPoolCard);
    }

    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'connectmypool-card',
      name: 'ConnectMyPool Card',
      description: 'A dashboard card for the ConnectMyPool integration.',
    });
  } catch (e) {
    console.error('[connectmypool-card] failed to load', e);
  }
})();
