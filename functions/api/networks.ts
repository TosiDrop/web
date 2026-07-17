import type { Env } from '../types/env';
import { networksAvailable, jsonResponse, optionsResponse } from '../services/vmClient';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  return jsonResponse({ networks: networksAvailable(env) }, 200, origin);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
