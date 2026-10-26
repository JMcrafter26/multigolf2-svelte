<script lang="ts">
	import { page } from '$app/state';
	import { toggleLanguage } from '$lib/i18n/state.svelte';
	import Localized from '$lib/components/Localized.svelte';

	let menuOpen = $state(false);
	let atTop = $state(true);

	const links = [
		{ href: '/host/', en: 'Start Game', de: 'Spiel Starten' },
		{ href: '/join/', en: 'Join Game', de: 'Spiel Beitreten' },
		{ href: '/mono/', en: 'Mono', de: 'Mono' },
		{ href: '/about/', en: 'About', de: 'Info' }
	];

	function isCurrent(href: string): boolean {
		const path = page.url.pathname;
		return path === href || (href !== '/' && path.startsWith(href));
	}

	function changeLanguage(): void {
		toggleLanguage();
		document.querySelectorAll('.change-lang-button').forEach((element) => {
			element.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(360deg)' }], {
				easing: 'ease-in-out',
				duration: 350,
				fill: 'forwards'
			});
		});
	}

	function scrollToTop(): void {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window onscroll={() => (atTop = window.scrollY <= 0)} />

<header class:at-top={atTop} class:expanded={menuOpen}>
	<div class="header-content">
		<a href="/" class="logo-container" aria-label="Multigolf home">
			<img src="/assets/logo/logo.svg" class="logo" alt="Multigolf Logo" />
			<div class="logo-text">multigolf</div>
		</a>
		<nav class="link-island" aria-label="Main navigation">
			{#each links as link (link.href)}
				<a href={link.href} class:current={isCurrent(link.href)}>
					<Localized en={link.en} de={link.de} />
				</a>
			{/each}
			<button
				class="change-lang-button"
				type="button"
				onclick={changeLanguage}
				aria-label="Change language"
			></button>
		</nav>
		<button
			class="hamburger-icon"
			class:x={menuOpen}
			type="button"
			aria-label="Toggle menu"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<div class="bar"></div>
			<div class="bar"></div>
			<div class="bar"></div>
		</button>
	</div>
	<div class="header-drop-menu" class:visible={menuOpen}>
		<a href="/host/"><Localized en="Start a Game" de="Spiel Starten" /></a>
		<a href="/join/"><Localized en="Join a Game" de="Spiel Beitreten" /></a>
		<a href="/mono/"><Localized en="Monogolf" de="Monogolf" /></a>
		<a href="/about/"><Localized en="What is Multigolf?" de="Was ist Multigolf?" /></a>
		<a href="/contact/"><Localized en="Contact" de="Kontakt" /></a>
		<button
			class="change-lang-button"
			type="button"
			onclick={changeLanguage}
			aria-label="Change language"
		></button>
	</div>
</header>
<div class="header-placeholder"></div>

<button class="scroll-to-top" type="button" aria-label="Back to top" onclick={scrollToTop}
	><span aria-hidden="true">↑</span></button
>

<style>
	.current {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	.scroll-to-top {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 20;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		border: var(--button-border);
		background: var(--button-background);
		color: var(--button-text-color);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
		cursor: pointer;
		font-size: 1.25rem;
	}
</style>
