export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USUARIO_LOCAL';

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
}
