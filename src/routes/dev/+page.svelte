<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import { SITE_URL, STATS_API_URL } from '$lib/api';
	import { t } from '$lib/i18n/state.svelte';

	interface VisitEntry {
		url: string;
		visits: number;
	}

	let cacheLog = $state<string[]>([]);
	let visits = $state<number | null>(null);
	let starts = $state<number | null>(null);
	let updatedAt = $state<Date | null>(null);
	let statsError = $state('');

	async function clearCache(): Promise<void> {
		try {
			const names = await caches.keys();
			for (const name of names) {
				await caches.delete(name);
				cacheLog = [...cacheLog, t('dev.deletedCache', { cache: name })];
			}
			if (names.length === 0) cacheLog = [...cacheLog, t('dev.noCache')];
		} catch (error) {
			cacheLog = [...cacheLog, String(error)];
		}
	}

	async function updateVisits(): Promise<void> {
		try {
			const response = await fetch(STATS_API_URL);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as VisitEntry[];
			visits = data.find((entry) => entry.url === SITE_URL)?.visits ?? 0;
			starts = data.find((entry) => entry.url === `${SITE_URL}/host/`)?.visits ?? 0;
			updatedAt = new Date();
			statsError = '';
		} catch (error) {
			statsError = String(error);
		}
	}

	onMount(() => {
		void updateVisits();
		const interval = window.setInterval(() => void updateVisits(), 10_000);
		return () => window.clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Developer Centre | Multigolf</title>
	<meta name="description" content="Developer tools and diagnostics for Multigolf" />
</svelte:head>

<main>
	<h1>{t('dev.title')}</h1>
	<p>{t('dev.description')}</p>

	<fieldset>
		<legend>Service Worker Caching</legend>
		<p>
			<Localized
				en="The website uses a service worker to cache pages and assets. Click the button below to manually clear the cache."
				de="Die Website verwendet einen Service Worker, um Seiten und Assets zu cachen. Klicke unten, um den Cache manuell zu leeren."
			/>
			The service worker is available at <code>/service-worker.js</code>.
		</p>
		<button type="button" class="smaller" onclick={() => clearCache()}>
			{t('dev.clearCache')}
		</button>
		{#if cacheLog.length}
			<pre class="log-output">{cacheLog.join('\n')}</pre>
		{/if}
	</fieldset>

	<fieldset>
		<legend>Site Views</legend>
		<p class="stats">
			<a href={SITE_URL}>{SITE_URL}</a> has been visited
			<output>{visits ?? '…'}</output> times and <output>{starts ?? '…'}</output> games have been
			started in total.<br />
			<Localized en="Last updated:" de="Zuletzt aktualisiert:" />
			<output>{updatedAt ? updatedAt.toLocaleString() : '…'}</output>
		</p>
		{#if statsError}
			<p class="error" role="alert">{statsError}</p>
		{/if}
	</fieldset>
</main>

<style>
	fieldset {
		margin-top: 1rem;
	}

	.stats {
		text-align: initial;
	}

	.log-output {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #111;
		color: #b8ffce;
		border-radius: 0.5rem;
		white-space: pre-wrap;
	}

	.error {
		color: #a00000;
	}
</style>
