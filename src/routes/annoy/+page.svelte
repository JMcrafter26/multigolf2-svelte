<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import { audioEngine } from '$lib/game/audio';
	import { AudioSprite } from '$lib/game/sprites';
	import { t } from '$lib/i18n/state.svelte';

	let intervals: ReturnType<typeof setInterval>[] = [];

	function startNoises(): void {
		intervals.push(
			setInterval(() => {
				const sprites = Object.values(AudioSprite);
				audioEngine.play(sprites[Math.floor(Math.random() * sprites.length)]);
			}, 100)
		);
	}

	function startNotes(): void {
		intervals.push(
			setInterval(() => {
				audioEngine.randomNote();
			}, 100)
		);
	}

	function stopAll(): void {
		for (const interval of intervals) clearInterval(interval);
		intervals = [];
	}

	onMount(() => {
		void audioEngine.load();
		return stopAll;
	});
</script>

<svelte:head>
	<title>Annoy | Multigolf</title>
	<meta name="description" content="Annoy someone for free" />
</svelte:head>

<main id="active-main">
	<h1>{t('annoy.title')}</h1>
	<p>
		<Localized
			en="A little experiment in celebration of annoying popups. Press a button and enjoy the noise."
			de="Ein kleines Experiment zu Ehren nerviger Popups. Drücke einen Knopf und genieße den Lärm."
		/>
	</p>
	<div class="button-row">
		<button id="start-btn" type="button" onclick={startNoises}>{t('annoy.startNoises')}</button>
		<button id="start-notes-btn" type="button" onclick={startNotes}>
			{t('annoy.startNotes')}
		</button>
		<button id="stop-all-btn" type="button" class="danger" onclick={stopAll}>
			{t('annoy.stopAll')}
		</button>
	</div>
</main>

<style>
	.button-row {
		display: grid;
		gap: 0.75rem;
		max-width: 26rem;
		margin-top: 1rem;
	}

	.danger {
		background: #b3261e;
		color: white;
	}
</style>
