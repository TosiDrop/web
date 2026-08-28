import type { Env } from '../types/env';
import {
  deploymentNetwork,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../services/vmClient';
import { hasDb } from '../services/d1';
import {
  signatureHash,
  verifyProjectListSignature,
  verifyProjectSignature,
} from '../services/verifyProjectSignature';
import { PROJECT_COLUMNS, rowToProject, type ProjectRow } from '../services/projects';
import {
  decodeStakeAuth,
  normalizeProjectInput,
  validateProjectInput,
} from '../../src/shared/projects';

const MAX_PROJECTS_PER_OWNER = 20;

/**
 * GET /api/projects?owner=…
 * Without a signature the response is the public view: approved projects
 * only. With a valid `Authorization: Stake …` header for that owner it is the
 * owner's full list, including pending and rejected registrations, which are
 * private to the wallet that made them.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  const owner = new URL(request.url).searchParams.get('owner');
  if (!owner) return errorResponse('owner is required', 400, origin);
  const network = deploymentNetwork(env);

  const auth = decodeStakeAuth(request.headers.get('Authorization'));
  if (request.headers.get('Authorization') && !auth) {
    return errorResponse('Malformed Authorization header', 401, origin);
  }
  let scope: 'owner' | 'public' = 'public';
  if (auth) {
    const verification = await verifyProjectListSignature({ stakeAddress: owner, network, auth });
    if (!verification.ok) return errorResponse(verification.reason, verification.status, origin);
    scope = 'owner';
  }

  // Reads degrade to an explicit "unknown" the client must not render as empty.
  if (!hasDb(env)) return jsonResponse({ projects: [], degraded: true, scope }, 200, origin);

  try {
    const { results } = await env.DB.prepare(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE network = ? AND owner_address = ? ` +
        (scope === 'public' ? "AND status = 'approved' " : '') +
        'ORDER BY created_at DESC',
    )
      .bind(network, owner)
      .all<ProjectRow>();
    return jsonResponse(
      { projects: (results ?? []).map(rowToProject), degraded: false, scope },
      200,
      origin,
    );
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

  const network = deploymentNetwork(env);
  const verification = await verifyProjectSignature({
    stakeAddress: owner,
    project,
    action: 'create',
    projectId: null,
    network,
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) return errorResponse(verification.reason, verification.status, origin);

  // A write that cannot be stored is a failure, never a success with an id.
  if (!hasDb(env)) return errorResponse('Project storage is unavailable', 503, origin);

  const sigHash = await signatureHash(body.signature as string);
  try {
    // The same signed request creates at most one project: a retry of a
    // request whose response was lost returns the row it already created.
    const existing = await env.DB.prepare(
      'SELECT id FROM projects WHERE network = ? AND signature_hash = ?',
    )
      .bind(network, sigHash)
      .first<{ id: string }>();
    if (existing) return jsonResponse({ id: existing.id }, 200, origin);

    // The cap is enforced inside the INSERT itself so two concurrent creates
    // cannot both pass a separate COUNT check: the row is only written when
    // the owner's count is still below the limit at write time.
    const id = crypto.randomUUID();
    const result = await env.DB.prepare(
      'INSERT INTO projects (id, network, owner_address, name, description, website, logo_url, ' +
        'token_id, pool_id, distribution, signature_hash) ' +
        'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ' +
        'WHERE (SELECT COUNT(*) FROM projects WHERE network = ? AND owner_address = ?) < ?',
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
        sigHash,
        network,
        owner,
        MAX_PROJECTS_PER_OWNER,
      )
      .run();
    if ((result.meta?.changes ?? 0) === 0) {
      return errorResponse(`Limit of ${MAX_PROJECTS_PER_OWNER} projects per wallet`, 409, origin);
    }
    return jsonResponse({ id }, 201, origin);
  } catch (err) {
    console.error('D1 POST projects error:', err);
    return errorResponse('Error saving project', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
