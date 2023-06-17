
export const FIELD_ACTIONS = [
  'edit',
  'editByHand',
  'renameField',
  'dropField',
  
  
  
] as const;
export type FieldAction = (typeof FIELD_ACTIONS)[number];

export const fieldActionLabels: {[K in FieldAction]: string} = {
  edit: 'Edit',
  dropField: 'Drop field',
  renameField: 'Rename field',
  editByHand: 'Edit by hand'
}
