<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import { apiUrl } from '$lib/api';

	let unfolded = $state<Set<number>>(new Set());

	const faqs = [
		{
			enQuestion: 'Can I use the host device for the course?',
			deQuestion: 'Kann das Server-Gerät für den Kurs benutzt werden?',
			enAnswer:
				'No. The host phone displays useful information for the game, such as status, scores, and whose turn it is, and cannot participate as a device in the Multigolf course. Thus, when you are playing with 5 phones, only 4 can be used for the course itself while one must play host.',
			deAnswer:
				'Nein. Das Server-Gerät zeigt wichtige Informationen, den Spielstatus und Anleitungen an. Wenn also zum Beispiel insgesamt 5 Geräte verfügbar sind, können nur 4 davon für den Kurs benutzt werden. Es eignet sich gut, einen Laptop oder PC als Server-Gerät zu verwenden.'
		},
		{
			enQuestion: 'Can I use an iPad, a tablet, or a laptop?',
			deQuestion: 'Kann ich ein iPad, ein Tablet oder einen Laptop benutzen?',
			enAnswer:
				'Yes! You may use any device with a touch screen for the course. The host device does not need to have a touch screen: it makes sense to use a laptop or computer as the host to increase the number of phones available for the course.',
			deAnswer:
				'Ja! Du kannst jedes Gerät mit Touch-Screen als Kurs benutzen. Wenn du ein Gerät ohne Touch-Screen benutzen willst, kannst du es stattdessen als Server-Gerät verwenden.'
		},
		{
			enQuestion: 'How many devices do I need to play?',
			deQuestion: 'Wie viele Geräte brauche ich zum Spielen?',
			enAnswer:
				'A good Multigolf course is made up of at least 3 devices plus a host device. You can start games with only two devices (one host, one course), but that will not be much fun.',
			deAnswer:
				'Ein guter Multigolf-Kurs besteht aus mindestens 3 Geräten (und einem Server-Gerät). Es können auch Kurse mit nur einem Gerät gestartet werden, die aber nicht besonders aufregend sind.'
		},
		{
			enQuestion: 'Is there a maximum number of devices?',
			deQuestion: 'Gibt es eine maximale Anzahl von Geräten?',
			enAnswer:
				'No. You can add many phones, although the rounds might take a while to set up and play. The ideal number of devices is around 6, since a course that is too big gets boring, especially if you are just waiting for others to finish a round.',
			deAnswer:
				'Nein. Du kannst viele Geräte hinzufügen, jedoch werden die Runden wahrscheinlich zu lange dauern. Die ideale Anzahl an Geräten liegt bei etwa 6 Geräten.'
		},
		{
			enQuestion: 'Why can’t I build a circular course?',
			deQuestion: 'Wieso kann ich keinen Kreis-Kurs bauen?',
			enAnswer:
				'Most phones have smaller displays than their physical size because of their bezels. The game does not know how large those are, so it can only approximate the physical course. This makes it nearly impossible to align devices to form both a circular digital path and a circular physical path.',
			deAnswer:
				'Die meisten Handys haben ein kleineres Display als ihre physikalische Größe, weil sie Ränder haben. Das Spiel kann diese Ränder nicht einberechnen. Es kann also kein realitätsgetreues Abbild des Kurses digital replizieren. Deshalb lässt sich ein physisch kreisförmiger Kurs nicht exakt digital abbilden.'
		},
		{
			enQuestion: 'What happens when a device disconnects in-game?',
			deQuestion: 'Was passiert, wenn ein Gerät im Spiel ausgeht oder das Spiel verlässt?',
			enAnswer:
				'If the host device fails, the game stops. Try to keep it alive! If a device that is part of the course disconnects, you can reconnect it mid-game. If it fails permanently, you will have to restart the game.',
			deAnswer:
				'Wenn sich das Server-Gerät abschaltet, endet das Spiel. Wenn ein anderes Gerät im Kurs die Verbindung abbricht, kann es neu verbunden werden. Wenn es permanent den Kurs verlassen muss, muss ein neues Spiel angefangen werden.'
		}
	];

	function toggleFaq(index: number): void {
		if (unfolded.has(index)) unfolded.delete(index);
		else unfolded.add(index);
		unfolded = new Set(unfolded);
	}

	onMount(() => {
		const timeout = window.setTimeout(() => {
			void fetch(apiUrl('count_visit.php')).catch(() => {});
		}, 1000);
		return () => window.clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>Multigolf</title>
	<meta
		name="description"
		content="Homepage of multi.golf: a multiplayer minigolf game that uses multiple screens to build minigolf courses"
	/>
</svelte:head>

<div class="huge-text-container">
	<div class="headline">minigolf, but multiscreen</div>
	<div class="subtitle">
		<Localized
			en="a party board game that doesn't require any preparation."
			de="ein Minigolf-Brettspiel ganz ohne nervige Vorbereitung"
		/>
	</div>
</div>

<main>
	<div class="yt-video-wrapper">
		<iframe
			style="width: 100%"
			width="560"
			height="315"
			src="https://www.youtube.com/embed/6v91nD3gkiY?si=X1et9-EC__vEkYtG"
			title="YouTube video player"
			frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			referrerpolicy="strict-origin-when-cross-origin"
			allowfullscreen
		></iframe>
	</div>

	<p>
		<span lang="en">
			Welcome to Multigolf, the ultimate cross-device minigolf game! Transform any tabletop into an
			exciting course using phones. No downloads needed — just scan a QR code and start playing.
			Grab your friends, grab their phones, and start a tournament. Ready to play? Jump in and <a
				href="/host/">start a game</a
			> now!
		</span>
		<span lang="de">
			Willkommen zu Multigolf, dem ultimativen Multi-Gerät-Minigolf-Spiel! Verwandle jeden Tisch in
			einen aufregenden Multigolf-Kurs – es ist weder Download noch große Vorbereitung nötig. Nimm
			deine Freunde, klau die Handys und starte den Wettkampf. Klingt gut? Dann
			<a href="/host/">starte ein Spiel</a>!
		</span>
	</p>

	<div class="pic-link-grid">
		<a class="pic-link" href="/host/">
			<div class="pic-container">
				<img src="/assets/pics/ws-zs-pic.jpeg" alt="Multiple devices playing Multigolf together" />
				<div class="pic-text">
					<Localized en="Play Multigolf" de="Multigolf spielen" />
				</div>
			</div>
			<div class="pic-description">
				<Localized
					en="Start and host a round of Multigolf to play with your friends. Click to start!"
					de="Tippe hier, um ein Multigolf-Spiel mit deinen Freunden zu spielen."
				/>
			</div>
		</a>
		<a class="pic-link" href="/mono/">
			<div class="pic-container">
				<img src="/assets/pics/monogolf-example.jpg" alt="A screenshot of Monogolf in action" />
				<div class="pic-text">
					<Localized en="Play Monogolf" de="Monogolf spielen" />
				</div>
			</div>
			<div class="pic-description">
				<Localized
					en="Monogolf is the single-player version of Multigolf. Click to play!"
					de="Monogolf ist die Single-Player-Variante von Multigolf. Tippe hier, um Monogolf zu spielen!"
				/>
			</div>
		</a>
	</div>

	<hr />
	<h1><Localized en="FAQ and Help" de="FAQ und Hilfe" /></h1>
	<p lang="en">
		Below are some <b>F</b>requently <b>A</b>sked <b>Q</b>uestions. If you have any other questions,
		feel free to contact me <a href="/contact/">here</a>!
	</p>
	<p lang="de">
		Unten sind ein paar häufig gestellte Fragen (FAQs). Wenn andere Fragen bestehen, bin ich über
		das <a href="/contact/">Kontaktformular</a> erreichbar!
	</p>

	<div class="faq-container">
		{#each faqs as faq, index (index)}
			<div class="entry" class:unfolded={unfolded.has(index)}>
				<button class="question" type="button" lang="en" onclick={() => toggleFaq(index)}>
					{faq.enQuestion}
				</button>
				<button class="question" type="button" lang="de" onclick={() => toggleFaq(index)}>
					{faq.deQuestion}
				</button>
				<div class="answer" lang="en">{faq.enAnswer}</div>
				<div class="answer" lang="de">{faq.deAnswer}</div>
			</div>
		{/each}
	</div>
</main>

<style>
	.question {
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		font: inherit;
		font-weight: 700;
		color: inherit;
		padding: 0;
		cursor: pointer;
	}
</style>
