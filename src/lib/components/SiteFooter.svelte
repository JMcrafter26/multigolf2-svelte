<script lang="ts">
	import { toggleTheme } from '$lib/i18n/state.svelte';
	import Localized from '$lib/components/Localized.svelte';
</script>

<footer>
	<div class="link-grid">
		<div class="link-group">
			<div class="group-header"><Localized en="Game" de="Spielen" /></div>
			<a class="group-item" href="/host/"><Localized en="Start a Game" de="Multigolf Hosten" /></a>
			<a class="group-item" href="/join/"><Localized en="Join a Game" de="Multigolf Beitreten" /></a
			>
			<a class="group-item" href="/mono/"><Localized en="Play Monogolf" de="Monogolf" /></a>
		</div>
		<div class="link-group">
			<div class="group-header">Info</div>
			<a class="group-item" href="/about/"><Localized en="About Multigolf" de="Über Multigolf" /></a
			>
			<a class="group-item" href="/contact/"><Localized en="Contact Me" de="Kontakt" /></a>
		</div>
		<div class="link-group">
			<div class="group-header"><Localized en="Legal" de="Legales" /></div>
			<a class="group-item" href="/impressum/"><Localized en="Imprint" de="Impressum" /></a>
			<a class="group-item" href="/data-privacy/"
				><Localized en="Data Privacy" de="Datenschutz" /></a
			>
		</div>
		<div class="link-group">
			<div class="group-header">Links</div>
			<a
				class="group-item"
				href="https://www.instagram.com/multi.golf/"
				target="_blank"
				rel="noreferrer">Instagram</a
			>
			<a
				class="group-item"
				href="https://www.tiktok.com/@multi.golf"
				target="_blank"
				rel="noreferrer">TikTok</a
			>
			<a
				class="group-item"
				href="https://multigolf.myspreadshop.de/"
				target="_blank"
				rel="noreferrer"
			>
				<Localized en="Merch Shop" de="Fan-Shop" />
			</a>
			<a
				class="group-item"
				href="https://play.google.com/store/apps/details?id=golf.multi.twa"
				target="_blank"
				rel="noreferrer">Play Store</a
			>
		</div>
	</div>
	<hr />
	<div class="footer-text">
		<span class="text"
			><Localized en="Made by Noel Friedrich" de="Erstellt von Noel Friedrich" /></span
		>
		<button class="theme-changer" type="button" onclick={toggleTheme}>
			<Localized en="Change Theme" de="Hell/Dunkel" />
		</button>
	</div>
</footer>
