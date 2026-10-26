<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import { apiUrl } from '$lib/api';
	import { t } from '$lib/i18n/state.svelte';

	const codeLength = 8;
	const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = $state('');
	let errorMessage = $state('');
	let busy = $state(false);
	let errorElement: HTMLParagraphElement;

	function sanitizeCode(value: string): string {
		return value
			.toUpperCase()
			.split('')
			.filter((character) => validChars.includes(character))
			.join('')
			.substring(0, codeLength);
	}

	function showError(message: string): void {
		errorMessage = message;
		errorElement?.animate(
			[
				{ transform: 'translateX(-10px)' },
				{ transform: 'translateX(10px)' },
				{ transform: 'translateX(-10px)' },
				{ transform: 'translateX(10px)' },
				{ transform: 'translateX(-10px)' },
				{ transform: 'translateX(10px)' },
				{ transform: 'translateX(0)' }
			],
			{ duration: 500, iterations: 1 }
		);
	}

	async function join(): Promise<void> {
		code = sanitizeCode(code);
		if (code.length === 0) {
			showError(t('net.pleaseEnterCode'));
			return;
		}
		if (code.length !== codeLength) {
			showError(t('net.codeMustBeCharsLong', { num: codeLength }));
			return;
		}
		if (busy) return;
		busy = true;

		let rows: unknown[];
		try {
			const response = await fetch(
				`${apiUrl('get_signals.php')}?pool_uid=${encodeURIComponent(code)}`
			);
			const payload = (await response.json()) as unknown;
			rows = Array.isArray(payload) ? payload : [];
		} catch {
			busy = false;
			showError(t('net.serverDown'));
			return;
		}

		if (rows.length === 0) {
			busy = false;
			showError(t('net.unknownID'));
			return;
		}

		errorMessage = '';
		window.location.href = `/client/?p=${encodeURIComponent(code)}`;
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') void join();
	}

	onMount(() => {
		sanitizeCode('');
	});
</script>

<svelte:head>
	<title>Join | Multigolf</title>
	<meta name="description" content="Join a game of Multigolf." />
</svelte:head>

<main>
	<h1><Localized en="Join a Game" de="Spiel Beitreten" /></h1>
	<p>
		<Localized
			en="To join a game, enter the session code below. The session code will be shown on the host device when the QR code is generated."
			de="Gib die Spiel-ID eines Spiels unten ein, um beizutreten. Die Spiel-ID wird unter dem QR-Code auf dem Server-Gerät angezeigt."
		/>
	</p>
	<p>
		<Localized
			en="You may also scan the QR code instead of typing the code here manually."
			de="Du kannst auch einfach den QR-Code auf dem Server-Gerät scannen, statt hier die Spiel-ID manuell einzugeben."
		/>
	</p>

	<input
		type="text"
		placeholder="ID"
		style="font-family: monospace;"
		maxlength={codeLength}
		autocapitalize="characters"
		autocomplete="off"
		spellcheck="false"
		bind:value={code}
		oninput={() => (code = sanitizeCode(code))}
		onkeydown={onKeydown}
	/>
	<p class="error" bind:this={errorElement} style:display={errorMessage ? 'block' : 'none'}>
		{errorMessage}
	</p>
	<button type="button" disabled={busy} onclick={join}>
		{#if busy}
			<Localized en="Joining..." de="Trete bei..." />
		{:else}
			<Localized en="Join Game" de="Spiel Beitreten" />
		{/if}
	</button>
</main>
