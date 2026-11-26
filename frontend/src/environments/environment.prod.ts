// Build de production (image Docker) : le front et l'API passent par le même Nginx,
// qui relaie /api vers le back-end (voir nginx.conf). Pas besoin de CORS.
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
