<script lang="ts">
	import '../app.css';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { initPreferences } from '$lib/i18n/state.svelte';
	import { audioEngine } from '$lib/game/audio';

	let { children } = $props();

	const path = $derived(page.url.pathname);
	const immersive = $derived(
		path === '/host' ||
			path.startsWith('/host/') ||
			path === '/client' ||
			path.startsWith('/client/') ||
			path === '/level' ||
			path.startsWith('/level/')
	);
	const stickyHeader = $derived(
		!immersive && !path.startsWith('/level-maker') && !path.startsWith('/annoy')
	);

	$effect(() => {
		if (!browser) return;
		document.body.classList.toggle('sticky-header', stickyHeader);
	});

	onMount(() => {
		initPreferences();
		audioEngine.soundsEnabled = true;

		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {
				/* offline support is optional */
			});
		}

		const unlockAudio = () => {
			void audioEngine.load();
			window.removeEventListener('pointerdown', unlockAudio);
			window.removeEventListener('keydown', unlockAudio);
		};
		window.addEventListener('pointerdown', unlockAudio, { once: true });
		window.addEventListener('keydown', unlockAudio, { once: true });

		return () => {
			window.removeEventListener('pointerdown', unlockAudio);
			window.removeEventListener('keydown', unlockAudio);
		};
	});
</script>

<svelte:head>
	<title>Multigolf</title>
</svelte:head>

{#if !immersive}
	<SiteHeader />
{/if}

{@render children()}

{#if !immersive}
	<SiteFooter />
{/if}
