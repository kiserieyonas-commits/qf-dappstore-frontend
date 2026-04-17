const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Shared fetch wrapper.
 * Throws an Error with the server's error message if the response is not ok.
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── Dapps ────────────────────────────────────────────────────────────────────

/**
 * Fetch all dApps with optional filters.
 * @param {{ category?: string, verified?: boolean, search?: string, sort?: string, page?: number, limit?: number }} params
 */
export async function getDapps(params = {}) {
  try {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return await request(`/api/dapps${query ? `?${query}` : ''}`);
  } catch (err) {
    console.error('[api] getDapps:', err.message);
    throw err;
  }
}

/**
 * Register a new dApp.
 * @param {{ name: string, description: string, contractAddress: string, builder: string, category: string, websiteUrl?: string, socialLinks?: string }} data
 */
export async function registerDapp(data) {
  try {
    return await request('/api/dapps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('[api] registerDapp:', err.message);
    throw err;
  }
}

/**
 * Trigger SDK verification for a backend dApp.
 * Backend will ping dappUrl/.well-known/dappstore-verify and set listing live if valid.
 * @param {number} dappId
 */
export async function verifySdkInstallation(dappId) {
  try {
    return await request(`/api/dapps/${dappId}/verify-sdk`, { method: 'POST' });
  } catch (err) {
    console.error('[api] verifySdkInstallation:', err.message);
    throw err;
  }
}

/**
 * Fetch a single dApp by ID.
 * @param {string|number} id
 */
export async function getDappById(id) {
  try {
    return await request(`/api/dapps/${id}`)
  } catch (err) {
    console.error('[api] getDappById:', err.message)
    throw err
  }
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Fetch all dApps registered by a builder address (with per-dApp tx stats).
 * @param {string} address  wallet address (0x...)
 */
export async function getBuilderDapps(address) {
  try {
    return await request(`/api/builder/${address}/dapps`);
  } catch (err) {
    console.error('[api] getBuilderDapps:', err.message);
    throw err;
  }
}

/**
 * Fetch analytics for all dApps owned by a builder.
 * @param {string} address  wallet address (0x...)
 */
export async function getBuilderAnalytics(address) {
  try {
    return await request(`/api/builder/${address}/analytics`);
  } catch (err) {
    console.error('[api] getBuilderAnalytics:', err.message);
    throw err;
  }
}

/**
 * Fetch revenue breakdown for all dApps owned by a builder.
 * @param {string} address  wallet address (0x...)
 */
export async function getBuilderRevenue(address) {
  try {
    return await request(`/api/builder/${address}/revenue`);
  } catch (err) {
    console.error('[api] getBuilderRevenue:', err.message);
    throw err;
  }
}

/**
 * Update a builder's dApp metadata.
 * @param {number} dappId
 * @param {string} address  builder wallet address
 * @param {{ description?: string, websiteUrl?: string, dappUrl?: string, logoUrl?: string }} updates
 */
export async function updateBuilderDapp(dappId, address, updates) {
  try {
    return await request(`/api/builder/dapp/${dappId}`, {
      method: 'PATCH',
      body: JSON.stringify({ address, ...updates }),
    });
  } catch (err) {
    console.error('[api] updateBuilderDapp:', err.message);
    throw err;
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Connect/register a user by wallet address.
 * Creates the user document if it doesn't exist yet.
 * @param {string} walletAddress
 */
export async function connectUser(walletAddress) {
  try {
    return await request('/api/users/connect', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  } catch (err) {
    console.error('[api] connectUser:', err.message);
    throw err;
  }
}

/**
 * Record that a user has installed a dApp.
 * @param {string} walletAddress
 * @param {string} dappId
 */
export async function installDapp(walletAddress, dappId) {
  try {
    return await request('/api/users/install-dapp', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, dappId }),
    });
  } catch (err) {
    console.error('[api] installDapp:', err.message);
    throw err;
  }
}

/**
 * Get the favorite dApps for a user.
 * @param {string} walletAddress
 */
export async function getFavoriteDapps(walletAddress) {
  try {
    return await request(`/api/users/${walletAddress}/favorites`);
  } catch (err) {
    console.error('[api] getFavoriteDapps:', err.message);
    throw err;
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

/**
 * Fetch reviews for a dApp.
 * @param {string|number} dappId
 * @param {{ sort?: 'recent'|'helpful' }} params
 */
export async function getReviews(dappId, params = {}) {
  try {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return await request(`/api/dapps/${dappId}/reviews${query ? `?${query}` : ''}`);
  } catch (err) {
    console.error('[api] getReviews:', err.message);
    throw err;
  }
}

/**
 * Submit or update a review for a dApp.
 * @param {string|number} dappId
 * @param {{ reviewer: string, rating: number, comment?: string }} data
 */
export async function submitReview(dappId, data) {
  try {
    return await request(`/api/dapps/${dappId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('[api] submitReview:', err.message);
    throw err;
  }
}

/**
 * Delete the current user's review for a dApp.
 * @param {string|number} dappId
 * @param {string} reviewer  wallet address of the reviewer
 */
export async function deleteReview(dappId, reviewer) {
  try {
    return await request(`/api/dapps/${dappId}/reviews`, {
      method: 'DELETE',
      body: JSON.stringify({ reviewer }),
    });
  } catch (err) {
    console.error('[api] deleteReview:', err.message);
    throw err;
  }
}

/**
 * Mark a review as helpful (increments helpful count).
 * @param {string|number} dappId
 * @param {string} reviewId  MongoDB subdocument _id
 */
export async function markReviewHelpful(dappId, reviewId) {
  try {
    return await request(`/api/dapps/${dappId}/reviews/${reviewId}/helpful`, {
      method: 'POST',
    });
  } catch (err) {
    console.error('[api] markReviewHelpful:', err.message);
    throw err;
  }
}
