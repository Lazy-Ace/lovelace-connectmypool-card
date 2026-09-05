# ConnectMyPool Lovelace Card

A lightweight custom Lovelace card for the **ConnectMyPool** Home Assistant integration.

## Install (HACS)

1. Add this repository to **HACS → Frontend → ⋮ → Custom repositories** as a Lovelace repository.
2. Install **ConnectMyPool Lovelace Card**.
3. Ensure the resource exists under **Settings → Dashboards → Resources** as a JavaScript module.
4. Hard-refresh the browser after an update if the old card is still cached.

## Recommended configuration

```yaml
type: custom:connectmypool-card
title: Swimming Pool
temperature: sensor.connectmypool_pool_water_temperature
favourite: select.connectmypool_active_favourite
heater: climate.connectmypool_heater_1
auto_discover: true
```

With `auto_discover: true` (the default), the card discovers ConnectMyPool channel entities from their `channel_number` and `function` attributes:

- **Filter Pump** is shown as its multi-state selector: **Off / Auto / Medium Speed / High Speed**.
- Other channels such as **Spa Jets**, **Spa Blower**, and **Heater Pump** are shown as on/off switches.

This avoids relying on the old Filter Pump switch entity, which is no longer appropriate for a multi-state Viron pump channel.

## Optional explicit entities

You can still provide entities manually:

```yaml
type: custom:connectmypool-card
title: Pool
temperature: sensor.connectmypool_pool_water_temperature
pool_spa: select.connectmypool_pool_spa_selection
favourite: select.connectmypool_active_favourite
heater: climate.connectmypool_heater_1
solar: water_heater.connectmypool_solar_1
channels:
  - select.connectmypool_channel_0_mode
  - switch.connectmypool_spa_jets
  - switch.connectmypool_spa_blower
  - switch.connectmypool_heater_pump
valves:
  - select.connectmypool_valve_1_mode
lights:
  - light.connectmypool_pool_lights
```

Unavailable or stale entities are hidden by default so old entities do not leave broken-looking rows on the card. Set `show_unavailable: true` if you explicitly want them displayed.

## Notes

- The card renders `switch`, `light`, `select`, `climate`, and `water_heater` entities.
- Tapping the entity name/icon opens the standard Home Assistant More Info dialog.
- The card is deliberately lightweight and has no build step.

## Troubleshooting

- After updating through HACS, hard-refresh the browser with **Ctrl+F5** if the previous JavaScript remains cached.
- In the browser console you should see: `[connectmypool-card] loaded v1.0.3`.
- If you see `Custom element doesn't exist: connectmypool-card`, verify the resource under **Settings → Dashboards → Resources**.
