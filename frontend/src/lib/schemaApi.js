import api, { ensureCsrf } from './api'

export async function getMasterSchema() {
  const { data } = await api.get('/api/schema/master')
  return data
}

export async function updateConveyorZone(id, masterZone) {
  await ensureCsrf()
  const { data } = await api.patch(`/api/admin/conveyors/${id}`, { master_zone: masterZone })
  return data.conveyor
}

// ----- admin editor -----

export async function getConveyorAdmin(id) {
  const { data } = await api.get(`/api/admin/conveyors/${id}`)
  return data.conveyor
}

export async function updateConveyor(id, fields) {
  await ensureCsrf()
  const { data } = await api.patch(`/api/admin/conveyors/${id}`, fields)
  return data.conveyor
}

// Bulk-fill conveyor characteristics from a "caractéristiques" workbook.
// The backend matches each detected conveyor to a row by code and returns a
// summary { message, updated:[{code,fields}], unmatched:[code], codes_in_file:[] }.
export async function importConveyorCharacteristics(file) {
  await ensureCsrf()
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/api/admin/import/characteristics', fd)
  return data
}

export async function updateDrum(id, fields) {
  await ensureCsrf()
  const { data } = await api.patch(`/api/admin/drums/${id}`, fields)
  return data.drum
}

export async function uploadDatasheet({ file, title, componentId, drumId }) {
  await ensureCsrf()
  const fd = new FormData()
  fd.append('file', file)
  if (title) fd.append('title', title)
  if (componentId) fd.append('component_id', componentId)
  if (drumId) fd.append('drum_id', drumId)
  const { data } = await api.post('/api/admin/datasheets', fd)
  return data.datasheet
}

export async function deleteDatasheet(id) {
  await ensureCsrf()
  await api.delete(`/api/admin/datasheets/${id}`)
}

export async function getConveyor(id) {
  const { data } = await api.get(`/api/conveyors/${id}`)
  return data.conveyor
}

export async function getDrum(id) {
  const { data } = await api.get(`/api/drums/${id}`)
  return data.drum
}

export async function getComponentLocations(componentId) {
  const { data } = await api.get(`/api/components/${componentId}/locations`)
  return data
}

export const KIND_LABEL = {
  arbre: 'Arbre',
  virole: 'Virole',
}
