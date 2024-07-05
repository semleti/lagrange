import { idb, KeyBindingAction } from "@/dexie";

export async function addDefaultSettings(): Promise<any> {
  return idb.settings.put({ theme: 'default', font: 'default' })
}

export async function addDefaultKeyBindings(): Promise<any> {
  return idb.keyBindings.bulkPut([
    { action: KeyBindingAction.ToggleLensFlare,   key: 'L' },
    { action: KeyBindingAction.ToggleBiomes,      key: 'B' },
    { action: KeyBindingAction.ToggleClouds,      key: 'C' },
    { action: KeyBindingAction.ToggleAtmosphere,  key: 'A' },
  ])
}