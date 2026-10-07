# ConnectMyPool Lovelace Card

A lightweight custom Lovelace card for the **ConnectMyPool** Home Assistant integration.

## Features

- Pool water temperature display
- Heater climate control
- **Active Favourite** as a proper drop-down selector
- Every channel as a row of mode buttons: Filter Pump (`Off`, `Auto`, `Medium Speed`, `High Speed`),
  Spa Jets and Spa Blower (`Off`, `Auto`, `On`), using `select.select_option`
- Per-mode visual feedback: active mode highlighted, icon tinted for Off / Auto / On, and a
  "waiting for controller" indicator until the cloud status confirms the new mode
- Channels whose entity is disabled (e.g. the Heater Pump by default) are not shown
- Legacy on/off channel switches from older integration versions are still supported
- Automatic channel discovery from ConnectMyPool entity metadata
- Responsive layout that adapts to narrow dashboard columns
- Missing or obsolete entities are hidden by default
- Tap an entity name/icon to open Home Assistant's More Info dialog
- **Visual dashboard editor** with Home Assistant entity pickers and toggles
- Smart starter configuration when the card is added from the card picker

## Install with HACS

1. In Home Assistant open **HACS → Frontend → ⋮ → Custom repositories**.
2. Add this repository and select **Lovelace** / **Dashboard** as the category.
3. Install **ConnectMyPool Lovelace Card**.
4. Hard-refresh the browser after updating (`Ctrl+F5`).

HACS should add the JavaScript resource automatically. If it does not, add:

`/hacsfiles/lovelace-connectmypool-card/connectmypool-card.js`

as a **JavaScript Module** under **Settings → Dashboards → Resources**.

## Visual editor

From **Edit dashboard → Edit card**, the card now provides a graphical editor for:

- Card title
- Pool water temperature entity
- Active Favourite selector
- Heater entity
- Automatic ConnectMyPool channel discovery
- Show unavailable entities
- Optional Pool / Spa selector
- Optional solar water-heater entity

Manual `channels`, `valves`, `lights`, and `extra` lists remain available in YAML for advanced layouts. Existing YAML-only settings are preserved when the visual editor is used.

## Example configuration

```yaml
type: custom:connectmypool-card
title: Swimming Pool
temperature: sensor.connectmypool_pool_water_temperature
favourite: select.connectmypool_active_favourite
heater: climate.connectmypool_heater_1
auto_discover: true
```

Auto-discovery can be disabled with:

```yaml
auto_discover: false
```

Unavailable or missing entities are hidden by default. To show them for troubleshooting:

```yaml
show_unavailable: true
```

## Troubleshooting

After updating, hard-refresh the browser. The browser console should show:

`[connectmypool-card] loaded v1.2.0`

### Upgrading from switch-based channels

Newer ConnectMyPool integration versions expose channels as `select.*_mode` entities instead of
`switch.*` entities. If your card YAML lists channel switches explicitly, replace them, for example:

```yaml
channels:
  - select.connectmypool_filter_pump_mode
  - select.connectmypool_jets_mode
  - select.connectmypool_blower_mode
```

or remove the `channels` list and let auto-discovery find them. Channel mode changes are sent to the
controller one step at a time, so a multi-step change (e.g. Filter Pump Off → High Speed) can take up to about a minute while the card shows its busy state.

If you see `Custom element doesn't exist: connectmypool-card`, confirm the HACS resource is loaded under **Settings → Dashboards → Resources**.
