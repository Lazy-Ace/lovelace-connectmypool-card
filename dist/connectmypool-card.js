(async () => {
  try {
    await customElements.whenDefined('ha-panel-lovelace');
  } catch (e) {
    // Ignore load-order differences.
  }

  try {
    /* ConnectMyPool Lovelace Card v1.1.0
     *
     * Lightweight custom card for the ConnectMyPool integration.
     * - Filter pump is treated as a multi-state select.
     * - Other channels are auto-discovered as ordinary switches.
     * - Active Favourite is rendered as a proper select control.
     * - Responsive layout avoids controls overflowing the card.
     * - Includes a native Home Assistant visual configuration editor.
     */

    const _panel = customElements.get('ha-panel-lovelace');
    const _haLit = window.LitElement;
    const LitElement =
      _haLit ||
      (_panel ? Object.getPrototypeOf(_panel) : null) ||
      Object.getPrototypeOf(customElements.get('ha-card') || HTMLElement);

    const html = window.html || LitElement.prototype.html;
    const css = window.css || LitElement.prototype.css;

    console.info('[connectmypool-card] loaded v1.1.0');

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
          :host {
            display: block;
            min-width: 0;
          }
          ha-card {
            padding: 16px;
            overflow: hidden;
          }
          .top {
            display: flex;
            gap: 16px;
            align-items: baseline;
            justify-content: space-between;
            flex-wrap: wrap;
            min-width: 0;
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
            white-space: nowrap;
          }
          .header-controls {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            margin-top: 10px;
            min-width: 0;
          }
          .header-control {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
          }
          .header-label {
            font-size: 0.85rem;
            color: var(--secondary-text-color);
            white-space: nowrap;
          }
          .header-control ha-select {
            width: 220px;
            max-width: min(220px, 70vw);
            min-width: 150px;
          }
          .chip {
            padding: 6px 10px;
            border-radius: 999px;
            background: var(--secondary-background-color);
            font-size: 0.85rem;
            white-space: nowrap;
          }
          .section {
            margin-top: 14px;
            min-width: 0;
          }
          .section h3 {
            margin: 10px 0 6px 0;
            font-size: 0.9rem;
            font-weight: 600;
            opacity: 0.85;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
            gap: 10px;
            min-width: 0;
          }
          .row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            border-radius: 12px;
            background: var(--card-background-color);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) inset;
            border: 1px solid var(--divider-color);
          }
          .row.select-row {
            grid-column: 1 / -1;
          }
          .left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1 1 0;
            min-width: 0;
            cursor: pointer;
          }
          .left-text {
            min-width: 0;
            flex: 1 1 0;
          }
          ha-icon {
            color: var(--secondary-text-color);
            flex: 0 0 auto;
          }
          .name {
            font-weight: 600;
            font-size: 0.92rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .state {
            font-size: 0.82rem;
            opacity: 0.8;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .controls {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 0 1 auto;
            min-width: 0;
            max-width: 58%;
          }
          .controls ha-select {
            width: 180px;
            max-width: 100%;
            min-width: 135px;
          }
          .btn {
            border-radius: 999px;
            border: 1px solid var(--divider-color);
            padding: 6px 10px;
            background: transparent;
            cursor: pointer;
            font-size: 0.8rem;
            white-space: nowrap;
          }
          .btn[active] {
            background: var(--primary-color);
            color: var(--text-primary-color);
            border-color: var(--primary-color);
          }
          .slider {
            width: 150px;
            max-width: 34vw;
          }
          .muted {
            opacity: 0.65;
          }
          @media (max-width: 560px) {
            ha-card {
              padding: 12px;
            }
            .temp {
              font-size: 1.9rem;
            }
            .header-control {
              width: 100%;
            }
            .header-control ha-select {
              flex: 1 1 auto;
              width: auto;
              max-width: none;
            }
            .row {
              align-items: flex-start;
              flex-wrap: wrap;
            }
            .controls {
              flex: 1 1 100%;
              width: 100%;
              max-width: none;
              justify-content: flex-end;
            }
            .controls ha-select {
              flex: 1 1 auto;
              width: 100%;
              max-width: none;
            }
            .slider {
              flex: 1 1 140px;
              width: auto;
              max-width: none;
            }
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

      _displayName(entityId, item = {}) {
        let name = item.name || this._friendlyName(entityId);
        const title = this._config?.title;
        if (title && name.startsWith(`${title} `)) {
          name = name.slice(title.length + 1);
        }
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

      _renderFavourite(entityId) {
        if (!entityId) return null;
        const st = this._state(entityId);
        if (!st || (!this._config.show_unavailable && ['unavailable', 'unknown'].includes(st.state))) {
          return null;
        }
        if (domainFromEntityId(entityId) !== 'select') {
          return this._renderChip('Favourite', entityId);
        }
        const options = st.attributes?.options || [];
        return html`
          <div class="header-control">
            <span class="header-label">Favourite</span>
            <ha-select .value=${st.state} @selected=${(ev) => this._setSelect(entityId, ev.target.value)}>
              ${options.map((o) => html`<mwc-list-item .value=${o}>${o}</mwc-list-item>`)}
            </ha-select>
          </div>
        `;
      }

      _discoverChannels() {
        if (!this._config.auto_discover || !this.hass?.states) return [];

        const states = Object.values(this.hass.states);
        const discovered = [];

        const filterSelect = states.find((st) => {
          if (domainFromEntityId(st.entity_id) !== 'select') return false;
          if (['unavailable', 'unknown'].includes(st.state)) return false;
          const ch = Number(st.attributes?.channel_number);
          const fn = Number(st.attributes?.function);
          return ch === 0 || fn === 1;
        });
        if (filterSelect) discovered.push({ entity: filterSelect.entity_id });

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
        const name = this._displayName(entityId, item);
        const stateText = this._formatState(entityId);
        const selectClass = domain === 'select' ? 'row select-row' : 'row';

        const left = html`
          <div class="left" @click=${() => this._moreInfo(entityId)}>
            ${icon
              ? html`<ha-icon .icon=${icon}></ha-icon>`
              : html`<ha-icon .icon=${'mdi:pool'}></ha-icon>`}
            <div class="left-text">
              <div class="name" title=${name}>${name}</div>
              <div class="state">${stateText}</div>
            </div>
          </div>
        `;

        return html`
          <div class=${selectClass}>
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
        const tempText =
          cfg.temperature && this._available(cfg.temperature) ? this._formatState(cfg.temperature) : '—';

        const heaterRows = cfg.heater && this._available(normalizeItem(cfg.heater)?.entity)
          ? [normalizeItem(cfg.heater)].filter(Boolean)
          : [];
        const solarRows = cfg.solar && this._available(normalizeItem(cfg.solar)?.entity)
          ? [normalizeItem(cfg.solar)].filter(Boolean)
          : [];

        const discoveredChannels = this._discoverChannels();
        const channelRows = this._mergeItems(cfg.channels, discoveredChannels);
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
              ? html`
                  <div class="header-controls">
                    ${favouriteControl}
                    ${poolSpaChip}
                  </div>
                `
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
        return {
          hass: {},
          _config: {},
        };
      }

      setConfig(config) {
        this._config = { ...config };
      }

      static get styles() {
        return css`
          :host {
            display: block;
            padding: 4px 0 12px;
          }
          .section {
            margin: 0 0 18px;
          }
          .section-title {
            font-size: 1rem;
            font-weight: 600;
            margin: 4px 0 10px;
          }
          .field {
            margin: 0 0 12px;
          }
          ha-textfield,
          ha-entity-picker {
            display: block;
            width: 100%;
          }
          .toggle {
            display: flex;
            align-items: center;
            min-height: 44px;
          }
          .hint {
            color: var(--secondary-text-color);
            font-size: 0.86rem;
            line-height: 1.4;
            margin-top: 6px;
          }
          .advanced {
            padding-top: 4px;
            border-top: 1px solid var(--divider-color);
          }
        `;
      }

      _fireConfigChanged(config) {
        const event = new CustomEvent('config-changed', {
          detail: { config },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      }

      _setValue(key, value) {
        const config = { ...this._config };
        if (value === undefined || value === null || value === '') {
          delete config[key];
        } else {
          config[key] = value;
        }
        this._config = config;
        this._fireConfigChanged(config);
      }

      _textChanged(key, ev) {
        const value = ev?.target?.value ?? '';
        this._setValue(key, value);
      }

      _entityChanged(key, ev) {
        const value = ev?.detail?.value ?? ev?.target?.value ?? '';
        this._setValue(key, value);
      }

      _toggleChanged(key, ev) {
        this._setValue(key, !!ev?.target?.checked);
      }

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
              Recommended. The card automatically finds the Filter Pump mode selector plus Spa Jets,
              Spa Blower and Heater Pump switches from the integration's channel metadata.
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
