export type Locale = 'en' | 'de';

type Translation = Record<Locale, string>;

/**
 * Dynamic strings and notifications. Static page copy lives directly in the
 * route components as `<Localized>` spans so both languages can be prerendered.
 */
export const messages = {
	'common.back': { en: '◀ Back', de: '◀ Zurück' },
	'common.next': { en: 'Next', de: 'Weiter' },
	'common.continue': { en: 'Continue', de: 'Weiter' },
	'common.cancel': { en: 'Cancel', de: 'Abbrechen' },
	'common.close': { en: 'Close', de: 'Schließen' },
	'common.copy': { en: 'Copy', de: 'Kopieren' },
	'common.copied': { en: 'Copied!', de: 'Kopiert!' },
	'common.retry': { en: 'Try Again', de: 'Nochmal versuchen' },
	'common.loading': { en: 'Loading...', de: 'Lädt...' },
	'common.player': { en: 'Player', de: 'Spieler' },
	'common.players': { en: 'Players', de: 'Spieler' },
	'common.device': { en: 'Device', de: 'Gerät' },
	'common.devices': { en: 'Devices', de: 'Geräte' },
	'common.turn': { en: "It's {name}'s turn.", de: '{name} ist dran.' },
	'common.kicks': { en: 'Kicks', de: 'Schläge' },
	'common.score': { en: 'Score', de: 'Punkte' },
	'common.hole': { en: 'Hole', de: 'Loch' },
	'common.start': { en: 'Start', de: 'Start' },
	'common.wall': { en: 'Wall', de: 'Wand' },
	'common.lava': { en: 'Lava', de: 'Lava' },
	'common.cannon': { en: 'Cannon', de: 'Kanone' },
	'common.eraser': { en: 'Eraser', de: 'Radierer' },
	'common.gravityBox': { en: 'Gravity Box', de: 'Gravitations-Box' },
	'common.object': { en: 'Object', de: 'Objekt' },
	'common.objects': { en: 'Objects', de: 'Objekte' },
	'common.course': { en: 'Course', de: 'Kurs' },
	'common.roomCode': { en: 'Room code', de: 'Spiel-ID' },
	'common.on': { en: 'On', de: 'An' },
	'common.off': { en: 'Off', de: 'Aus' },
	'common.yes': { en: 'Yes', de: 'Ja' },
	'common.no': { en: 'No', de: 'Nein' },
	'common.settings': { en: 'Settings', de: 'Einstellungen' },
	'common.language': { en: 'Language', de: 'Sprache' },
	'common.theme': { en: 'Theme', de: 'Design' },
	'common.darkMode': { en: 'Dark mode', de: 'Dunkles Design' },
	'common.lightMode': { en: 'Light mode', de: 'Helles Design' },

	'object.Start.name': { en: 'Start', de: 'Start' },
	'object.Start.description': {
		en: 'Place where all balls start',
		de: 'Platz, wo alle Bälle starten'
	},
	'object.Hole.name': { en: 'Hole', de: 'Loch' },
	'object.Hole.description': {
		en: 'Goal that all balls must reach',
		de: 'Ziel, welches alle Bälle erreichen müssen'
	},
	'object.Lava.name': { en: 'Lava', de: 'Lava' },
	'object.Lava.description': {
		en: 'Balls falling into lava are reset to the start',
		de: 'In Lava fallen = Zum Start zurück'
	},
	'object.Cannon.name': { en: 'Cannon', de: 'Kanone' },
	'object.Cannon.description': {
		en: 'Rotates and shoots balls',
		de: 'Dreht sich und schießt Bälle weg'
	},
	'object.Eraser.name': { en: 'Eraser', de: 'Radierer' },
	'object.Eraser.description': { en: 'Erase placed objects', de: 'Radiere platzierte Objekte' },
	'object.Hole-1.name': { en: 'Hole 1', de: 'Loch 1' },
	'object.Hole-1.description': {
		en: 'Goal that <duell-player-1> has to reach',
		de: 'Ziel, das <duell-player-1> erreichen muss'
	},
	'object.Hole-2.name': { en: 'Hole 2', de: 'Loch 2' },
	'object.Hole-2.description': {
		en: 'Goal that <duell-player-2> has to reach',
		de: 'Ziel, das <duell-player-2> erreichen muss'
	},
	'object.Extra-Wall.name': { en: 'Extra Wall', de: 'Extra Wand' },
	'object.Extra-Wall.description': {
		en: 'A wall that balls will bounce off',
		de: 'Eine Wand, an der Bälle abprallen'
	},
	'object.Gravity-Box.name': { en: 'Gravity Box', de: 'Gravitations-Box' },
	'object.Gravity-Box.description': {
		en: 'Balls inside will experience gravity',
		de: 'Bälle werden in die Richtung geschubst'
	},

	'net.connectionFailed': { en: 'Connection failed.', de: 'Verbindung fehlgeschlagen.' },
	'net.tryingAgainInSeconds': {
		en: '⌛ Trying again in {seconds} seconds.',
		de: '⌛ Versuche nochmal in {seconds} Sekunden.'
	},
	'net.tryingAgainIn10': {
		en: '⌛ Trying again in 10 seconds.',
		de: '⌛ Versuche nochmal in 10 Sekunden.'
	},
	'net.connectingToHost': { en: 'Connecting to host...', de: 'Verbinde zu Server...' },
	'net.connectedToHost': { en: 'Connected to host.', de: 'Verbindung erfolgreich.' },
	'net.connectionEstablished': {
		en: '✅ Connection established.',
		de: '✅ Verbindung erfolgreich.'
	},
	'net.connectionDied': { en: '❌ Connection died', de: '❌ Verbindung abgebrochen.' },
	'net.couldNotConnect': {
		en: '❌ Could not connect to host.',
		de: '❌ Verbindung fehlgeschlagen.'
	},
	'net.createdPool': { en: '✅ Created game ({id})', de: '✅ Spiel erstellt ({id})' },
	'net.initializingPeerToPeer': {
		en: '🫂 Initializing peer-to-peer...',
		de: '🫂 Verbindung wird aufgebaut...'
	},
	'net.goodConnection': { en: 'Good connection', de: 'Gute Verbindung' },
	'net.connectionInitializing': {
		en: 'Connection is being initialized',
		de: 'Verbindung wird hergestellt'
	},
	'net.connectionTimedOut': { en: 'Connection timed out', de: 'Verbindung abgebrochen' },
	'net.connectionSlow': {
		en: 'Connection is slow ({ping}ms ping)',
		de: 'Verbindung ist langsam ({ping}ms Ping)'
	},
	'net.pleaseEnterCode': { en: 'Please enter an ID.', de: 'Bitte gib eine ID ein.' },
	'net.codeMustBeCharsLong': {
		en: 'ID must be {num} characters long.',
		de: 'ID muss {num} Buchstaben lang sein.'
	},
	'net.serverDown': {
		en: "Couldn't reach the server. Is it down?",
		de: 'Server hat nicht geantwortet. Ist er down?'
	},
	'net.unknownID': { en: 'Unknown ID', de: 'Unbekannte ID' },
	'net.ping': { en: '{ping}ms', de: '{ping}ms' },
	'net.connectionInvitation': { en: 'Connection invitation', de: 'Verbindungs-Einladung' },
	'net.rtcAnswer': { en: 'RTC answer', de: 'RTC Antwort' },
	'net.connectionAnswer': { en: 'Connection answer', de: 'Verbindungs-Antwort' },
	'net.leavingWarning': {
		en: "You're in an active game of Multigolf. Leaving this website will break the game!",
		de: 'Du bist in einem aktiven Multigolf-Spiel. Das Verlassen der Website beendet das Spiel!'
	},

	'host.playersPlaceholder': {
		en: 'Once you connect players, they will show up here.',
		de: 'Sobald du Geräte verbindest, tauchen sie hier auf.'
	},
	'host.deviceNumber': { en: 'Device #{num}', de: 'Gerät #{num}' },
	'host.noDevices': {
		en: "You haven't connected any devices yet. Connect one and try again!",
		de: 'Du hast noch keine Geräte verbunden. Verbinde mindestens eines und versuche es nochmal!'
	},
	'host.nameTooLong': {
		en: 'Name "{name}..." is too long.',
		de: 'Der Name "{name}..." ist zu lang.'
	},
	'host.fillAllFields': { en: 'Please fill out all fields.', de: 'Bitte fülle alle Felder aus.' },
	'host.fillOneName': {
		en: 'Fill out at least one name to continue.',
		de: 'Bitte fülle mindestens einen Namen aus.'
	},
	'host.sameName': {
		en: 'Two players cannot have the same name.',
		de: 'Es kann sich kein Name doppeln.'
	},
	'host.courseOverlap': {
		en: 'Your course has overlapping parts. Try reconnecting the phones in a different way. Do you still want to proceed?',
		de: 'Der Kurs hat überlappende Teile. Versuche, die Geräte neu miteinander zu verbinden. Willst du trotzdem fortfahren?'
	},
	'host.noStart': {
		en: "You haven't placed a start yet. Place one and try again.",
		de: 'Dem Kurs fehlt ein Start. Platzier einen und probier es nochmal.'
	},
	'host.noHole': {
		en: "You haven't placed a hole yet. Place one and try again.",
		de: 'Dem Kurs fehlt ein Loch. Platzier eins und probier es nochmal.'
	},
	'host.noDuellHole': {
		en: "You haven't placed a hole for {name} yet.",
		de: 'Du hast noch kein Loch für {name} platziert.'
	},
	'host.notConstructed': {
		en: "You haven't constructed a course layout yet.",
		de: 'Du hast noch kein Layout erstellt.'
	},
	'host.connectedDevices': { en: '{num} connected', de: '{num} verbunden' },
	'host.scanToJoin': { en: 'Scan to join', de: 'Scannen zum Beitreten' },
	'host.waitingForPlayers': { en: 'Waiting for players', de: 'Warte auf Spieler' },
	'host.startGame': { en: 'Start Game', de: 'Spiel Starten' },
	'host.openLobby': { en: 'Open Lobby', de: 'Lobby Öffnen' },
	'host.playersRegistered': { en: 'Players registered', de: 'Spieler registriert' },
	'host.finishPlayers': { en: 'Finish Registration', de: 'Registrierung Abschließen' },
	'host.gameConfig': { en: 'Game Settings', de: 'Spiel-Einstellungen' },
	'host.layoutChoice': { en: 'Choose a course layout', de: 'Kurs-Layout Wählen' },
	'host.deviceGravity': { en: 'Device Gravity', de: 'Gerät-Gravitation' },
	'host.deviceGravityDescription': {
		en: 'If enabled, phones tilted in real life will apply a gravity effect on balls.',
		de: 'Wenn aktiviert, wird die Orientierung von Handys als Gravitation einberechnet.'
	},
	'host.ballCollisions': { en: 'Ball Collisions', de: 'Ball-Kollisionen' },
	'host.ballCollisionsDescription': {
		en: 'If enabled, balls can kick each other. If disabled, balls fly over each other.',
		de: 'Wenn aktiviert, können Bälle sich gegenseitig schubsen.'
	},
	'host.soundEffects': { en: 'Sound Effects', de: 'Soundeffekte' },
	'host.soundEffectsDescription': {
		en: 'If enabled, the host device will play sound effects when balls collide.',
		de: 'Wenn aktiviert, spielt das Server-Gerät Soundeffekte ab, wenn Bälle kollidieren.'
	},
	'host.readNames': { en: 'Read Names', de: 'Namen Vorlesen' },
	'host.readNamesDescription': {
		en: 'If enabled, the host device will read the active player name out loud.',
		de: 'Wenn aktiviert, liest das Server-Gerät den Namen des aktiven Spielers vor.'
	},
	'host.maxKicks': { en: 'Maximum Kicks per Round', de: 'Maximale Schläge pro Runde' },
	'host.maxKicksDescription': {
		en: 'Decide how many kicks each player gets before receiving a 2-point penalty.',
		de: 'Entscheide, wie viele Schläge jede Spielerin bekommt, bevor sie 2 Strafpunkte erhält.'
	},
	'host.shareScoreboard': { en: 'Share Scoreboard', de: 'Ergebnis Teilen' },
	'host.downloadScoreboard': { en: 'Download Image', de: 'Bild Herunterladen' },
	'host.newGame': { en: 'Play Again', de: 'Nochmal Spielen' },
	'host.cancelGame': { en: 'End Game', de: 'Spiel Beenden' },
	'host.cancelGameConfirm': {
		en: 'Do you really want to end the current game?',
		de: 'Willst du das aktuelle Spiel wirklich beenden?'
	},
	'host.leaveLobbyConfirm': {
		en: 'Close the lobby and disconnect all players?',
		de: 'Lobby schließen und alle Spieler trennen?'
	},
	'host.feedback': { en: 'Send Feedback', de: 'Feedback Senden' },
	'host.feedbackPlaceholder': {
		en: 'What did you like? What could be better?',
		de: 'Was hat dir gefallen? Was könnte besser sein?'
	},
	'host.thanksForFeedback': {
		en: "Thanks for the feedback! You're the best!",
		de: 'Feedback erfolgreich abgeschickt! Vielen Dank!'
	},
	'host.feedbackTooLong': {
		en: "That's too much feedback for this box. Maybe send an email instead?",
		de: 'Das ist zu viel Feedback für diese Box. Vielleicht ist eine E-Mail besser?'
	},
	'host.feedbackFailed': {
		en: 'Feedback could not be sent.',
		de: 'Feedback konnte nicht gesendet werden.'
	},
	'host.log': { en: 'Connection Log', de: 'Verbindungs-Log' },
	'host.connectionStatus': { en: 'Connection Status', de: 'Verbindungsstatus' },
	'host.qrLoading': { en: 'Preparing invitation...', de: 'Einladung wird vorbereitet...' },
	'host.modeSandbox': { en: 'Sandbox', de: 'Sandbox' },
	'host.modeSandboxDescription': {
		en: 'Build a course together and play it freely.',
		de: 'Baut gemeinsam einen Kurs und spielt ihn frei.'
	},
	'host.modeDuell': { en: 'Duel', de: 'Duell' },
	'host.modeDuellDescription': {
		en: 'Two players race to their own hole.',
		de: 'Zwei Spieler spielen auf ihr eigenes Loch.'
	},
	'host.modeTournament': { en: 'Tournament', de: 'Turnier' },
	'host.modeTournamentDescription': {
		en: 'Everyone plays the same course, one after another.',
		de: 'Alle spielen nacheinander denselben Kurs.'
	},
	'host.constructionAuto': { en: 'Random Layout', de: 'Zufälliges Layout' },
	'host.constructionCustom': { en: 'Draw Layout', de: 'Layout Zeichnen' },
	'host.constructionKeep': { en: 'Keep Layout', de: 'Layout Behalten' },
	'host.constructionReshuffle': { en: 'Shuffle Again', de: 'Neu Mischen' },
	'host.constructionDrawAgain': { en: 'Draw Again', de: 'Neu Zeichnen' },
	'host.constructionWaiting': {
		en: 'Draw a line on every phone in the direction the next phone is placed.',
		de: 'Zeichne auf jedem Handy eine Linie in die Richtung, in der das nächste Handy liegt.'
	},
	'host.constructionInProgress': { en: 'Phones are drawing...', de: 'Handys zeichnen...' },
	'host.constructionComplete': { en: 'Layout complete', de: 'Layout fertig' },
	'host.placeObjects': { en: 'Place Objects', de: 'Objekte Platzieren' },
	'host.finishPlacement': { en: 'Finish Course', de: 'Kurs Abschließen' },
	'host.loadingBoard': { en: 'Loading course...', de: 'Kurs wird geladen...' },
	'host.waitingForHost': { en: 'Waiting for the host...', de: 'Warte auf den Host...' },
	'host.readyToPlay': { en: 'Ready to play!', de: 'Bereit zum Spielen!' },
	'host.tournamentRound': { en: 'Round {current} of {total}', de: 'Runde {current} von {total}' },
	'host.tournamentBuilder': { en: "It's {name}'s turn to build", de: '{name} ist mit Bauen dran' },
	'host.tournamentExplanation': {
		en: "Each player plays the course once. Kicks are added up; players who don't finish get 2 penalty points.",
		de: 'Jede Person spielt den Kurs einmal. Schläge werden addiert; wer nicht fertig wird, bekommt 2 Strafpunkte.'
	},
	'host.duellExplanation': {
		en: 'Take turns kicking your ball. The first ball in its hole wins!',
		de: 'Schlagt abwechselnd euren Ball. Wer zuerst im eigenen Loch ist, gewinnt!'
	},
	'host.results': { en: 'Results', de: 'Ergebnisse' },
	'host.winner': { en: '{name} wins!', de: '{name} gewinnt!' },
	'host.tie': { en: "It's a tie!", de: 'Unentschieden!' },
	'host.place': { en: 'Place {place}', de: 'Platz {place}' },
	'host.roundScores': { en: 'Round scores', de: 'Rundenergebnisse' },
	'host.total': { en: 'Total', de: 'Gesamt' },
	'host.awaitingStart': {
		en: 'The host is preparing the course.',
		de: 'Der Host bereitet den Kurs vor.'
	},
	'host.approveName': { en: 'Use Name', de: 'Namen Verwenden' },
	'host.namePlaceholder': { en: 'Your name', de: 'Dein Name' },
	'host.playerNameTaken': {
		en: 'This name is already in use. Please choose another one.',
		de: 'Dieser Name ist schon vergeben. Bitte wähle einen anderen.'
	},
	'host.startWhenReady': {
		en: 'Ask the host to start!',
		de: 'Sag dem Host, dass es losgehen kann!'
	},
	'host.tryAgain': { en: 'Try Again', de: 'Nochmal Probieren' },

	'client.creditCardSize': {
		en: 'Credit card size',
		de: 'Kreditkarten-Größe'
	},
	'client.keepAlive': {
		en: 'While the game is running, please try to keep this device alive.',
		de: 'Bitte versuche dieses Gerät während des Spiels am Leben zu halten.'
	},
	'client.deviceNumber': { en: 'This is Device #{num}', de: 'Dieses Gerät hat Nummer #{num}' },
	'client.fullscreenOptions': { en: 'Fullscreen Options', de: 'Vollbildschirm Optionen' },
	'client.requestFullscreen': {
		en: 'Request fullscreen when clicking on the Multigolf course',
		de: 'Vollbildmodus beim Klicken aktivieren'
	},
	'client.fullscreenExplanation': {
		en: 'When the game starts, click on the board to enable fullscreen mode. This will not work on most iPhones and may break the game on some iPads. If you experience problems, uncheck the box above.',
		de: 'Wenn das Spiel startet, solltest du auf jedem Handy einmal klicken, um den Vollbildschirm zu aktivieren. Bei Apple-Geräten funktioniert das oft nicht, bei iPads macht es das Spiel oft kaputt. Deaktiviere die Option bitte, wenn du ein iPad verwendest.'
	},
	'client.creditCardDescription': {
		en: 'Please resize the card to be the same size as a credit card, ID card or gift card in real life, so that the game knows how large this device is.',
		de: 'Passe die Größe solange an, bis die Größe der Multigolf-Karte der Größe einer echten Kredit-, Geschenk- oder Ausweis-Karte entspricht, damit das Spiel weiß, wie groß dieser Display ist.'
	},
	'client.confirmSize': { en: 'Confirm', de: 'Bestätigen' },
	'client.connectionLost': { en: 'Connection lost', de: 'Verbindung verloren' },
	'client.reconnecting': { en: 'Reconnecting...', de: 'Verbinde erneut...' },
	'client.joining': { en: 'Joining game...', de: 'Spiel wird betreten...' },
	'client.enterName': { en: 'What should we call you?', de: 'Wie sollen wir dich nennen?' },
	'client.enterNameDescription': {
		en: 'Your name is shown on the host screen and scoreboard.',
		de: 'Dein Name erscheint auf dem Host-Bildschirm und der Rangliste.'
	},
	'client.nameTooShort': { en: 'Please enter a name.', de: 'Bitte gib einen Namen ein.' },
	'client.tapToStart': { en: 'Tap anywhere to start', de: 'Tippe irgendwo, um zu starten' },
	'client.enableMotion': { en: 'Enable motion controls', de: 'Bewegungssteuerung Aktivieren' },
	'client.motionPermission': {
		en: 'Tilt your phone to control gravity.',
		de: 'Neige dein Handy, um die Gravitation zu steuern.'
	},
	'client.fullscreen': { en: 'Fullscreen', de: 'Vollbild' },
	'client.exitFullscreen': { en: 'Exit fullscreen', de: 'Vollbild Beenden' },
	'client.gestureControls': { en: 'Gesture Controls', de: 'Gestensteuerung' },
	'client.activateCamera': { en: 'Activate Gesture Controls', de: 'Gestensteuerung Aktivieren' },
	'client.deactivateCamera': { en: 'Stop Gesture Controls', de: 'Gestensteuerung Beenden' },
	'client.cameraPermission': {
		en: 'The camera is used locally to track your hand. No images leave your device.',
		de: 'Die Kamera wird lokal zur Handverfolgung genutzt. Bilder verlassen dein Gerät nicht.'
	},
	'client.handNotDetected': {
		en: 'Show your hand to the camera',
		de: 'Zeige deine Hand der Kamera'
	},
	'client.waitingForTurn': { en: 'Waiting for your turn...', de: 'Warte auf deinen Zug...' },
	'client.yourTurn': { en: 'Your turn!', de: 'Du bist dran!' },
	'client.dragToKick': { en: 'Drag from the ball to kick', de: 'Ziehe vom Ball weg zum Schlagen' },
	'client.kicked': { en: 'Kicked!', de: 'Geschlagen!' },
	'client.inHole': { en: 'In the hole!', de: 'Im Loch!' },
	'client.maxKicks': { en: 'No kicks left', de: 'Keine Schläge übrig' },
	'client.connectionCode': { en: 'Game ID', de: 'Spiel-ID' },
	'client.invalidCode': { en: 'Invalid game ID', de: 'Ungültige Spiel-ID' },
	'client.connectionFailed': {
		en: 'Could not connect. Is the host online?',
		de: 'Verbindung fehlgeschlagen. Ist der Host online?'
	},
	'client.playersWaiting': { en: '{num} players connected', de: '{num} Spieler verbunden' },
	'client.you': { en: 'You', de: 'Du' },

	'level.tryAgain': { en: 'Try Again', de: 'Nochmal Versuchen' },
	'level.nextLevel': { en: 'Next Level', de: 'Nächstes Level' },
	'level.backToPacks': { en: 'Back to Level Select', de: 'Zurück zur Levelauswahl' },
	'level.challenge': { en: 'Challenge', de: 'Herausforderung' },
	'level.startChallenge': { en: 'Start Challenge', de: 'Challenge Starten' },
	'level.youLost': { en: 'You Lost!', de: 'Verloren!' },
	'level.youWon': { en: 'You Won!', de: 'Gewonnen!' },
	'level.youWonLong': {
		en: 'Hoooorayyy! You won the challenge! You even have {kicks} kicks left!',
		de: 'Huuurraaaa! Du hast die Challenge bezwungen! Du hast sogar {kicks} Schläge übrig!'
	},
	'level.wantToTryAgain': {
		en: 'You lost the challenge. Do you want to try again?',
		de: 'Du hast die Challenge verloren. Willst du es nochmal probieren?'
	},
	'level.highscore': {
		en: 'Your best: {score} kicks left.',
		de: 'Dein Bestwert: {score} Schläge übrig.'
	},
	'level.packHighscore': {
		en: 'At your best attempt at {name}, you had {score} kicks left.',
		de: 'Beim besten Versuch bei {name} hattest du {score} Schläge übrig.'
	},
	'level.packLocked': { en: 'Locked', de: 'Gesperrt' },
	'level.packCompleted': { en: 'Completed', de: 'Abgeschlossen' },
	'level.progress': { en: '{done} / {total} levels', de: '{done} / {total} Level' },
	'level.strokes': { en: '{count} kicks', de: '{count} Schläge' },
	'level.par': { en: 'Par {par}', de: 'Par {par}' },
	'level.level': { en: 'Level', de: 'Level' },
	'level.resetProgress': { en: 'Reset Progress', de: 'Fortschritt Zurücksetzen' },
	'level.resetProgressConfirm': {
		en: 'Reset all unlocked levels and high scores?',
		de: 'Alle freigeschalteten Level und Bestwerte zurücksetzen?'
	},
	'level.packConfigError': {
		en: 'This level pack could not be loaded.',
		de: 'Dieses Level-Paket konnte nicht geladen werden.'
	},
	'level.levelNotFound': { en: 'Level not found.', de: 'Level nicht gefunden.' },
	'level.monogolf': { en: 'Monogolf', de: 'Monogolf' },
	'level.returnToMultigolf': { en: 'Back to Multigolf', de: 'Zurück zu Multigolf' },

	'maker.title': { en: 'Level Maker', de: 'Level-Editor' },
	'maker.newLevel': { en: 'New Level', de: 'Neues Level' },
	'maker.import': { en: 'Import .muglf', de: '.muglf Importieren' },
	'maker.export': { en: 'Export .muglf', de: '.muglf Exportieren' },
	'maker.load': { en: 'Load Level', de: 'Level Laden' },
	'maker.savedLevels': { en: 'Saved Levels', de: 'Gespeicherte Level' },
	'maker.noSavedLevels': {
		en: 'No levels saved in this browser yet.',
		de: 'Noch keine Level in diesem Browser gespeichert.'
	},
	'maker.save': { en: 'Save', de: 'Speichern' },
	'maker.delete': { en: 'Delete', de: 'Löschen' },
	'maker.deleteConfirm': { en: 'Delete this level?', de: 'Dieses Level löschen?' },
	'maker.objectList': { en: 'Object List', de: 'Objektliste' },
	'maker.addObject': { en: 'Add Object', de: 'Objekt Hinzufügen' },
	'maker.objectType': { en: 'Object Type', de: 'Objekttyp' },
	'maker.importError': {
		en: 'This file is not a valid .muglf level.',
		de: 'Diese Datei ist kein gültiges .muglf-Level.'
	},
	'maker.exported': { en: 'Level exported.', de: 'Level exportiert.' },
	'maker.imported': { en: 'Level imported.', de: 'Level importiert.' },
	'maker.saved': { en: 'Level saved.', de: 'Level gespeichert.' },
	'maker.selectObject': {
		en: 'Select an object or add a new one.',
		de: 'Wähle ein Objekt oder füge ein neues hinzu.'
	},
	'maker.position': { en: 'Position', de: 'Position' },
	'maker.size': { en: 'Size', de: 'Größe' },
	'maker.angle': { en: 'Angle', de: 'Winkel' },
	'maker.width': { en: 'Width', de: 'Breite' },
	'maker.height': { en: 'Height', de: 'Höhe' },
	'maker.cancel': { en: 'Select', de: 'Auswählen' },
	'maker.drawHint': {
		en: 'Select a tool below and drag on the course. Select objects to edit them.',
		de: 'Wähle unten ein Werkzeug und ziehe auf dem Kurs. Wähle Objekte, um sie zu bearbeiten.'
	},
	'maker.savedLocally': { en: 'Saved in this browser', de: 'In diesem Browser gespeichert' },
	'maker.importDescription': {
		en: 'Choose a level from your device.',
		de: 'Wähle ein Level von deinem Gerät.'
	},
	'maker.test': { en: 'Test', de: 'Testen' },
	'maker.reset': { en: 'Reset', de: 'Zurücksetzen' },
	'maker.resetConfirm': {
		en: 'Are you sure you want to reset the level?',
		de: 'Möchtest du das Level wirklich zurücksetzen?'
	},
	'maker.fileName': { en: 'File name', de: 'Dateiname' },
	'maker.startExists': {
		en: 'There can only be one start object.',
		de: 'Es kann nur ein Start-Objekt geben.'
	},
	'maker.front': { en: 'Bring to Front', de: 'Nach Vorne' },
	'maker.back': { en: 'Send to Back', de: 'Nach Hinten' },
	'maker.duplicate': { en: 'Duplicate', de: 'Duplizieren' },
	'maker.deleteObject': { en: 'Delete Object', de: 'Objekt Löschen' },
	'maker.controls': { en: 'Controls', de: 'Steuerung' },
	'maker.objectProperties': { en: 'Object Properties', de: 'Objekteigenschaften' },
	'maker.nameRequired': { en: 'Please enter a file name.', de: 'Bitte gib einen Dateinamen ein.' },

	'contact.name': { en: 'Name', de: 'Name' },
	'contact.email': { en: 'Email', de: 'E-Mail' },
	'contact.message': { en: 'Message', de: 'Nachricht' },
	'contact.send': { en: 'Send Message', de: 'Nachricht Senden' },
	'contact.sending': { en: 'Sending...', de: 'Wird gesendet...' },
	'contact.sent': {
		en: 'Thanks! Your message has been sent.',
		de: 'Danke! Deine Nachricht wurde gesendet.'
	},
	'contact.failed': {
		en: 'Your message could not be sent. Please try again later.',
		de: 'Deine Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut.'
	},
	'contact.required': { en: 'Please fill out all fields.', de: 'Bitte fülle alle Felder aus.' },

	'annoy.title': { en: 'Daily Annoyance', de: 'Tägliche Belästigung' },
	'annoy.startNoises': { en: 'Start Random Noises', de: 'Zufällige Geräusche Starten' },
	'annoy.startNotes': { en: 'Start Random Notes', de: 'Zufällige Noten Starten' },
	'annoy.stopAll': { en: 'Stop All', de: 'Alles Stoppen' },
	'annoy.description': {
		en: 'A little experiment in celebration of annoying popups.',
		de: 'Ein kleines Experiment zu Ehren nerviger Popups.'
	},
	'dev.title': { en: 'Developer Tools', de: 'Entwickler-Werkzeuge' },
	'dev.clearCache': { en: 'Clear Cache', de: 'Cache Leeren' },
	'dev.noCache': { en: 'No active cache found.', de: 'Kein aktiver Cache gefunden.' },
	'dev.deletedCache': { en: 'Deleted "{cache}" cache.', de: 'Cache "{cache}" gelöscht.' },
	'dev.description': {
		en: 'Test pages and diagnostics for Multigolf.',
		de: 'Testseiten und Diagnosewerkzeuge für Multigolf.'
	},
	'promo.title': { en: 'Esko Promotion', de: 'Esko-Promo' }
} as const satisfies Record<string, Translation>;

export type MessageKey = keyof typeof messages;

export function getMessage(
	locale: Locale,
	key: MessageKey,
	params?: Record<string, string | number>
): string {
	let text: string = messages[key][locale] ?? messages[key].en;
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			text = text.replaceAll(`{${name}}`, String(value));
		}
	}
	return text;
}
