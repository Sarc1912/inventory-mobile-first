export function productSaveError(code: string | undefined) {
  switch (code) {
    case '42501':
      return { status: 403, message: 'Supabase rechazó el alta por permisos. Revisa los permisos INSERT de products y la política products_insert para tu cuenta activa. Código: 42501.' };
    case '23502':
      return { status: 400, message: 'La tabla products exige un valor que no está recibiendo. Revisa las columnas NOT NULL y sus valores por defecto. Código: 23502.' };
    case '23503':
      return { status: 409, message: 'El producto hace referencia a un registro que no existe. Revisa el perfil del usuario y las relaciones de products. Código: 23503.' };
    case '23514':
      return { status: 400, message: 'Una restricción de products rechazó los datos. Revisa las reglas de nombre, precio y cantidad. Código: 23514.' };
    case '23505':
      return { status: 409, message: 'Ya existe un registro con un valor que la tabla exige único. Revisa el inventario antes de reintentar. Código: 23505.' };
    case 'PGRST204':
    case 'PGRST205':
    case '42703':
    case '42P01':
      return { status: 503, message: `La estructura de products no coincide con la aplicación. Revisa las migraciones y la caché de esquema de Supabase. Código: ${code}.` };
    default:
      return { status: 503, message: `No se pudo confirmar el guardado. Revisa el inventario antes de reintentar. Código: ${code || 'sin código de Supabase'}.` };
  }
}
