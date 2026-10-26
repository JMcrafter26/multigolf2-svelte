import {
	PUBLIC_API_BASE_URL,
	PUBLIC_SITE_URL,
	PUBLIC_STATS_API_URL,
	PUBLIC_TURN_CREDENTIALS_URL
} from '$app/env/public';

/** Base URL of the Multigolf PHP API, e.g. https://api.example.com/api. */
export const API_BASE_URL = PUBLIC_API_BASE_URL;

/** Canonical URL of this deployment, used for the developer stats page. */
export const SITE_URL = PUBLIC_SITE_URL;

/** Endpoint returning [{ url, visits }] for the developer stats page. */
export const STATS_API_URL = PUBLIC_STATS_API_URL;

/** Optional TURN credentials endpoint. Empty disables the TURN lookup. */
export const TURN_CREDENTIALS_URL = PUBLIC_TURN_CREDENTIALS_URL;

export function apiUrl(path: string): string {
	return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}
