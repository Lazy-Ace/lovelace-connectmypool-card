# ConnectMyPool Lovelace Card

A lightweight custom Lovelace card for the **ConnectMyPool** Home Assistant integration.

## Features

- Pool water temperature display
- Heater climate control
- **Active Favourite** as a proper drop-down selector
- Filter pump as a multi-state selector (`Off`, `Auto`, `Medium Speed`, `High Speed`)
- Spa Jets, Spa Blower and Heater Pump as ordinary on/off controls
- Automatic channel discovery from ConnectMyPool entity metadata
- Responsive layout that adapts to narrow dashboard columns
- Missing or obsolete entities are hidden by default
- Tap an entity name/icon to open Home Assistant's More Info dialog

## Install with HACS

1. In Home Assistant open **HACS → Frontend → ⋮ → Custom repositories**.
2. Add this repository and select **Lovelace** / **Dashboard** as the category.
3. Install **ConnectMyPool Lovelace Card**.
4. Hard-refresh the browser after updating (`Ctrl+F5`).

HACS should add the JavaScript resource automatically. If it does not, add:

`/hacsfiles/lovelace-connectmypool-card/connectmypool-card.js`

as a **JavaScript Module** under **Settings → Dashboards → Resources**.

## Example configuration

```yaml
type: custom:connectmypool-card
title: Swimming Pool
temperature: sensor.connectmypool_pool_water_temperature
favourite: select.connectmypool_active_favourite
heater: climate.connectmypool_heater_1
channels: []
auto_discover: true
```

Existing explicit `channels`, `solar`, `valves`, `lights`, and `extra` lists are still supported. Auto-discovery can be disabled with:

```yaml
auto_discover: false
```

Unavailable or missing entities are hidden by default. To show them for troubleshooting:

```yaml
show_unavailable: true
```

## Troubleshooting

After updating, hard-refresh the browser. The browser console should show:

`[connectmypool-card] loaded v1.0.4`

If you see `Custom element doesn't exist: connectmypool-card`, confirm the HACS resource is loaded under **Settings → Dashboards → Resources**.
