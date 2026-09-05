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

`[connectmypool-card] loaded v1.1.0`

If you see `Custom element doesn't exist: connectmypool-card`, confirm the HACS resource is loaded under **Settings → Dashboards → Resources**.
