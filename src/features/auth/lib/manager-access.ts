// Settings and the Stock Cards are where the floor's set-up lives: users, machines, locations,
// priorities, the cards a bench scans. Managers keep their department's share of it; Workers, Drivers
// and View only change none of it.
const MANAGER_ROLES = new Set(['admin', 'super_manager', 'manager'])

export const isManagerRole = (role: string) => MANAGER_ROLES.has(role)

// Every account, with its email and role, is the admin's alone: the server lists users to
// `manage_users` only, which no other role holds.
export const managesUsers = (role: string) => role === 'admin'
