(function () {
	'use strict';

	var STORE_KEY = 'swiftAidA11y_v1';

	// Each option: id (matches body class suffix), label, icon, mutually-
	// exclusive group (so e.g. "high contrast" turns off "invert"), behavior
	// hooks for non-CSS features.
	var OPTIONS = [
		{ id: 'bigger-text',     label: 'Bigger text',      icon: 'A+'  },
		{ id: 'biggest-text',    label: 'Largest text',     icon: 'A++', group: 'text-size' },
		{ id: 'dyslexic',        label: 'Dyslexia-friendly font', icon: 'D' },
		{ id: 'high-contrast',   label: 'High contrast',    icon: '◐',  group: 'contrast' },
		{ id: 'invert',          label: 'Invert colours',   icon: '◑',  group: 'contrast' },
		{ id: 'highlight-links', label: 'Highlight links',  icon: '🔗' },
		{ id: 'readable',        label: 'Readable layout',  icon: '☰'  },
		{ id: 'pause-anim',      label: 'Pause animations', icon: '⏸'  },
		{ id: 'big-cursor',      label: 'Bigger cursor',    icon: '➤'  },
		{ id: 'guide',           label: 'Reading guide',    icon: '═'  },
		{ id: 'tts',             label: 'Read on click',    icon: '🔊', behavior: 'tts' }
	];

	// Group "text-size" — bigger and biggest are mutually exclusive
	var GROUPS = {
		'text-size': ['bigger-text', 'biggest-text'],
		'contrast':  ['high-contrast', 'invert']
	};

	function load() {
		try {
			return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
		} catch (e) { return {}; }
	}

	function save(state) {
		try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
	}

	function applyState(state) {
		var body = document.body;
		// Strip every sa-a11y-* class first
		var cls = (body.className || '').split(/\s+/).filter(function (c) {
			return c && c.indexOf('sa-a11y-') !== 0;
		});
		body.className = cls.join(' ');
		Object.keys(state).forEach(function (id) {
			if (state[id]) body.classList.add('sa-a11y-' + id);
		});
		updateButtonStates(state);
		updateTtsHandlers(state);
	}

	function updateButtonStates(state) {
		var buttons = document.querySelectorAll('.sa-a11y-panel .sa-a11y-opt');
		for (var i = 0; i < buttons.length; i++) {
			var id = buttons[i].dataset.id;
			if (state[id]) buttons[i].classList.add('sa-active');
			else buttons[i].classList.remove('sa-active');
		}
	}

	function toggle(id, state) {
		state[id] = !state[id];
		// If turning on, clear other members of the same group
		if (state[id]) {
			Object.keys(GROUPS).forEach(function (g) {
				if (GROUPS[g].indexOf(id) !== -1) {
					GROUPS[g].forEach(function (other) {
						if (other !== id) state[other] = false;
					});
				}
			});
		}
		save(state);
		applyState(state);
	}

	function reset(state) {
		Object.keys(state).forEach(function (k) { state[k] = false; });
		save(state);
		applyState(state);
	}

	// ---------- Reading guide (follows mouse) ----------
	function setupReadingGuide() {
		var bar = document.createElement('div');
		bar.className = 'sa-a11y-reading-guide';
		document.body.appendChild(bar);
		document.addEventListener('mousemove', function (e) {
			if (!document.body.classList.contains('sa-a11y-guide')) return;
			bar.style.top = (e.clientY - 18) + 'px';
		});
	}

	// ---------- Read-on-click (text-to-speech) ----------
	var ttsBound = false;
	function ttsHandler(e) {
		if (!document.body.classList.contains('sa-a11y-tts')) return;
		var target = e.target;
		if (!target || target.closest('.sa-a11y-toggle, .sa-a11y-panel')) return;
		var text = target.innerText || target.textContent || '';
		text = text.trim();
		if (!text || text.length > 2000) return;
		if (!('speechSynthesis' in window)) return;
		window.speechSynthesis.cancel();
		var u = new SpeechSynthesisUtterance(text);
		u.lang = document.documentElement.lang || 'en-AU';
		u.rate = 1; u.pitch = 1; u.volume = 1;
		document.querySelectorAll('.sa-a11y-tts-target').forEach(function (el) {
			el.classList.remove('sa-a11y-tts-target');
		});
		target.classList.add('sa-a11y-tts-target');
		u.onend = function () { target.classList.remove('sa-a11y-tts-target'); };
		window.speechSynthesis.speak(u);
		e.preventDefault();
		e.stopPropagation();
	}

	function updateTtsHandlers(state) {
		if (state.tts && !ttsBound) {
			document.addEventListener('click', ttsHandler, true);
			ttsBound = true;
		}
		if (!state.tts && ('speechSynthesis' in window)) {
			window.speechSynthesis.cancel();
			document.querySelectorAll('.sa-a11y-tts-target').forEach(function (el) {
				el.classList.remove('sa-a11y-tts-target');
			});
		}
	}

	// ---------- Build UI ----------
	function buildUI() {
		// Toggle button
		var btn = document.createElement('button');
		btn.className = 'sa-a11y-toggle';
		btn.type = 'button';
		btn.setAttribute('aria-label', 'Open accessibility options');
		btn.setAttribute('aria-expanded', 'false');
		btn.innerHTML =
			'<svg viewBox="0 0 24 24" aria-hidden="true">' +
			'<circle cx="12" cy="3.5" r="1.6"/>' +
			'<path d="M5.5 7.5 L18.5 7.5 L18.5 9 L13.5 9 L13.5 11 L18 11 L17 14 L13.5 14 L13.5 16.5 C16 17 17.5 19 17.5 21 L15.5 21 C15.5 19.5 14 18.5 12 18.5 C10 18.5 8.5 19.5 8.5 21 L6.5 21 C6.5 19 8 17 10.5 16.5 L10.5 9 L5.5 9 Z"/>' +
			'</svg>';
		document.body.appendChild(btn);

		// Panel
		var panel = document.createElement('div');
		panel.className = 'sa-a11y-panel';
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-label', 'Accessibility options');

		var html = '<button type="button" class="sa-a11y-close" aria-label="Close">×</button>';
		html += '<h3>Accessibility</h3>';
		html += '<p class="sa-a11y-sub">Pick what makes the site easier for you. Settings are saved across pages.</p>';
		OPTIONS.forEach(function (o) {
			html += '<button type="button" class="sa-a11y-opt" data-id="' + o.id + '">';
			html += '<span class="sa-a11y-icon" aria-hidden="true">' + o.icon + '</span>';
			html += '<span>' + o.label + '</span>';
			html += '</button>';
		});
		html += '<button type="button" class="sa-a11y-reset">Reset all</button>';
		panel.innerHTML = html;
		document.body.appendChild(panel);

		// Wire interactions
		var state = load();

		btn.addEventListener('click', function () {
			var open = panel.classList.toggle('sa-open');
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		});

		panel.querySelector('.sa-a11y-close').addEventListener('click', function () {
			panel.classList.remove('sa-open');
			btn.setAttribute('aria-expanded', 'false');
		});

		panel.querySelectorAll('.sa-a11y-opt').forEach(function (b) {
			b.addEventListener('click', function () { toggle(b.dataset.id, state); });
		});

		panel.querySelector('.sa-a11y-reset').addEventListener('click', function () {
			reset(state);
		});

		// Click outside to close
		document.addEventListener('click', function (e) {
			if (!panel.classList.contains('sa-open')) return;
			if (panel.contains(e.target) || btn.contains(e.target)) return;
			panel.classList.remove('sa-open');
			btn.setAttribute('aria-expanded', 'false');
		});

		// Keyboard: Escape closes
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && panel.classList.contains('sa-open')) {
				panel.classList.remove('sa-open');
				btn.setAttribute('aria-expanded', 'false');
				btn.focus();
			}
		});

		setupReadingGuide();
		applyState(state);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', buildUI);
	} else {
		buildUI();
	}
})();
