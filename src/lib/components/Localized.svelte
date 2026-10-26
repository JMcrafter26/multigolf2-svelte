<script lang="ts">
	/**
	 * Renders both translations. The pre-hydration script in app.html sets
	 * `html[lang]`, and CSS hides the inactive language. This keeps prerendered
	 * English and German content identical and avoids hydration mismatches.
	 */
	let { en, de, block = false }: { en: string; de: string; block?: boolean } = $props();
</script>

<span lang="en" class:localized-block={block}>{en}</span><span
	lang="de"
	class:localized-block={block}>{de}</span
>

<style>
	.localized-block {
		display: block;
	}
</style>
