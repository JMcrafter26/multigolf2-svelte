<script lang="ts">
	import Localized from '$lib/components/Localized.svelte';
	import { apiUrl } from '$lib/api';
	import { i18n } from '$lib/i18n/state.svelte';

	type FormInfo = {
		name: string;
		email: string;
		phone: string;
		message: string;
	};

	const emptyForm: FormInfo = { name: '', email: '', phone: '', message: '' };
	let form = $state<FormInfo>({ ...emptyForm });
	let error = $state('');
	let sent = $state(false);
	let busy = $state(false);
	let errorElement: HTMLDivElement;

	function de(): boolean {
		return i18n.locale === 'de';
	}

	function validate(): string {
		if (!form.name) return de() ? 'Bitte gib einen Namen ein.' : 'Please enter a name.';
		if (form.name.length > 100) return de() ? 'Der Name ist zu lang.' : 'Name is too long.';
		if (!form.email) return de() ? 'Bitte gib eine E-Mail ein.' : 'Please enter an email.';
		if (form.email.length > 100) return de() ? 'Die E-Mail ist zu lang.' : 'Email is too long.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			return de() ? 'Ungültiges E-Mail-Format.' : 'Invalid email format.';
		if (form.phone && !/^\+?[0-9\s]+$/.test(form.phone))
			return de() ? 'Ungültiges Telefonnummernformat.' : 'Invalid phone format.';
		if (!form.message) return de() ? 'Bitte gib eine Nachricht ein.' : 'Please enter a message.';
		if (form.message.length > 1000)
			return de()
				? 'Die Nachricht darf höchstens 1000 Zeichen lang sein.'
				: 'Message max length is 1000 characters.';
		return '';
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const validationError = validate();
		error = validationError;
		if (validationError) {
			errorElement?.animate(
				[
					{ transform: 'translateX(-10px)' },
					{ transform: 'translateX(10px)' },
					{ transform: 'translateX(-10px)' },
					{ transform: 'translateX(10px)' },
					{ transform: 'translateX(0)' }
				],
				{ duration: 500 }
			);
			return;
		}
		if (busy) return;
		busy = true;

		const formData = new FormData();
		formData.append('name', form.name);
		formData.append('email', form.email);
		formData.append('phone', form.phone);
		formData.append('message', form.message);

		try {
			const response = await fetch(apiUrl('contact.php'), {
				method: 'POST',
				body: formData
			});
			const data = (await response.json()) as { ok?: boolean; error?: string };
			if (data.ok) {
				sent = true;
				error = '';
				form = { ...emptyForm };
			} else {
				error =
					data.error ??
					(de() ? 'Nachricht konnte nicht gesendet werden.' : 'Message could not be sent.');
			}
		} catch {
			error = de()
				? 'Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut.'
				: 'Your message could not be sent. Please try again later.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Contact | Multigolf</title>
	<meta name="description" content="Contact the creator of Multigolf." />
</svelte:head>

<main>
	<h1 lang="en">Contact Form</h1>
	<h1 lang="de">Kontaktformular</h1>

	{#if sent}
		<p class="form-success" lang="en">Message sent - I'll get back to you as soon as possible!</p>
		<p class="form-success" lang="de">
			Nachricht gesendet – ich melde mich so schnell wie möglich!
		</p>
	{:else}
		<form class="custom-form" onsubmit={submit}>
			<input
				type="text"
				name="name"
				placeholder="Name *"
				maxlength="100"
				autocomplete="name"
				bind:value={form.name}
				required
			/>
			<input
				type="email"
				name="email"
				placeholder="Email *"
				maxlength="100"
				autocomplete="email"
				bind:value={form.email}
				required
			/>
			<input
				type="tel"
				name="phone"
				placeholder="Phone"
				maxlength="100"
				autocomplete="tel"
				bind:value={form.phone}
			/>
			<textarea
				name="message"
				placeholder="Message *"
				rows="10"
				maxlength="1000"
				bind:value={form.message}
				required></textarea>
			<button type="submit" disabled={busy}>
				{#if busy}
					<Localized en="Sending..." de="Wird gesendet..." />
				{:else}
					<Localized en="Send Message" de="Nachricht Senden" />
				{/if}
			</button>
		</form>
	{/if}
	<div class="form-error" bind:this={errorElement} style:color={error ? 'red' : 'green'}>
		{error || (sent ? '' : '')}
	</div>
</main>

<style>
	.form-error {
		text-align: center;
		margin: 10px;
		min-height: 1.4em;
	}

	.form-success {
		text-align: center;
		color: var(--accent-color, #118b52);
		font-weight: 600;
	}
</style>
