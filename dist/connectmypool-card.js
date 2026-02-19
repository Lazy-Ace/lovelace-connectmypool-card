\
/* ConnectMyPool Lovelace Card
 *
 * A lightweight (no-build) custom card that works with the ConnectMyPool integration entities.
 *
 * Config example:
 * type: custom:connectmypool-card
 * title: Pool
 * temperature: sensor.pool_water_temperature
 * pool_spa: select.pool_spa_selection
 * favourite: select.active_favourite
 * heater: climate.heater
 * solar: water_heater.solar
 * channels:
 *   - switch.filter_pump
 *   - switch.waterfall
 * valves:
 *   - select.cleaner_valve_mode
 * lights:
 *   - light.pool_lights
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const DOMAIN_LABELS = {
  switch: "Switches",
  select: "Selects",
  light: "Lights",
  climate: "Heater",
  water_heater: "Solar",
};

function domainFromEntityId(entityId) {
  if (!entityId || typeof entityId !== "string") return null;
  const idx = entityId.indexOf(".");
  return idx > 0 ? entityId.slice(0, idx) : null;
}

function normalizeList(list) {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  return [];
}

function normalizeItem(item) {
  if (typeof item === "string") return { entity: item };
  if (item && typeof item === "object" && item.entity) return item;
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
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      title: config.title ?? "ConnectMyPool",
      temperature: config.temperature,
      pool_spa: config.pool_spa,
      favourite: config.favourite,
      heater: config.heater,
      solar: config.solar,
      channels: normalizeList(config.channels).map(normalizeItem).filter(Boolean),
      valves: normalizeList(config.valves).map(normalizeItem).filter(Boolean),
      lights: normalizeList(config.lights).map(normalizeItem).filter(Boolean),
      extra: normalizeList(config.extra).map(normalizeItem).filter(Boolean),
    };
  }

  getCardSize() {
    // Roughly scales with number of rows
    const c = this._config || {};
    const n = (c.channels?.length || 0) + (c.valves?.length || 0) + (c.lights?.length || 0) + (c.extra?.length || 0);
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
        box-shadow: 0 1px 0 rgba(0,0,0,0.05) inset;
        border: 1px solid var(--divider-color);
      }
      .left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
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
      }
      ha-select {
        min-width: 140px;
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

  _friendlyName(entityId) {
    const st = this._state(entityId);
    return st?.attributes?.friendly_name || entityId;
  }

  _formatState(entityId) {
    const st = this._state(entityId);
    if (!st) return "unavailable";
    const uom = st.attributes?.unit_of_measurement;
    const s = st.state;
    if (uom && s !== "unknown" && s !== "unavailable") return `${s} ${uom}`;
    return s;
  }

  _call(domain, service, data) {
    return this.hass.callService(domain, service, data);
  }

  _toggle(entityId) {
    const d = domainFromEntityId(entityId);
    if (d === "switch") return this._call("switch", "toggle", { entity_id: entityId });
    if (d === "light") return this._call("light", "toggle", { entity_id: entityId });
    return null;
  }

  _setSelect(entityId, option) {
    return this._call("select", "select_option", { entity_id: entityId, option });
  }

  _setClimateMode(entityId, hvac_mode) {
    return this._call("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode });
  }

  _setClimateTemp(entityId, temperature) {
    return this._call("climate", "set_temperature", { entity_id: entityId, temperature });
  }

  _setWaterHeaterMode(entityId, operation_mode) {
    // HA service name is set_operation_mode
    return this._call("water_heater", "set_operation_mode", { entity_id: entityId, operation_mode });
  }

  _setWaterHeaterTemp(entityId, temperature) {
    return this._call("water_heater", "set_temperature", { entity_id: entityId, temperature });
  }

  _renderChip(label, entityId) {
    if (!entityId) return null;
    const st = this._state(entityId);
    if (!st) return html`<div class="chip">${label}: <span class="muted">unavailable</span></div>`;
    return html`<div class="chip">${label}: ${st.state}</div>`;
  }

  _renderRow(item) {
    const entityId = item.entity;
    const st = this._state(entityId);
    const domain = domainFromEntityId(entityId);
    const icon = item.icon || st?.attributes?.icon || null;

    const name = item.name || this._friendlyName(entityId);
    const stateText = this._formatState(entityId);

    const left = html`
      <div class="left">
        ${icon ? html`<ha-icon .icon=${icon}></ha-icon>` : html`<ha-icon .icon=${"mdi:pool"}></ha-icon>`}
        <div style="min-width:0;">
          <div class="name" title=${name}>${name}</div>
          <div class="state">${stateText}</div>
        </div>
      </div>
    `;

    const controls = this._renderControls(domain, entityId, st, item);

    return html`
      <div class="row">
        ${left}
        <div class="controls">${controls}</div>
      </div>
    `;
  }

  _renderControls(domain, entityId, st, item) {
    if (!st) return html``;

    if (domain === "switch" || domain === "light") {
      const isOn = st.state === "on";
      return html`
        <button class="btn" ?active=${isOn} @click=${() => this._toggle(entityId)}>
          ${isOn ? "On" : "Off"}
        </button>
      `;
    }

    if (domain === "select") {
      const options = st.attributes?.options || [];
      return html`
        <ha-select
          .value=${st.state}
          @selected=${(ev) => this._setSelect(entityId, ev.target.value)}
        >
          ${options.map((o) => html`<mwc-list-item .value=${o}>${o}</mwc-list-item>`)}
        </ha-select>
      `;
    }

    if (domain === "climate") {
      const modes = st.attributes?.hvac_modes || ["off", "heat"];
      const current = st.state;
      const minTemp = st.attributes?.min_temp ?? 10;
      const maxTemp = st.attributes?.max_temp ?? 40;
      const target = st.attributes?.temperature;

      const modeBtns = modes
        .filter((m) => ["off", "heat", "cool"].includes(m))
        .map((m) => html`
          <button class="btn" ?active=${current === m} @click=${() => this._setClimateMode(entityId, m)}>${m}</button>
        `);

      return html`
        ${modeBtns}
        ${typeof target === "number" || (target && !isNaN(Number(target)))
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

    if (domain === "water_heater") {
      const opList = st.attributes?.operation_list || st.attributes?.operation_modes || ["Off", "Auto", "On"];
      const opMode = st.attributes?.operation_mode || st.attributes?.current_operation || st.state;

      const minTemp = st.attributes?.min_temp ?? 10;
      const maxTemp = st.attributes?.max_temp ?? 40;
      const target = st.attributes?.temperature;

      const modeBtns = opList
        .filter((m) => ["Off", "Auto", "On"].includes(m))
        .map((m) => html`
          <button class="btn" ?active=${opMode === m || st.state === m} @click=${() => this._setWaterHeaterMode(entityId, m)}>${m}</button>
        `);

      return html`
        ${modeBtns}
        ${typeof target === "number" || (target && !isNaN(Number(target)))
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

    // fallback: tap opens more info
    return html``;
  }

  _section(title, items) {
    if (!items || !items.length) return null;
    return html`
      <div class="section">
        <h3>${title}</h3>
        <div class="grid">
          ${items.map((it) => this._renderRow(it))}
        </div>
      </div>
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const cfg = this._config;

    const tempState = cfg.temperature ? this._state(cfg.temperature) : null;
    const tempText = cfg.temperature ? this._formatState(cfg.temperature) : "—";

    // Compose rows: heater/solar are shown as their own sections, plus lists.
    const header = html`
      <div class="top">
        <div class="title">${cfg.title}</div>
        <div class="temp">${tempText}</div>
      </div>
      <div class="chips">
        ${this._renderChip("Mode", cfg.pool_spa)}
        ${this._renderChip("Favourite", cfg.favourite)}
      </div>
    `;

    const heaterRows = cfg.heater ? [normalizeItem(cfg.heater)].map((x) => (typeof x === "string" ? { entity: x } : x)).filter(Boolean) : [];
    const solarRows = cfg.solar ? [normalizeItem(cfg.solar)].map((x) => (typeof x === "string" ? { entity: x } : x)).filter(Boolean) : [];

    return html`
      <ha-card>
        ${header}
        ${this._section("Heater", heaterRows)}
        ${this._section("Solar", solarRows)}
        ${this._section("Channels", cfg.channels)}
        ${this._section("Valves", cfg.valves)}
        ${this._section("Lights", cfg.lights)}
        ${this._section("Extra", cfg.extra)}
      </ha-card>
    `;
  }
}

customElements.define("connectmypool-card", ConnectMyPoolCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "connectmypool-card",
  name: "ConnectMyPool Card",
  description: "A dashboard card for the ConnectMyPool integration.",
});
