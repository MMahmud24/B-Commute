export const TABS = [
  { to: '/bus', label: 'Bus' },
  { to: '/car', label: 'Car' },
] as const

// Where "/" lands. This will come from the user's preferences later.
export const DEFAULT_TAB: (typeof TABS)[number]['to'] = '/bus'
