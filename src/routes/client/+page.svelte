<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import CreditCardSizer from '$lib/client/CreditCardSizer.svelte';
	import { ClientController } from '$lib/client/client-controller.svelte';
	import { t, toggleLanguage } from '$lib/i18n/state.svelte';

	let controller = $state<ClientController | null>(null);
	let canvasElement = $state<HTMLCanvasElement | undefined>();

	$effect(() => {
		if (controller && canvasElement) void controller.attachCanvas(canvasElement);
	});

	onMount(() => {
		const instance = new ClientController();
		controller = instance;
		void instance.init();
		return () => instance.destroy();
	});

	function toggleLog(): void {
		if (controller) controller.showLog = !controller.showLog;
	}
</script>

<svelte:head>
	<title>Client | Multigolf</title>
	<meta
		name="description"
		content="Participant's page to play a multi.golf game that turns your device into a minigolf board"
	/>
</svelte:head>

<header class="at-top">
	<div class="header-content">
		<a class="logo-container" href="/" aria-label="Multigolf home">
			<img src="/assets/logo/logo.svg" class="logo" alt="Multigolf Logo" />
			<div class="logo-text">multigolf</div>
		</a>
		<nav class="link-island always-visible" aria-label="Client navigation">
			{#if controller}
				<button
					class="header-link"
					type="button"
					onclick={() => controller?.showCreditCardScreen()}
				>
					<Localized en="Credit Card" de="Kreditkarte" />
				</button>
			{/if}
			<button
				class="change-lang-button"
				type="button"
				onclick={toggleLanguage}
				aria-label="Change language"
			></button>
		</nav>
	</div>
</header>
<div class="header-placeholder"></div>

{#if controller}
	{@const c = controller}
	<main class="client-main">
		{#if c.status === 'invalid'}
			<section class="visible">
				<h2>{t('client.invalidCode')}</h2>
				<p>
					<Localized
						en="Please scan the QR code on the host device again or enter the game ID on the join page."
						de="Bitte scanne den QR-Code auf dem Server-Gerät erneut oder gib die Spiel-ID auf der Beitreten-Seite ein."
					/>
				</p>
				<a class="button-link" href="/join/"><Localized en="Join a Game" de="Spiel Beitreten" /></a>
			</section>
		{:else if c.showCreditCard}
			<section class="visible">
				<h2><Localized en="Set the Card Size" de="Kartengröße Einstellen" /></h2>
				<p>{t('client.creditCardDescription')}</p>
				<CreditCardSizer
					height={c.creditCardPixelHeight}
					onchange={(height) => c.setCreditCardHeight(height)}
				/>
				<button type="button" onclick={() => c.confirmSizing()}>
					{t('client.confirmSize')}
				</button>
			</section>
		{:else}
			<section class="visible client-status">
				<h2>
					{#if c.status === 'connected'}
						<Localized en="Connected to Host" de="Mit Server Verbunden" />
					{:else if c.status === 'error'}
						<Localized en="Connection Lost" de="Verbindung Verloren" />
					{:else if c.status === 'loading'}
						<Localized en="Loading..." de="Wird Geladen..." />
					{:else}
						<Localized en="Connecting to Host..." de="Verbinde mit Server..." />
					{/if}
				</h2>
				<p>{t('client.keepAlive')}</p>
				<p>{t('client.deviceNumber', { num: c.deviceIndex ?? '?' })}</p>

				{#if c.status === 'error'}
					<button type="button" onclick={() => c.retryNow()}>
						<Localized en="Try Again" de="Nochmal Versuchen" />
					</button>
				{/if}

				<button type="button" class="smaller" onclick={toggleLog}>
					<Localized en="Toggle Connection Log" de="Verbindungs-Log Anzeigen" />
				</button>
				{#if c.showLog}
					<pre class="log-output">{c.logLines.join('\n')}</pre>
				{/if}

				<fieldset>
					<legend>{t('client.fullscreenOptions')}</legend>
					<div class="checkbox-container">
						<input
							id="fullscreen-checkbox"
							type="checkbox"
							checked={c.fullscreenOnCanvasClick}
							onchange={(event) => c.setFullscreenOnClick(event.currentTarget.checked)}
						/>
						<label for="fullscreen-checkbox">{t('client.requestFullscreen')}</label>
					</div>
					<p>{t('client.fullscreenExplanation')}</p>
				</fieldset>

				<p class="muted small">
					<Localized en="Game ID:" de="Spiel-ID:" />
					<code>{c.connectionCode}</code>
				</p>
			</section>
		{/if}
	</main>

	{#if c.handActive || c.handError}
		<div class="hand-status" aria-live="polite">
			<strong>{t('client.gestureControls')}</strong>
			<span>
				{#if c.handError}
					{c.handError}
				{:else}
					{t('client.handNotDetected')}
				{/if}
			</span>
		</div>
	{/if}

	<canvas
		id="fullscreen-canvas"
		bind:this={canvasElement}
		style="display: none"
		aria-label="Multigolf course"
	></canvas>
{/if}

<style>
	.client-main {
		min-height: 60vh;
	}

	.client-main section.visible {
		display: grid;
	}

	.header-link {
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		padding: 0;
		cursor: pointer;
	}

	.button-link {
		display: inline-block;
		text-align: center;
		text-decoration: none;
		padding: var(--button-padding, 0.75em 1.25em);
		background: var(--button-background);
		color: var(--button-color);
		border-radius: 0.5em;
		font-weight: 600;
	}

	.client-status {
		gap: 1rem;
	}

	.log-output {
		max-height: 14rem;
		overflow: auto;
		background: #111;
		color: #b8ffce;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		white-space: pre-wrap;
		text-align: left;
	}

	.checkbox-container {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.muted {
		opacity: 0.65;
	}

	.small {
		font-size: 0.9em;
	}

	.hand-status {
		position: fixed;
		z-index: 210;
		left: 50%;
		bottom: 1rem;
		transform: translateX(-50%);
		display: grid;
		gap: 0.2rem;
		padding: 0.6rem 1rem;
		border-radius: 0.7rem;
		background: rgba(18, 24, 20, 0.82);
		color: white;
		font-size: 0.85rem;
		text-align: center;
		pointer-events: none;
		backdrop-filter: blur(6px);
	}
</style>
