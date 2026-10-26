<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/level-maker.css';
	import Localized from '$lib/components/Localized.svelte';
	import { t } from '$lib/i18n/state.svelte';
	import { LevelMakerController } from '$lib/mono/level-maker-controller.svelte';

	let controller = $state<LevelMakerController | null>(null);
	let canvas = $state<HTMLCanvasElement>();

	$effect(() => {
		if (controller && canvas) controller.attachCanvas(canvas);
	});

	onMount(() => {
		const instance = new LevelMakerController();
		controller = instance;
		void instance.init();
		return () => instance.destroy();
	});

	async function onFileChange(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		await controller?.importFile(file);
		input.value = '';
	}
</script>

<svelte:head>
	<title>Level Maker | Monogolf</title>
	<meta name="description" content="Create and modify Monogolf levels" />
</svelte:head>

<main>
	<h1>{t('maker.title')}</h1>
	<p>
		<Localized
			en="Drag objects onto the grid, edit their exact values on the right, and test your level before exporting it as a .muglf file."
			de="Ziehe Objekte auf das Raster, bearbeite ihre genauen Werte rechts und teste dein Level, bevor du es als .muglf-Datei exportierst."
		/>
	</p>

	{#if controller}
		{@const c = controller}
		<div class="level-maker-container">
			<section class="canvas-panel" aria-label={t('maker.title')}>
				<div class="level-canvas-wrap">
					<canvas id="level-canvas" bind:this={canvas} aria-label="Level editor course"></canvas>
					{#if !c.ready}
						<div class="canvas-loading">{t('common.loading')}</div>
					{/if}
				</div>
				<p class="keyboard-hint">
					<Localized
						en="Keyboard: arrows move, Shift + arrows resize, Ctrl + arrows rotate, D duplicates, F/B change depth, Delete removes, Tab selects the next object."
						de="Tastatur: Pfeile bewegen, Shift + Pfeile skalieren, Strg + Pfeile drehen, D dupliziert, F/B ändern die Ebene, Entf löscht, Tab wählt das nächste Objekt."
					/>
				</p>
			</section>

			<aside class="config-container" aria-label={t('maker.controls')}>
				<fieldset>
					<legend>{t('maker.controls')}</legend>
					<div class="control-grid">
						<button type="button" onclick={() => c.testLevel()}>{t('maker.test')}</button>
						<button type="button" onclick={() => c.resetLevel()}>{t('maker.reset')}</button>
						<label class="file-button">
							{t('maker.import')}
							<input
								type="file"
								accept=".muglf,application/json"
								aria-label={t('maker.import')}
								onchange={onFileChange}
							/>
						</label>
						<button type="button" onclick={() => c.exportLevel()}>{t('maker.export')}</button>
					</div>
					<label class="file-name-label">
						<span>{t('maker.fileName')}</span>
						<input type="text" bind:value={c.fileName} />
					</label>
					<p class="saved-hint">{t('maker.savedLocally')}</p>
					{#if c.status}
						<p class="status" role="status">{c.status}</p>
					{/if}
					{#if c.error}
						<p class="error" role="alert">{c.error}</p>
					{/if}
				</fieldset>

				<fieldset>
					<legend>{t('maker.objectList')}</legend>
					<div class="add-object-row">
						<label>
							<span>{t('maker.objectType')}</span>
							<select bind:value={c.objectType}>
								{#each c.objectTypes as type (type)}
									<option value={type}>{c.nameForType(type)}</option>
								{/each}
							</select>
						</label>
						<button type="button" onclick={() => c.addObject()}>{t('maker.addObject')}</button>
					</div>
					<p class="hint">{t('maker.drawHint')}</p>

					<div class="object-list" role="list">
						{#each c.objectsTopFirst as object (object.uid)}
							<button
								type="button"
								class="object-row"
								class:selected={object.uid === c.selectedUid}
								aria-pressed={object.uid === c.selectedUid}
								onclick={() => c.selectObject(object.uid)}
							>
								<span>{c.nameForType(object.type)}</span>
								<span class="object-coordinates"
									>{Math.round(object.pos.x)}, {Math.round(object.pos.y)}</span
								>
							</button>
						{/each}
					</div>
				</fieldset>

				{#if c.selectedObject}
					{@const selected = c.selectedObject}
					<fieldset>
						<legend>{t('maker.objectProperties')}: {c.nameForType(selected.type)}</legend>
						<div class="properties-grid">
							<label>
								<span>{t('maker.position')} X</span>
								<input
									type="number"
									value={Math.round(selected.pos.x)}
									oninput={(event) => c.setPosition('x', Number(event.currentTarget.value))}
								/>
							</label>
							<label>
								<span>{t('maker.position')} Y</span>
								<input
									type="number"
									value={Math.round(selected.pos.y)}
									oninput={(event) => c.setPosition('y', Number(event.currentTarget.value))}
								/>
							</label>
							<label>
								<span>{t('maker.width')}</span>
								<input
									type="number"
									value={Math.round(selected.size.x)}
									disabled={!selected.resizable}
									oninput={(event) => c.setSize('x', Number(event.currentTarget.value))}
								/>
							</label>
							<label>
								<span>{t('maker.height')}</span>
								<input
									type="number"
									value={Math.round(selected.size.y)}
									disabled={!selected.resizable}
									oninput={(event) => c.setSize('y', Number(event.currentTarget.value))}
								/>
							</label>
							<label>
								<span>{t('maker.angle')}</span>
								<input
									type="number"
									step="1"
									value={Math.round((selected.angle / Math.PI) * 1800) / 10}
									oninput={(event) => c.setAngleDegrees(Number(event.currentTarget.value))}
								/>
							</label>
						</div>
						<div class="object-actions">
							<button type="button" onclick={() => c.bringToFront()}>{t('maker.front')}</button>
							<button type="button" onclick={() => c.sendToBack()}>{t('maker.back')}</button>
							{#if selected.type !== 'Start'}
								<button type="button" onclick={() => c.duplicateSelected()}>
									{t('maker.duplicate')}
								</button>
							{/if}
							<button class="danger" type="button" onclick={() => c.deleteSelected()}>
								{t('maker.deleteObject')}
							</button>
						</div>
					</fieldset>
				{:else}
					<p class="select-hint">{t('maker.selectObject')}</p>
				{/if}
			</aside>
		</div>
	{/if}
</main>

<style>
	.canvas-panel {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}

	.canvas-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.75);
		font-weight: 600;
	}

	.keyboard-hint,
	.hint,
	.select-hint,
	.saved-hint {
		font-size: 0.85em;
		opacity: 0.75;
	}

	.control-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.control-grid > button,
	.file-button {
		padding: 0.55rem;
		font-size: 1em;
	}

	.file-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background: var(--button-background);
		color: var(--button-color);
		cursor: pointer;
		text-align: center;
	}

	.file-button:focus-within {
		outline: 2px solid var(--primary-accent-color);
		outline-offset: 2px;
	}

	.file-button input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	.file-name-label {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.75rem;
	}

	.file-name-label input {
		width: 100%;
	}

	.status,
	.error {
		margin: 0.5rem 0 0;
		padding: 0.5rem;
		border-radius: 0.4rem;
	}

	.status {
		background: rgba(77, 180, 99, 0.15);
	}

	.error {
		background: rgba(200, 50, 50, 0.15);
		color: #a00000;
	}

	.add-object-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		gap: 0.5rem;
	}

	.add-object-row label {
		display: grid;
		gap: 0.25rem;
	}

	.add-object-row select {
		width: 100%;
	}

	.object-list {
		display: grid;
		gap: 0.3rem;
		margin-top: 0.75rem;
		max-height: 16rem;
		overflow: auto;
	}

	.object-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.5rem 0.6rem;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 0.5rem;
		background: var(--input-background);
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: left;
	}

	.object-row.selected {
		outline: 2px solid var(--primary-accent-color);
	}

	.object-coordinates {
		font-size: 0.85em;
		opacity: 0.65;
		font-variant-numeric: tabular-nums;
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.properties-grid label {
		display: grid;
		gap: 0.2rem;
	}

	.properties-grid input {
		width: 100%;
	}

	.properties-grid input:disabled {
		opacity: 0.55;
	}

	.object-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}

	.object-actions button {
		font-size: 0.95em;
		padding: 0.45rem 0.6rem;
	}

	.object-actions .danger {
		background: #b3261e;
		color: white;
	}

	@media (max-width: 480px) {
		.properties-grid {
			grid-template-columns: 1fr;
		}

		.control-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
