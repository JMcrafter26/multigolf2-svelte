import { defineEnvVars } from '@sveltejs/kit/env';

function requiredUrl(name: string) {
	return (value: string | undefined): string => {
		const url = value?.trim().replace(/\/+$/, '') ?? '';
		if (!url) throw new Error(`${name} must be set in .env`);
		return url;
	};
}

/**
 * Public build-time configuration.
 *
 * `static: true` makes SvelteKit inline these values into the client bundle when
 * the app is built, so changing them requires a rebuild. Everything declared
 * here is public — never add secrets to this file.
 */
export const variables = defineEnvVars({
	PUBLIC_API_BASE_URL: {
		public: true,
		static: true,
		description: 'Base URL of the Multigolf PHP API, e.g. https://api.example.com/api.',
		schema: requiredUrl('PUBLIC_API_BASE_URL')
	},
	PUBLIC_SITE_URL: {
		public: true,
		static: true,
		description: 'Canonical public URL of this deployment (used by the developer stats page).',
		schema: requiredUrl('PUBLIC_SITE_URL')
	},
	PUBLIC_STATS_API_URL: {
		public: true,
		static: true,
		description:
			'Endpoint returning [{url, visits}] for the developer stats page. Use the bundled ' +
			'backend get_visit_count.php or the legacy terminal API.',
		schema: requiredUrl('PUBLIC_STATS_API_URL')
	},
	PUBLIC_TURN_CREDENTIALS_URL: {
		public: true,
		static: true,
		description: 'Optional TURN credentials endpoint. Empty disables the TURN lookup.',
		schema: (value) => (value ?? '').trim()
	}
});
