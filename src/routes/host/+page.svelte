<script lang="ts">
	import { onMount } from 'svelte';
	import Localized from '$lib/components/Localized.svelte';
	import { HostController } from '$lib/host/host-controller.svelte';
	import { gameMode, gamePhase } from '$lib/game/gamestate';
	import { golfObjectType } from '$lib/game/objects';
	import { toggleLanguage, t } from '$lib/i18n/state.svelte';
	import type { MessageKey } from '$lib/i18n/messages';

	let host = $state<HostController | null>(null);
	let boardCanvas = $state<HTMLCanvasElement | undefined>();
	let playerNames = $state<string[]>(Array.from({ length: 8 }, () => ''));
	let showLog = $state(false);
	let showFeedback = $state(false);

	const hostPhases = [
		gamePhase.Hello,
		gamePhase.ModeChoice,
		gamePhase.PlayerSetupDuell,
		gamePhase.PlayerSetupTournament,
		gamePhase.Connecting,
		gamePhase.ConfigGame,
		gamePhase.TournamentExplanation,
		gamePhase.DuellExplanation,
		gamePhase.ConstructionChoice,
		gamePhase.ConstructionAuto,
		gamePhase.ConstructionCustom,
		gamePhase.Loading,
		gamePhase.Placing,
		gamePhase.PlayingDuell,
		gamePhase.PlayingSandbox,
		gamePhase.PlayingTournament,
		gamePhase.ShowingResultsOfTournament,
		gamePhase.ShowingResultsOfDuell
	];

	$effect(() => {
		if (boardCanvas && host) host.attachCanvas(boardCanvas);
	});

	onMount(() => {
		const controller = new HostController();
		host = controller;
		void controller.init();
		return () => controller.destroy();
	});

	function changeLanguage(): void {
		toggleLanguage();
	}

	function register(): void {
		host?.registerPlayers(playerNames);
	}

	function isSetupPhase(phase: number): boolean {
		return phase === gamePhase.PlayerSetupDuell || phase === gamePhase.PlayerSetupTournament;
	}

	function setupInputCount(): number {
		return host?.mode === gameMode.Duell ? 2 : 8;
	}
</script>

<svelte:head>
	<title>Host | Multigolf</title>
	<meta
		name="description"
		content="Page to start and host a multi.golf game that others can join"
	/>
</svelte:head>

<header class="at-top">
	<div class="header-content">
		<a href="/" class="logo-container" aria-label="Multigolf home">
			<img src="/assets/logo/logo.svg" class="logo" alt="Multigolf Logo" />
			<div class="logo-text">multigolf</div>
		</a>
		<nav class="link-island always-visible" aria-label="Game navigation">
			<a href="/join/"><Localized en="Join" de="Beitreten" /></a>
			<button
				class="change-lang-button"
				type="button"
				onclick={changeLanguage}
				aria-label="Change language"
			></button>
		</nav>
	</div>
</header>
<div class="header-placeholder"></div>

