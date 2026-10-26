<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/level.css';
	import Localized from '$lib/components/Localized.svelte';
	import { LevelController } from '$lib/mono/level-controller.svelte';
	import { t } from '$lib/i18n/state.svelte';

	let controller = $state<LevelController | null>(null);
	let container = $state<HTMLDivElement>();
	let header = $state<HTMLDivElement>();
	let body = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();

	onMount(() => {
		const instance = new LevelController();
		controller = instance;
		if (container && header && body && canvas) {
			void instance.attachLayout({ container, header, body, canvas }).then(() => instance.init());
		} else {
			void instance.init();
		}
		return () => instance.destroy();
	});
</script>

<svelte:head>
	<title>Monogolf Level</title>
	<meta
		name="description"
		content="Monogolf is the single-player version of multi.golf. Play levels and unlock new items."
	/>
</svelte:head>

<div class="level-container" bind:this={container}>
	<div class="level-header" bind:this={header}>
		<a class="menu-link" href="/mono/">
			<Localized en="To Levels" de="Alle Level" />
		</a>
		<div class="level-display">
			{t('level.level')}
			<output>{controller?.levelDisplay ?? '00'}</output>
			{#if controller?.challengeMode}
				<span class="challenge-indicator">{t('level.challenge')}</span>
			{/if}
		</div>
	</div>
	<div class="level-body" bind:this={body}>
		<canvas id="level-canvas" bind:this={canvas} aria-label="Monogolf course"></canvas>
	</div>
</div>

{#if !controller || controller.loading}
	<div class="level-loading" aria-live="polite">
		<img src="/assets/logo/logo.svg" alt="" class="loading-logo" />
		<p>{t('common.loading')}</p>
	</div>
{/if}

{#if controller?.error}
	<div class="level-error">
		<h2>{t('level.packConfigError')}</h2>
		<p>{controller.error}</p>
		<button type="button" onclick={() => location.reload()}>{t('common.retry')}</button>
		<a class="button-link" href="/mono/">{t('level.backToPacks')}</a>
	</div>
{/if}

{#if controller?.dialog}
	{@const dialog = controller.dialog}
	<div class="custom-alert-container active" role="presentation">
		<div
			class="custom-alert-box"
			role="dialog"
			aria-modal="true"
			aria-labelledby="level-dialog-title"
		>
			<h2 id="level-dialog-title" class="header active">{dialog.title}</h2>
			<div class="text">{dialog.text}</div>
			{#if dialog.mode === 'alert'}
				<div class="button-container alert">
					<button
						class="continue-button"
						type="button"
						onclick={() => controller?.resolveDialog(true)}
					>
						{t('common.continue')}
					</button>
				</div>
			{:else}
				<div class="button-container confirm">
					<button
						class:default-button={!dialog.defaultYes}
						class="yes-button"
						type="button"
						onclick={() => controller?.resolveDialog(true)}
					>
						{t('common.yes')}
					</button>
					<button
						class:default-button={dialog.defaultYes}
						class="no-button"
						type="button"
						onclick={() => controller?.resolveDialog(false)}
					>
						{t('common.no')}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	#level-canvas {
		touch-action: none;
	}

	.challenge-indicator {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.05rem 0.4rem;
		border-radius: 1rem;
		background: var(--primary-accent-color);
		color: var(--on-primary-accent-color);
		font-size: 0.75em;
	}

	.level-loading,
	.level-error {
		position: fixed;
		inset: 0;
		z-index: 500;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: var(--background-color, #f3f3f3);
		padding: 1.5rem;
		text-align: center;
	}

	.loading-logo {
		width: min(35vw, 14rem);
		animation: spin 1.2s linear infinite;
	}

	.level-error button,
	.level-error .button-link {
		display: inline-block;
		background: var(--primary-accent-color);
		color: var(--on-primary-accent-color);
		border: none;
		border-radius: 0.5rem;
		padding: 0.6rem 1.1rem;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.custom-alert-container {
		position: fixed;
		inset: 0;
		z-index: 999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(2px);
	}

	.custom-alert-box {
		width: min(30rem, 100%);
		padding: 1.5rem;
		border-radius: 1rem;
		background: white;
		color: black;
		box-shadow: 0 0 50px rgba(0, 0, 0, 0.6);
		font-size: 1.05em;
	}

	.custom-alert-box .header {
		margin: 0 0 0.8rem;
		text-align: center;
		font-family: var(--header-font);
	}

	.button-container {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.8rem;
	}

	.button-container button {
		flex: 1;
		padding: 0.6rem 0.8rem;
		border: none;
		border-radius: 0.5rem;
		background: var(--primary-accent-color);
		color: var(--on-primary-accent-color);
		font: inherit;
		cursor: pointer;
	}

	.button-container button:hover {
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
	}

	.button-container .default-button {
		background: white;
		border: 1px solid #ccc;
		color: black;
	}
</style>
