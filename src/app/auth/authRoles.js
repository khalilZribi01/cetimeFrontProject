// src/auth/authRoles.js
export const authRoles = {
  sa: ['SA'],
  admin: ['ADMIN'],      // ✅ rôle attendu pour l'admin
   employee: ['EMPLOYEE','AGENT'], 
  client: ['CLIENT'],
  guest: ['SA', 'ADMIN', 'EDITOR', 'GUEST', 'EMPLOYEE', 'CLIENT','AGENT'],
  user: ['ADMIN', 'EMPLOYEE', 'AGENT'] // utile si tu veux un rôle commun
};
