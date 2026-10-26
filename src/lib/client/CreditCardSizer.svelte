<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n/state.svelte';

	let { height, onchange }: { height: number; onchange: (height: number) => void } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();
	let image = $state<HTMLImageElement | null>(null);

	const minPx = 150;
	const maxPx = 800;

	function valueToRangeValue(value: number): number {
		return ((value - minPx) / (maxPx - minPx)) * 1000;
	}

	function rangeValueToValue(value: number): number {
		return (value / 1000) * (maxPx - minPx) + minPx;
	}

	function draw(): void {
		if (!canvas || !image) return;
		const context = canvas.getContext('2d');
		if (!context) return;
		canvas.width = canvas.clientWidth || 300;
		canvas.height = height;
		canvas.style.height = `${height}px`;
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(image, 0, 0, (height * 2.125) / 3.375, height);
	}

	$effect(() => {
		void height;
		void image;
		draw();
	});

	onMount(() => {
		const loaded = new Image();
		loaded.onload = () => {
			image = loaded;
			draw();
		};
		loaded.onerror = () => {};
		loaded.src = '/assets/objects/credit-card.svg';

		const resize = () => draw();
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	});
</script>

<div class="credit-card-container">
	<div class="slider-container">
		<input
			type="range"
			min="1"
			max="1000"
			value={valueToRangeValue(height)}
			aria-label={t('client.creditCardSize')}
			oninput={(event) => onchange(rangeValueToValue(Number(event.currentTarget.value)))}
		/>
	</div>
	<canvas bind:this={canvas} aria-label={t('client.creditCardSize')}></canvas>
</div>
