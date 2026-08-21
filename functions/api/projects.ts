import type { Env } from '../types/env';
import {
  deploymentNetwork,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../services/vmClient';
import { hasDb } from '../services/d1';
import { verifyProjectSignature } from '../services/verifyProjectSignature';
import { PROJECT_COLUMNS, rowToProject, type ProjectRow } from '../services/projects';
import { normalizeProjectInput, validateProjectInput } from '../../src/shared/projects';

const MAX_PROJECTS_PER_OWNER = 20;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  const owner = new URL(request.url).searchParams.get('owner');
  if (!owner) return errorResponse('owner is required', 400, origin);
  if (!hasDb(env)) return jsonResponse({ projects: [], degraded: true }, 200, origin);

  try {
    const { results } = await env.DB.prepare(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE network = ? AND owner_address = ? ` +
        'ORDER BY created_at DESC',
    )
      .bind(deploymentNetwork(env), owner)
      .all<ProjectRow>();
    return jsonResponse({ projects: (results ?? []).map(rowToProject) }, 200, origin);
  } catch (err) {
    console.error('D1 GET projects error:', err);
    return errorResponse('Error fetching projects', 500, origin);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return errorResponse('Request body must be JSON', 415, origin);
  }
  let body: {
    ownerAddress?: unknown;
    project?: unknown;
    signature?: unknown;
    key?: unknown;
    message?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, origin);
  }
  const owner = typeof body.ownerAddress === 'string' ? body.ownerAddress : '';
  if (!owner.startsWith('stake')) {
    return errorResponse('ownerAddress must be a bech32 stake address', 400, origin);
  }
  const project = normalizeProjectInput(body.project);
  const problem = validateProjectInput(project);
  if (problem) return errorResponse(problem, 400, origin);

  const verification = await verifyProjectSignature({
    stakeAddress: owner,
    project,
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) return errorResponse(verification.reason, verification.status, origin);

  const id = crypto.randomUUID();
  if (!hasDb(env)) return jsonResponse({ id, degraded: true }, 200, origin);

  const network = deploymentNetwork(env);
  try {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM projects WHERE network = ? AND owner_address = ?',
    )
      .bind(network, owner)
      .first<{ n: number }>();
    if ((count?.n ?? 0) >= MAX_PROJECTS_PER_OWNER) {
      return errorResponse(`Limit of ${MAX_PROJECTS_PER_OWNER} projects per wallet`, 409, origin);
    }
    await env.DB.prepare(
      'INSERT INTO projects (id, network, owner_address, name, description, website, logo_url, ' +
        'token_id, pool_id, distribution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        network,
        owner,
        project.name,
        project.description || null,
        project.website || null,
        project.logoUrl || null,
        project.tokenId,
        project.poolId || null,
        JSON.stringify(project.distribution),
      )
      .run();
    return jsonResponse({ id }, 201, origin);
  } catch (err) {
    console.error('D1 POST projects error:', err);
    return errorResponse('Error saving project', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
