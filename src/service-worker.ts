/// <reference lib="webworker" />

import { version } from '$app/env';
import { immutable, prerendered } from '$app/manifest';

declare const self: ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'multigolf';
const CACHE_NAME = `${CACHE_PREFIX}-${version}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${version}`;

const CORE_ROUTES = [
	'/',
	'/host/',
	'/join/',
	'/client/',
	'/mono/',
	'/level/',
	'/level-maker/',
	'/about/',
	'/contact/',
	'/impressum/',
	'/data-privacy/',
	'/annoy/',
	'/dev/',
	'/promo/esko/',
	'/404.html'
];

const CORE_ASSETS = [
	'/manifest.json',
	'/assets/logo/favicon.ico',
	'/assets/logo/logo.svg',
	'/assets/logo/logo32.png',
	'/assets/logo/logo192.png',
	'/assets/logo/logo512.png'
];

function scopeUrl(path: string): string {
	return new URL(path.replace(/^\//, ''), self.registration.scope).pathname;
}

const PRECACHE_URLS = Array.from(
	new Set([
		...CORE_ROUTES.map(scopeUrl),
		...CORE_ASSETS.map(scopeUrl),
		...immutable.map(({ path }) => scopeUrl(path)),
		...prerendered.map(({ path }) => scopeUrl(path))
	])
);

async function precache(): Promise<void> {
	const cache = await caches.open(CACHE_NAME);
	await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
}

async function trimCaches(): Promise<void> {
	const names = await caches.keys();
	await Promise.all(
		names
			.filter(
				(name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME && name !== RUNTIME_CACHE
			)
			.map((name) => caches.delete(name))
	);
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		precache().then(() => {
			self.skipWaiting();
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		trimCaches().then(() => {
			self.clients.claim();
		})
	);
});

async function networkFirst(request: Request): Promise<Response> {
	const url = new URL(request.url);
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached =
			(await caches.match(request)) ||
			(await caches.match(url.pathname)) ||
			(await caches.match(scopeUrl('/404.html'))) ||
			(await caches.match(scopeUrl('/')));
		if (cached) return cached;
		return new Response('Offline', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('', { status: 504, statusText: 'Offline' });
	}
}

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}

	if (
		url.pathname.startsWith('/_app/') ||
		url.pathname.startsWith('/assets/') ||
		url.pathname === '/manifest.json' ||
		url.pathname === '/service-worker.js'
	) {
		event.respondWith(cacheFirst(request));
	}
});

self.addEventListener('message', (event) => {
	if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
