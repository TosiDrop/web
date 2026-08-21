import type { Env } from '../../types/env';
import {
  deploymentNetwork,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../../services/vmClient';
import { hasDb } from '../../services/d1';
import { verifyProjectSignature } from '../../services/verifyProjectSignature';
import { PROJECT_COLUMNS, rowToProject, type ProjectRow } from '../../services/projects';
import { normalizeProjectInput, validateProjectInput } from '../../../src/shared/projects';

type Ctx = Parameters<PagesFunction<Env, 'id'>>[0];

function projectId(ctx: Ctx): string | null {
  const id = ctx.params.id;
  return typeof id === 'string' && id ? id : null;
}

export const onRequestGet: PagesFunction<Env, 'id'> = async (ctx) => {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin');
  const id = projectId(ctx);
  if (!id) return errorResponse('project id is required', 400, origin);
  if (!hasDb(env)) return errorResponse('Project not found', 404, origin);

  try {
    const row = await env.DB.prepare(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE network = ? AND id = ?`,
    )
      .bind(deploymentNetwork(env), id)
      .first<ProjectRow>();
    if (!row) return errorResponse('Project not found', 404, origin);
    return jsonResponse(rowToProject(row), 200, origin);
  } catch (err) {
    console.error('D1 GET project error:', err);
    return errorResponse('Error fetching project', 500, origin);
  }
};

export const onRequestPut: PagesFunction<Env, 'id'> = async (ctx) => {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin');
  const id = projectId(ctx);
  if (!id) return errorResponse('project id is required', 400, origin);
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

  if (!hasDb(env)) return jsonResponse({ id, degraded: true }, 200, origin);

  const network = deploymentNetwork(env);
  try {
    const existing = await env.DB.prepare(
      'SELECT owner_address FROM projects WHERE network = ? AND id = ?',
    )
      .bind(network, id)
      .first<{ owner_address: string }>();
    if (!existing) return errorResponse('Project not found', 404, origin);
    if (existing.owner_address !== owner) {
      return errorResponse('Only the project owner can update it', 403, origin);
    }
    await env.DB.prepare(
      'UPDATE projects SET name = ?, description = ?, website = ?, logo_url = ?, token_id = ?, ' +
        "pool_id = ?, distribution = ?, updated_at = datetime('now') WHERE network = ? AND id = ?",
    )
      .bind(
        project.name,
        project.description || null,
        project.website || null,
        project.logoUrl || null,
        project.tokenId,
        project.poolId || null,
        JSON.stringify(project.distribution),
        network,
        id,
      )
      .run();
    return jsonResponse({ id }, 200, origin);
  } catch (err) {
    console.error('D1 PUT project error:', err);
    return errorResponse('Error updating project', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env, 'id'> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
