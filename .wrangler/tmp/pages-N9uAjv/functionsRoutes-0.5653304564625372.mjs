import { onRequestGet as __api_getRewards_ts_onRequestGet } from "/Users/brianlee/Documents/GitHub/tosi-web/web/functions/api/getRewards.ts"
import { onRequestGet as __api_profileData_ts_onRequestGet } from "/Users/brianlee/Documents/GitHub/tosi-web/web/functions/api/profileData.ts"
import { onRequestPost as __api_profileData_ts_onRequestPost } from "/Users/brianlee/Documents/GitHub/tosi-web/web/functions/api/profileData.ts"
import { onRequestGet as __api_sanitizeAddress_ts_onRequestGet } from "/Users/brianlee/Documents/GitHub/tosi-web/web/functions/api/sanitizeAddress.ts"

export const routes = [
    {
      routePath: "/api/getRewards",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_getRewards_ts_onRequestGet],
    },
  {
      routePath: "/api/profileData",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_profileData_ts_onRequestGet],
    },
  {
      routePath: "/api/profileData",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_profileData_ts_onRequestPost],
    },
  {
      routePath: "/api/sanitizeAddress",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_sanitizeAddress_ts_onRequestGet],
    },
  ]