{#if !host}
	<main class="host-main">
		<h2 style="text-align:center"><Localized en="Loading..." de="Wird geladen..." /></h2>
	</main>
{:else}
	{@const h = host}
	<main class="host-main">
		{#if h.toast}
			<div
				class="toast"
				class:error={h.toast.kind === 'error'}
				class:success={h.toast.kind === 'success'}
			>
				{h.toast.text}
			</div>
		{/if}

		{#if h.connections.length > 0}
			<fieldset class="player-list-fieldset">
				<legend><Localized en="Connected Players" de="Verbundene Spieler" /></legend>
				<div class="player-list">
					{#each h.connections as connection (connection.index)}
						<div class="player-status-container" title={connection.message}>
							<div class="circle-indicator {connection.color}"></div>
							<div class="player-name">
								<Localized en="Device #{connection.index}" de="Gerät #{connection.index}" />
							</div>
						</div>
					{/each}
				</div>
			</fieldset>
		{/if}

		<fieldset class="board-fieldset" class:has-board={h.hasCourse}>
			<legend><Localized en="Multigolf Board" de="Multigolf Kurs" /></legend>
			<canvas bind:this={boardCanvas} class="board-canvas" class:visible={h.hasCourse}></canvas>
			{#if !h.hasCourse}
				<p class="muted">
					<Localized
						en="The course will appear here once devices are connected."
						de="Der Kurs erscheint hier, sobald Geräte verbunden sind."
					/>
				</p>
			{/if}
		</fieldset>

		{#if h.phase === gamePhase.Hello}
			<section>
				<h2><Localized en="Welcome to Multigolf!" de="Willkommen bei Multigolf!" /></h2>
				<p>
					<Localized
						en="Good morning! You're the host of this fantastic new game of Multigolf. Gather some pals, steal some phones and have a good time!"
						de="Guten Morgen! Du bist hiermit das Server-Gerät dieser fantastischen neuen Runde Multigolf. Hol' ein paar Freunde, stiehl ein paar Handys und habt eine gute Zeit!"
					/>
				</p>
				<h3><Localized en="You need" de="Ihr braucht" /></h3>
				<ol>
					<li>
						<Localized
							en="at least one phone or tablet for the course"
							de="mindestens ein Handy oder Tablet für den Kurs"
						/>
					</li>
					<li>
						<Localized
							en="this device as the host screen"
							de="dieses Gerät als Server-Bildschirm"
						/>
					</li>
					<li>
						<Localized
							en="a table or floor to put the devices on"
							de="einen Tisch oder Boden für die Geräte"
						/>
					</li>
				</ol>
				<p class="muted">
					<Localized
						en="Tip: a laptop or computer makes a great host device, because it doesn't need to be part of the course."
						de="Tipp: Ein Laptop oder PC eignet sich super als Server-Gerät, weil er nicht Teil des Kurses sein muss."
					/>
				</p>
				<button type="button" onclick={() => h.changeModeChoice()}>
					<Localized en="Let's Go!" de="Los Geht's!" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.ModeChoice}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Choose a Game Mode" de="Spielmodus Wählen" /></h2>
				<button class="mode-button" type="button" onclick={() => h.chooseMode(gameMode.Tournament)}>
					<span class="mode-title"><Localized en="Tournament" de="Turnier" /></span>
					<span class="mode-description"
						><Localized
							en="Everyone builds and plays each other's courses. Most fun with 3–8 players."
							de="Alle bauen und spielen die Kurse der anderen. Am meisten Spaß mit 3–8 Spielern."
						/></span
					>
				</button>
				<button class="mode-button" type="button" onclick={() => h.chooseMode(gameMode.Duell)}>
					<span class="mode-title"><Localized en="Duel" de="Duell" /></span>
					<span class="mode-description"
						><Localized
							en="Two players race towards their own hole. The first ball in wins."
							de="Zwei Spieler spielen auf ihr eigenes Loch. Wer zuerst drin ist, gewinnt."
						/></span
					>
				</button>
				<button class="mode-button" type="button" onclick={() => h.chooseMode(gameMode.Sandbox)}>
					<span class="mode-title"><Localized en="Sandbox" de="Sandbox" /></span>
					<span class="mode-description"
						><Localized
							en="Build a course together and play freely."
							de="Baut gemeinsam einen Kurs und spielt frei."
						/></span
					>
				</button>
			</section>
		{/if}

		{#if isSetupPhase(h.phase)}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Player Registration" de="Registrierung" /></h2>
				<p>
					{#if h.mode === gameMode.Duell}
						<Localized
							en="I need to know the names of the two duellists."
							de="Jetzt brauche ich die Namen der zwei Spielerinnen und Spieler."
						/>
					{:else}
						<Localized
							en="I need the participants' names. Leave fields empty to play with fewer than 8 players."
							de="Jetzt brauche ich die Namen! Du kannst Felder frei lassen, um mit weniger als 8 Spielerinnen und Spielern anzufangen."
						/>
					{/if}
				</p>
				<fieldset class="many-inputs">
					<legend><Localized en="Player Names" de="Spielernamen" /></legend>
					{#each Array.from({ length: setupInputCount() }) as _, index (index)}
						<input
							type="text"
							placeholder={`Name ${index + 1}`}
							maxlength="30"
							bind:value={playerNames[index]}
						/>
					{/each}
				</fieldset>
				<button type="button" onclick={register}>
					<Localized en="I'm finished!" de="Fertig!" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.Connecting}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Device Connections" de="Geräte Verbinden" /></h2>
				<p>
					<Localized
						en="Tell everyone to scan the QR code below! You do not need to download anything to play."
						de="Jetzt muss jede Person den QR-Code unten scannen. Es muss nichts installiert werden – die Kamera-App reicht."
					/>
				</p>
				<p>
					<Localized
						en="Important: connection problems can happen between different networks. For best results, connect all devices to the same local network or hotspot."
						de="Wichtig: Es kann zu Verbindungsproblemen zwischen verschiedenen Netzwerken kommen. Am besten sind alle Geräte im selben WLAN oder Hotspot."
					/>
				</p>
				<div class="qr-container">
					{#if h.qrDataUrl}
						<img src={h.qrDataUrl} alt="QR code to join the Multigolf lobby" />
					{:else}
						<div class="qr-loading"></div>
					{/if}
				</div>
				{#if h.roomCode}
					<p class="room-code">
						<span><Localized en="Game ID:" de="Spiel-ID:" /></span>
						<code>{h.roomCode}</code>
					</p>
				{/if}
				<p class="connection-summary">
					<Localized en="{h.connections.length} connected" de="{h.connections.length} verbunden" />
				</p>
				{#if !h.roomCode}
					<button type="button" onclick={() => h.retryLobby()}>
						<Localized en="Retry Lobby" de="Lobby Erneut Versuchen" />
					</button>
				{/if}
				<button type="button" onclick={() => h.finishPlayers()}>
					<Localized en="I've connected all Devices!" de="Ich habe alle Geräte hinzugefügt!" />
				</button>
				<button type="button" class="smaller" onclick={() => (showLog = !showLog)}>
					<Localized en="Toggle Connection Log" de="Verbindungs-Log Anzeigen" />
				</button>
				{#if showLog}
					<pre class="log-output">{h.logLines.join('\n')}</pre>
				{/if}
			</section>
		{/if}

		{#if h.phase === gamePhase.ConfigGame}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Game Configuration" de="Optionen" /></h2>
				<p>
					{t('host.connectedDevices', { num: h.connections.length })}.
					<Localized
						en="Configure a few settings, then continue."
						de="Passe ein paar Einstellungen an und fahre fort."
					/>
				</p>
				<div id="game-config-container">
					<div>
						<div class="titlerow">
							<div class="name"><Localized en="Device Gravity" de="Gerät-Gravitation" /></div>
							<div class="input-container">
								<input
									type="checkbox"
									checked={h.deviceGravityEnabled}
									onchange={() => h.toggleDeviceGravity()}
								/>
							</div>
						</div>
						<div class="description">
							<Localized
								en="Tilted phones apply gravity to the balls."
								de="Geneigte Handys üben Gravitation auf die Bälle aus."
							/>
						</div>
					</div>
					{#if h.mode !== gameMode.Duell}
						<div>
							<div class="titlerow">
								<div class="name"><Localized en="Ball Collisions" de="Ball-Kollisionen" /></div>
								<div class="input-container">
									<input
										type="checkbox"
										checked={h.ballCollisionsEnabled}
										onchange={() => h.toggleBallCollisions()}
									/>
								</div>
							</div>
							<div class="description">
								<Localized
									en="If enabled, balls can kick each other."
									de="Wenn aktiviert, können Bälle sich gegenseitig schubsen."
								/>
							</div>
						</div>
					{/if}
					<div>
						<div class="titlerow">
							<div class="name"><Localized en="Sound Effects" de="Soundeffekte" /></div>
							<div class="input-container">
								<input
									type="checkbox"
									checked={h.soundsEnabled}
									onchange={() => h.toggleSounds()}
								/>
							</div>
						</div>
						<div class="description">
							<Localized
								en="Play sound effects on this device when balls collide."
								de="Soundeffekte auf diesem Gerät abspielen, wenn Bälle kollidieren."
							/>
						</div>
					</div>
					{#if h.mode === gameMode.Tournament}
						<div>
							<div class="titlerow">
								<div class="name"><Localized en="Read Names" de="Namen Vorlesen" /></div>
								<div class="input-container">
									<input
										type="checkbox"
										checked={h.speechEnabled}
										onchange={() => h.toggleSpeech()}
									/>
								</div>
							</div>
							<div class="description">
								<Localized
									en="Read the active player's name out loud."
									de="Den Namen des aktiven Spielers vorlesen."
								/>
							</div>
						</div>
						<div>
							<div class="titlerow">
								<div class="name">
									<Localized en="Maximum Kicks per Round" de="Maximale Schläge pro Runde" />
								</div>
								<div class="input-container">
									<input
										type="number"
										min="1"
										max="100"
										value={h.tournamentMaxKicks}
										oninput={(event) => h.setMaxKicks(Number(event.currentTarget.value))}
									/>
								</div>
							</div>
							<div class="description">
								<Localized
									en="Players get a 2-point penalty after this many kicks."
									de="Nach so vielen Schlägen gibt es 2 Strafpunkte."
								/>
							</div>
						</div>
					{/if}
				</div>
				<button type="button" onclick={() => h.finishConfig()}>
					<Localized en="Continue" de="Weiter" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.TournamentExplanation}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<p>
					<strong>{h.tournamentBuilderName}</strong>
					<Localized
						en=" is the course constructor now."
						de=" ist jetzt dran, einen Kurs zu bauen."
					/>
				</p>
				<p>
					<Localized
						en="After constructing the course, everyone (including the builder) plays it. Once everyone is finished, the next person builds a course."
						de="Nachdem der Kurs fertig ist, spielt ihn jeder (inklusive der bauenden Person). Wenn alle fertig sind, baut die nächste Person einen Kurs."
					/>
				</p>
				<button type="button" onclick={() => h.startGame()}>
					<Localized en="Begin Constructing" de="Kurs Bauen" />
				</button>
				<button type="button" class="smaller" onclick={() => (showFeedback = !showFeedback)}>
					<Localized en="Send Feedback" de="Feedback Senden" />
				</button>
				{#if showFeedback}
					<div class="custom-form feedback-form">
						<textarea rows="5" bind:value={h.feedbackText} placeholder="Feedback"></textarea>
						<button type="button" class="smaller" onclick={() => h.sendFeedback()}>
							<Localized en="Send" de="Senden" />
						</button>
					</div>
				{/if}
			</section>
		{/if}

		{#if h.phase === gamePhase.DuellExplanation}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Let the duel begin!" de="Lass das Duell beginnen!" /></h2>
				<p>
					<Localized
						en="Construct the course together. Place one hole for each player — your opponent places your hole."
						de="Baut den Kurs gemeinsam. Platziert ein Loch für jeden Spieler – euer Gegner platziert euer Loch."
					/>
				</p>
				<button type="button" onclick={() => h.startGame()}>
					<Localized en="Begin Constructing" de="Weiter" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.ConstructionChoice}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Course Layout" de="Kurs-Layout" /></h2>
				<p>
					<Localized
						en="How do you want to choose the course layout (how the devices lie next to each other)?"
						de="Wie willst du das Kurs-Layout (wie die Geräte zueinander liegen) bestimmen?"
					/>
				</p>
				{#if h.canKeepLayout}
					<button type="button" onclick={() => h.keepLayout()}>
						<Localized en="Keep current Layout" de="Aktuelles Layout Behalten" />
					</button>
				{/if}
				<fieldset>
					<legend><Localized en="Automatic Layout" de="Automatisches Layout" /></legend>
					<p>
						<Localized
							en="The game will suggest layouts for you to replicate."
							de="Das Spiel schlägt Layouts vor, die du nachbauen sollst."
						/>
					</p>
					<button type="button" onclick={() => h.startAutoLayout()}>
						<Localized en="Start an Auto-Layout" de="Automatisches Layout Starten" />
					</button>
				</fieldset>
				<fieldset>
					<legend><Localized en="Custom Layout" de="Eigenes Layout" /></legend>
					<p>
						<Localized
							en="Draw lines on the phones along the edges where they touch. This takes a little longer but matches your physical setup."
							de="Male Linien auf den Handys entlang der Kanten, an denen sie sich berühren. Das dauert etwas länger, passt aber genau zu eurem Aufbau."
						/>
					</p>
					<button type="button" onclick={() => h.startCustomLayout()}>
						<Localized en="Start a Custom-Layout" de="Eigenes Layout Starten" />
					</button>
				</fieldset>
			</section>
		{/if}

		{#if h.phase === gamePhase.ConstructionAuto}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Automatic Course Layout" de="Automatisches Kurs-Layout" /></h2>
				<p>
					<Localized
						en="Tap each phone once to make sure the screens have their correct size. Then choose one of the suggested layouts and arrange the phones accordingly."
						de="Tippe auf jedem Handy einmal auf den Bildschirm, damit die Größen stimmen. Wähle dann ein Layout und ordne die Handys entsprechend an."
					/>
				</p>
				{#if h.layoutGenerating}
					<p class="muted">
						<Localized en="Generating layouts..." de="Layouts werden erzeugt..." />
					</p>
				{/if}
				<div id="layout-choice-container">
					{#each h.layoutChoices as choice, index (index)}
						<div class="layout-choice">
							<img src={choice.image} alt={`Suggested course layout ${index + 1}`} />
							<button type="button" onclick={() => h.chooseLayout(index)}>
								<Localized en="Choose Layout" de="Layout Wählen" />
							</button>
						</div>
					{/each}
				</div>
				<button type="button" class="smaller" onclick={() => h.generateBoardTemplates()}>
					<Localized en="Regenerate" de="Regenerieren" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.ConstructionCustom}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Custom Course Layout" de="Eigenes Kurs-Layout" /></h2>
				<p>
					<Localized
						en="Draw lines on both edges of two phones that touch. Connect phones in ascending order: #1 to #2, #2 to #3, and so on. The board above shows how the game interprets your lines."
						de="Zeichne auf beiden Handys eine Linie entlang der Kante, an der sie sich berühren. Verbinde Gerät #1 mit #2, #2 mit #3 usw. Oben siehst du, wie das Spiel eure Linien versteht."
					/>
				</p>
				<img src="/assets/gifs/building.gif" alt="Example of drawing connecting lines" />
				<button type="button" onclick={() => h.finishConstruction()}>
					<Localized en="I've connected all phones!" de="Ich habe alle Geräte verbunden!" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.Loading}
			<section>
				<h2><Localized en="Loading..." de="Wird geladen..." /></h2>
				<p>
					<Localized
						en="I'm currently loading all connected devices. This won't take long, I promise."
						de="Ich lade aktuell die verbundenen Geräte. Das wird nicht lange dauern, versprochen."
					/>
				</p>
			</section>
		{/if}

		{#if h.phase === gamePhase.Placing}
			<section>
				<button class="back-button" type="button" onclick={() => h.back()}>
					<Localized en="◀ Back" de="◀ Zurück" />
				</button>
				<h2><Localized en="Placing Objects" de="Objekte Platzieren" /></h2>
				<p>
					<Localized
						en="Select an object and click anywhere on the course to place it. Every course needs a start and a hole. Move objects by dragging and pinching; remove them with the eraser."
						de="Wähle ein Objekt und tippe auf den Kurs, um es zu platzieren. Jeder Kurs braucht einen Start und ein Loch. Objekte lassen sich ziehen und vergrößern; mit dem Radierer entfernst du sie."
					/>
				</p>
				<div class="object-selection-container">
					{#each h.visiblePlacableObjects as object (object.type)}
						<button
							type="button"
							class="object"
							class:selected={h.placingObjectType === object.type}
							onclick={() => h.selectPlacingObject(object.type)}
						>
							<span class="title">{t(object.nameKey as MessageKey)}</span>
							<span class="head-img"><img src={object.sprite} alt="" /></span>
							<span class="description"
								>{h.gameState.replaceText(t(object.descriptionKey as MessageKey))}</span
							>
						</button>
					{/each}
				</div>
				<fieldset style="grid-template-columns: 1fr 1fr;">
					<legend><Localized en="Place Random Objects" de="Zufällige Objekte Platzieren" /></legend>
					<button
						type="button"
						class="smaller"
						onclick={() => h.placeRandomObjects(3, golfObjectType.Lava)}
					>
						<Localized en="3x Lava" de="3x Lava" />
					</button>
					<button
						type="button"
						class="smaller"
						onclick={() => h.placeRandomObjects(3, golfObjectType.GravityBox)}
					>
						<Localized en="3x Gravity" de="3x Gravitations-Box" />
					</button>
				</fieldset>
				<button type="button" onclick={() => h.finishPlacing()}>
					<Localized en="I'm finished." de="Fertig!" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.PlayingTournament}
			<section>
				<h2><Localized en="Tournament" de="Turnier" /></h2>
				{#if h.scoreboardUrl}
					<img class="scoreboard" src={h.scoreboardUrl} alt="Current tournament scoreboard" />
				{/if}
				<p>{t('common.turn', { name: h.tournamentActiveName })}</p>
				<p>
					{t('host.tournamentExplanation')}
					{t('host.tournamentRound', {
						current: h.tournamentRound,
						total: Math.max(h.players.length, 1)
					})}
				</p>
				<fieldset>
					<legend><Localized en="Gesture Controls" de="Gestensteuerung" /></legend>
					<p>
						<Localized
							en="Experimental: kick balls with hand gestures captured by the camera of the phone the ball is on."
							de="Experimentell: Schieße Bälle mit Handgesten, die von der Kamera des aktuellen Handys erkannt werden."
						/>
					</p>
					<img src="/assets/gifs/camera-control.gif" alt="Camera control explanation" />
					<button type="button" class="smaller" onclick={() => h.switchCameraControls()}>
						{#if h.cameraControlsActive}
							<Localized en="Deactivate Camera Controls" de="Gestensteuerung Beenden" />
						{:else}
							<Localized en="Activate Camera Controls" de="Gestensteuerung Aktivieren" />
						{/if}
					</button>
				</fieldset>
			</section>
		{/if}

		{#if h.phase === gamePhase.PlayingDuell}
			<section>
				<h2><Localized en="Duel" de="Duell" /></h2>
				<p>
					{t('host.duellExplanation')}
					{t('common.turn', { name: h.duellActiveName })}
				</p>
			</section>
		{/if}

		{#if h.phase === gamePhase.PlayingSandbox}
			<section>
				<h2><Localized en="Sandbox" de="Freies Spiel" /></h2>
				<button type="button" onclick={() => h.spawnBall()}>
					<Localized en="Spawn a new Ball" de="Ball Hinzufügen" />
				</button>
				<hr />
				<button type="button" onclick={() => h.playAgain()}>
					<Localized en="Play a new Gamemode" de="Spielmodus Wechseln" />
				</button>
				<fieldset>
					<legend><Localized en="Gesture Controls" de="Gestensteuerung" /></legend>
					<p>
						<Localized
							en="Experimental: kick balls with hand gestures captured by the camera of the phone the ball is on."
							de="Experimentell: Schieße Bälle mit Handgesten, die von der Kamera des aktuellen Handys erkannt werden."
						/>
					</p>
					<img src="/assets/gifs/camera-control.gif" alt="Camera control explanation" />
					<button type="button" class="smaller" onclick={() => h.switchCameraControls()}>
						{#if h.cameraControlsActive}
							<Localized en="Deactivate Camera Controls" de="Gestensteuerung Beenden" />
						{:else}
							<Localized en="Activate Camera Controls" de="Gestensteuerung Aktivieren" />
						{/if}
					</button>
				</fieldset>
			</section>
		{/if}

		{#if h.phase === gamePhase.ShowingResultsOfTournament}
			<section>
				<h2><Localized en="Tournament Results" de="Turnier-Resultate" /></h2>
				{#if h.scoreboardUrl}
					<img class="scoreboard" src={h.scoreboardUrl} alt="Final tournament scoreboard" />
				{/if}
				<button type="button" onclick={() => h.shareScoreboard()}>
					<Localized en="🎈 Share Scores" de="🎈 Ergebnisse Teilen" />
				</button>
				<button type="button" class="smaller" onclick={() => h.downloadScoreboard()}>
					<Localized en="Download Image" de="Bild Herunterladen" />
				</button>
				<p>
					<Localized
						en="Thank you very much for playing! Share the results with your friends using the button above."
						de="Vielen Dank fürs Spielen! Teile die Ergebnisse über den Button oben mit deinen Freunden."
					/>
				</p>
				<fieldset>
					<legend>Feedback</legend>
					<p>
						<Localized
							en="How did you find the game? What could be improved?"
							de="Wie war das Spiel? Was könnte besser sein?"
						/>
					</p>
					<textarea rows="5" bind:value={h.feedbackText} placeholder="Feedback"></textarea>
					<button type="button" class="smaller" onclick={() => h.sendFeedback()}>
						<Localized en="Send Feedback" de="Feedback Senden" />
					</button>
				</fieldset>
				<button type="button" onclick={() => h.playAgain()}>
					<Localized en="Play a new Game" de="Neues Spiel Anfangen" />
				</button>
			</section>
		{/if}

		{#if h.phase === gamePhase.ShowingResultsOfDuell}
			<section>
				<h2>
					<span>{h.duellWinnerName}</span>
					<Localized en=" won the Duel!" de=" hat das Duell gewonnen!" />
				</h2>
				<p>
					<Localized
						en="The duel is over and the winner was determined! Play another game mode or start another duel below. Thank you for playing!"
						de="Das Duell ist vorbei! Vielen Dank fürs Spielen! Starte unten ein neues Spiel – vielleicht in einem anderen Modus?"
					/>
				</p>
				<fieldset>
					<legend>Feedback</legend>
					<p>
						<Localized
							en="How did you find the game? What could be improved?"
							de="Wie war das Spiel? Was könnte besser sein?"
						/>
					</p>
					<textarea rows="5" bind:value={h.feedbackText} placeholder="Feedback"></textarea>
					<button type="button" class="smaller" onclick={() => h.sendFeedback()}>
						<Localized en="Send Feedback" de="Feedback Senden" />
					</button>
				</fieldset>
				<button type="button" onclick={() => h.playAgain()}>
					<Localized en="Play a new Game" de="Neues Spiel Anfangen" />
				</button>
			</section>
		{/if}

		{#if !hostPhases.includes(h.phase as (typeof hostPhases)[number])}
			<p class="muted">
				<Localized en="Waiting for the next step..." de="Warte auf den nächsten Schritt..." />
			</p>
		{/if}
	</main>
{/if}

<style>
	.host-main {
		display: grid;
		gap: 1.5rem;
		padding-bottom: 4rem;
	}

	.host-main section {
		position: relative;
	}

	.back-button {
		width: fit-content;
		margin-bottom: 0.25rem;
	}

	.board-fieldset {
		gap: 0 !important;
	}

	.board-fieldset:not(.has-board) {
		display: none;
	}

	.board-canvas {
		width: 100%;
		aspect-ratio: 5 / 3;
		display: none;
		background-color: #8cffbd;
		border-radius: 0.5rem;
	}

	.board-canvas.visible {
		display: block;
	}

	.player-list-fieldset {
		gap: 0.4em !important;
	}

	.player-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.5rem;
		margin-top: -0.5rem;
	}

	.toast {
		position: fixed;
		z-index: 120;
		left: 50%;
		bottom: 1rem;
		transform: translateX(-50%);
		width: min(30rem, calc(100% - 2rem));
		padding: 0.9rem 1.2rem;
		border-radius: 0.6rem;
		background: #1d2a22;
		color: white;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		text-align: center;
	}

	.toast.error {
		background: #8d1e1e;
	}

	.toast.success {
		background: #116c43;
	}

	.mode-button {
		display: grid !important;
		gap: 0.25rem;
		text-align: left !important;
	}

	.mode-title {
		font-family: var(--header-font);
		font-weight: bold;
		font-size: 1.2em;
	}

	.mode-description {
		font-size: 0.9em;
		opacity: 0.8;
	}

	.qr-container {
		width: min(20rem, 100%);
		margin: 0 auto;
		background: white;
		border-radius: 0.8rem;
		padding: 0.75rem;
	}

	.qr-container img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 0.4rem;
	}

	.room-code {
		text-align: center;
		font-size: 1.2em;
	}

	.room-code code {
		font-size: 1.4em;
		letter-spacing: 0.15em;
		background: var(--input-background);
		padding: 0.15em 0.45em;
		border-radius: 0.35em;
	}

	.connection-summary {
		text-align: center;
		font-weight: 600;
	}

	#layout-choice-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.layout-choice {
		position: relative;
		padding: 1rem;
		padding-bottom: 4rem;
		border-radius: 1rem;
		border: var(--button-border);
	}

	.layout-choice img {
		width: 100%;
		height: auto;
		border-radius: 0.5rem;
		background: #8cffbd;
	}

	.layout-choice button {
		width: fit-content !important;
		position: absolute;
		right: 0;
		bottom: 0;
		font-size: 1em !important;
		border-radius: 1rem 0 1rem 0;
		padding: 0.8rem !important;
	}

	main .object-selection-container .object {
		background: var(--button-background);
		color: var(--button-color);
		text-align: left;
		display: grid;
		gap: 0.25rem;
		width: 100%;
		font-size: 1rem;
		padding: var(--object-padding);
	}

	main .object-selection-container .title {
		font-size: 0.95rem;
	}

	main .object-selection-container .head-img {
		display: flex;
	}

	main .object-selection-container .head-img img {
		height: 4em;
		width: auto;
	}

	.scoreboard {
		object-fit: contain;
		max-height: 20em;
		background: white;
		border-radius: 0.5rem;
	}

	.muted {
		opacity: 0.65;
	}

	.log-output {
		max-height: 16rem;
		overflow: auto;
		background: #111;
		color: #b8ffce;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
	}

	@media (max-width: 600px) {
		.host-main {
			padding: 1rem;
		}
	}
</style>
