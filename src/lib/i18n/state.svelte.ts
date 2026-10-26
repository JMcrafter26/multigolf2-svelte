import { browser } from '$app/env';
import { getMessage, type Locale, type MessageKey } from './messages';

let currentLocale = $state<Locale>('en');
let currentTheme = $state<'light' | 'dark'>('light');

export const i18n = {
	get locale(): Locale {
		return currentLocale;
	},
	get theme(): 'light' | 'dark' {
		return currentTheme;
	},
	get isDark(): boolean {
		return currentTheme === 'dark';
	}
};

export function t(key: MessageKey, params?: Record<string, string | number>): string {
	return getMessage(currentLocale, key, params);
}

export function setLocale(locale: Locale, persist = true): void {
	currentLocale = locale;
	if (!browser) return;
	document.documentElement.lang = locale;
	if (persist) {
		try {
			localStorage.setItem('multigolf-lang', locale);
		} catch {
			/* storage may be unavailable in private mode */
		}
	}
}

export function toggleLanguage(): void {
	setLocale(currentLocale === 'en' ? 'de' : 'en');
}

export function setTheme(theme: 'light' | 'dark', persist = true): void {
	currentTheme = theme;
	if (!browser) return;
	document.body.dataset.style = theme;
	document.documentElement.style.colorScheme = theme;
	if (persist) {
		try {
			localStorage.setItem('multigolf-theme', theme);
		} catch {
			/* ignore */
		}
	}
}

export function toggleTheme(): void {
	setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

/** Called once on the client after hydration. */
export function initPreferences(): void {
	if (!browser) return;
	const language = document.documentElement.lang === 'de' ? 'de' : 'en';
	currentLocale = language;
	const theme = document.body.dataset.style === 'dark' ? 'dark' : 'light';
	currentTheme = theme;
}
