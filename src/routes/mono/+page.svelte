<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/mono.css';
	import Localized from '$lib/components/Localized.svelte';
	import { i18n, t } from '$lib/i18n/state.svelte';
	import { fetchLevelPacks, getLevelText, type LevelPackSummary } from '$lib/mono/level-data';
	import {
		clearChallengeProgress,
		getPackHighscore,
		hasUnlockedLevel,
		resetUnlockedLevels
	} from '$lib/mono/level-storage';

	let packs = $state<LevelPackSummary[]>([]);
	let loading = $state(true);
	let error = $state('');
	let highscores = $state<Record<string, number | null>>({});
	let unlockedRevision = $state(0);

	const difficultyOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

	async function loadPacks(): Promise<void> {
		loading = true;
		error = '';
		try {
			const result = await fetchLevelPacks();
			packs = result.sort(
				(a, b) => (difficultyOrder[a.difficulty] ?? 99) - (difficultyOrder[b.difficulty] ?? 99)
			);
			refreshStoredState();
		} catch (caught) {
			error = String(caught);
		} finally {
			loading = false;
		}
	}

	function refreshStoredState(): void {
		const next: Record<string, number | null> = {};
		for (const pack of packs) next[pack.id] = getPackHighscore(pack.id);
		highscores = next;
		unlockedRevision++;
	}

	function isUnlocked(packId: string, level: number): boolean {
		void unlockedRevision;
		return hasUnlockedLevel(packId, level);
	}

	function challengeHref(packId: string): string {
		return `/level/?pack=${encodeURIComponent(packId)}&challenge=true&id=1`;
	}

	function levelHref(packId: string, level: number): string {
		return `/level/?pack=${encodeURIComponent(packId)}&id=${level}`;
	}

	function resetProgress(): void {
		if (!confirm(t('level.resetProgressConfirm'))) return;
		resetUnlockedLevels();
		for (const pack of packs) {
			try {
				localStorage.removeItem(`mono-highscore-${pack.id}`);
				clearChallengeProgress(pack.id);
			} catch {
				/* ignore */
			}
		}
		refreshStoredState();
	}

	onMount(() => {
		void loadPacks();
	});
</script>

<svelte:head>
	<title>Monogolf Home</title>
	<meta
		name="description"
		content="Monogolf is the single-player version of multi.golf. Play levels and unlock new items!"
	/>
</svelte:head>

<main>
	<h1>Monogolf</h1>
	<p>
		<Localized
			en="Friends make Multigolf great. But sometimes, friends just aren't there for you. But Monogolf is! There will be more and more level packs added over time."
			de="Freunde machen Multigolf toll. Aber was, wenn die Freunde nicht für dich da sind? Dann ist Monogolf für dich da! Ich bin dabei, mehr und mehr Level-Packs hinzuzufügen."
		/>
	</p>

	{#if loading}
		<p>{t('common.loading')}</p>
	{:else if error}
		<div class="level-pack error-panel">
			<h2>{t('level.packConfigError')}</h2>
			<p>{error}</p>
			<button type="button" onclick={() => loadPacks()}>{t('common.retry')}</button>
		</div>
	{:else}
		<div id="level-packs">
			{#each packs as pack (pack.id)}
				{@const highscore = highscores[pack.id]}
				<article class="level-pack">
					<div class="header">
						<h2>
							<span lang="en">{pack.name.en}</span><span lang="de">{pack.name.de}</span>
						</h2>
						<p class="difficulty">
							<span lang="en">{pack['difficulty-name'].en}</span><span lang="de"
								>{pack['difficulty-name'].de}</span
							>
						</p>
					</div>
					<p class="description">
						<span lang="en">{pack.description.en}</span><span lang="de">{pack.description.de}</span>
					</p>
					<p class="author">{pack.author}</p>
					<div class="levels-container">
						{#each Array.from({ length: pack.num_levels }, (_, index) => index + 1) as level (level)}
							{#if isUnlocked(pack.id, level)}
								<a
									class="level completed"
									data-difficulty={pack.difficulty}
									href={levelHref(pack.id, level)}
									aria-label={`${t('level.level')} ${level}`}
								>
									{level}
								</a>
							{:else}
								<span
									class="level"
									data-difficulty={pack.difficulty}
									aria-disabled="true"
									title={t('level.packLocked')}
								>
									{level}
								</span>
							{/if}
						{/each}
					</div>
					<a class="linkbutton" href={challengeHref(pack.id)}>{t('level.startChallenge')}</a>
					{#if highscore !== null}
						<p class="highscore-text">
							{t('level.packHighscore', {
								name: getLevelText(pack.name, i18n.locale),
								score: highscore
							})}
						</p>
					{/if}
				</article>
			{/each}
		</div>
	{/if}

	<h2>
		<Localized en="What's a Challenge?" de="Was ist eine Challenge?" />
	</h2>
	<p>
		<Localized
			en="You get 10 shots and one more for every level you complete. How many levels can you complete before your shots run out?"
			de="Du bekommst 10 Schläge und einen zusätzlichen für jedes geschaffte Level. Wie viele kannst du schaffen, bevor du keine Schläge mehr hast?"
		/>
	</p>

	<button class="reset-progress" type="button" onclick={resetProgress}>
		{t('level.resetProgress')}
	</button>
</main>

<style>
	.error-panel {
		margin-top: 1rem;
	}

	.reset-progress {
		margin-top: 1rem;
		background: transparent;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
		padding: 0.5rem 0.8rem;
		color: inherit;
		font: inherit;
		cursor: pointer;
		opacity: 0.7;
	}

	.reset-progress:hover {
		opacity: 1;
	}
</style>
