# ConnectMyPool Lovelace Card

A lightweight custom Lovelace card that works nicely with the **ConnectMyPool** integration entities.

## Install (HACS)

1. Create a GitHub repo containing this card (or unzip the provided zip and push it).
2. In Home Assistant: **HACS → Frontend → ⋮ → Custom repositories**
3. Add your repo URL and select **Lovelace**
4. Install, restart Home Assistant if prompted.
5. Ensure the resource is added:
   - **Settings → Dashboards → Resources**
   - Add `/hacsfiles/<repo-name>/connectmypool-card.js` as a **JavaScript Module**

## Example configuration

```yaml
type: custom:connectmypool-card
title: Pool
temperature: sensor.pool_water_temperature
pool_spa: select.pool_spa_selection
favourite: select.active_favourite
heater: climate.heater
solar: water_heater.solar
channels:
  - switch.filter_pump
  - switch.waterfall
valves:
  - select.cleaner_valve_mode
lights:
  - light.pool_lights
```

### Notes

- The card can render **switch**, **light**, **select**, **climate**, and **water_heater** entities with simple inline controls.
- For anything fancy, you can still tap an entity to open the standard More Info dialog.
