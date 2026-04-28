(function () {
	'use strict';

	var STORE_KEY = 'swiftAidA11y_v2';
	var FONT_MIN = 70;
	var FONT_MAX = 200;
	var FONT_STEP = 10;

	// One-shot text-size actions (top of panel)
	var TEXT_ACTIONS = [
		{ id: 'smaller', label: 'Smaller', icon: 'A−' },
		{ id: 'normal',  label: 'Normal',  icon: 'A'  },
		{ id: 'bigger',  label: 'Bigger',  icon: 'A+' }
	];

	// Toggleable features (rest of panel)
	var TOGGLES = [
		{ id: 'dyslexic',        label: 'Dyslexia-friendly font', icon: 'D'  },
		{ id: 'high-contrast',   label: 'High contrast',          icon: '◐', group: 'contrast' },
		{ id: 'invert',          label: 'Invert colours',         icon: '◑', group: 'contrast' },
		{ id: 'highlight-links', label: 'Highlight links',        icon: '🔗' },
		{ id: 'readable',        label: 'Readable layout',        icon: '☰' },
		{ id: 'pause-anim',      label: 'Pause animations',       icon: '⏸' },
		{ id: 'big-cursor',      label: 'Bigger cursor',          icon: '➤' },
		{ id: 'guide',           label: 'Reading guide',          icon: '═' },
		{ id: 'tts',             label: 'Read on click',          icon: '🔊' }
	];

	var GROUPS = { contrast: ['high-contrast', 'invert'] };

	function load() {
		try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { fontSize: 100 }; }
		catch (e) { return { fontSize: 100 }; }
	}

	function save(state) {
		try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
	}

	function pageWrapper() {
		return document.querySelector('.sa-a11y-page');
	}

	function applyState(state) {
		var body = document.body;
		var cls = (body.className || '').split(/\s+/).filter(function (c) {
			return c && c.indexOf('sa-a11y-') !== 0;
		});
		body.className = cls.join(' ');
		TOGGLES.forEach(function (o) {
			if (state[o.id]) body.classList.add('sa-a11y-' + o.id);
		});

		// Apply zoom (which actually scales every element, unlike body
		// font-size which Divi overrides with explicit px) to the page
		// wrapper. Widget stays outside the wrapper so it never gets
		// scaled or inverted.
		var wrap = pageWrapper();
		if (wrap) {
			var fs = (state.fontSize || 100) / 100;
			wrap.style.zoom = fs;
		}

		updateButtonStates(state);
		updateTtsHandler(state);
	}

	function updateButtonStates(state) {
		var buttons = document.querySelectorAll('.sa-a11y-panel .sa-a11y-opt');
		for (var i = 0; i < buttons.length; i++) {
			var id = buttons[i].dataset.id;
			if (state[id]) buttons[i].classList.add('sa-active');
			else buttons[i].classList.remove('sa-active');
		}
	}

	function fontAction(action, state) {
		var fs = state.fontSize || 100;
		if (action === 'smaller') fs = Math.max(FONT_MIN, fs - FONT_STEP);
		else if (action === 'bigger') fs = Math.min(FONT_MAX, fs + FONT_STEP);
		else if (action === 'normal') fs = 100;
		state.fontSize = fs;
		save(state);
		applyState(state);
	}

	function toggle(id, state) {
		state[id] = !state[id];
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
		Object.keys(state).forEach(function (k) { delete state[k]; });
		state.fontSize = 100;
		save(state);
		applyState(state);
	}

	// Reading guide
	function setupReadingGuide() {
		var bar = document.createElement('div');
		bar.className = 'sa-a11y-reading-guide';
		document.body.appendChild(bar);
		document.addEventListener('mousemove', function (e) {
			if (!document.body.classList.contains('sa-a11y-guide')) return;
			bar.style.top = (e.clientY - 18) + 'px';
		});
	}

	// Read-on-click (text-to-speech)
	var ttsBound = false;
	function ttsHandler(e) {
		if (!document.body.classList.contains('sa-a11y-tts')) return;
		var target = e.target;
		if (!target || target.closest('.sa-a11y-toggle, .sa-a11y-panel')) return;
		var text = (target.innerText || target.textContent || '').trim();
		if (!text || text.length > 2000 || !('speechSynthesis' in window)) return;
		window.speechSynthesis.cancel();
		var u = new SpeechSynthesisUtterance(text);
		u.lang = document.documentElement.lang || 'en-AU';
		document.querySelectorAll('.sa-a11y-tts-target').forEach(function (el) {
			el.classList.remove('sa-a11y-tts-target');
		});
		target.classList.add('sa-a11y-tts-target');
		u.onend = function () { target.classList.remove('sa-a11y-tts-target'); };
		window.speechSynthesis.speak(u);
		e.preventDefault();
		e.stopPropagation();
	}

	function updateTtsHandler(state) {
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

	function wrapPageContent() {
		// Move every existing body child into a wrapper div so we can
		// apply zoom/filter there without affecting our toggle button.
		// Idempotent — safe to call multiple times.
		if (document.querySelector('.sa-a11y-page')) return;
		var wrap = document.createElement('div');
		wrap.className = 'sa-a11y-page';
		var first = document.body.firstChild;
		while (first) {
			wrap.appendChild(first);
			first = document.body.firstChild;
		}
		document.body.appendChild(wrap);
	}

	// Build UI
	function buildUI() {
		wrapPageContent();
		var btn = document.createElement('button');
		btn.className = 'sa-a11y-toggle';
		btn.type = 'button';
		btn.setAttribute('aria-label', 'Open accessibility options');
		btn.setAttribute('aria-expanded', 'false');
		// Wheelchair-with-rider icon (simplified, drawn paths — no
		// external dependencies, no font reliance). Person profile facing
		// right with circular wheel beneath.
		// Material Icons "accessible" path (Apache 2.0): a person seated in
		// a wheelchair, viewed in profile with one arm extended forward.
		btn.innerHTML =
			'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="32" height="32">' +
			'<circle cx="12" cy="4" r="2" fill="#ffffff"/>' +
			'<path fill="#ffffff" d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.18-.26C10.79 7.12 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>' +
			'</svg>';
		document.body.appendChild(btn);

		var panel = document.createElement('div');
		panel.className = 'sa-a11y-panel';
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-label', 'Accessibility options');

		var html = '<button type="button" class="sa-a11y-close" aria-label="Close">×</button>';
		html += '<h3>Accessibility</h3>';
		html += '<p class="sa-a11y-sub">Make the site easier to use. Settings are saved across pages.</p>';

		// Text-size row (3 actions)
		html += '<div class="sa-a11y-text-row">';
		TEXT_ACTIONS.forEach(function (a) {
			html += '<button type="button" data-action="' + a.id + '">';
			html += '<span class="sa-a11y-icon">' + a.icon + '</span>';
			html += '<span class="sa-a11y-text-label">' + a.label + '</span>';
			html += '</button>';
		});
		html += '</div>';

		// Toggles
		TOGGLES.forEach(function (o) {
			html += '<button type="button" class="sa-a11y-opt" data-id="' + o.id + '">';
			html += '<span class="sa-a11y-icon" aria-hidden="true">' + o.icon + '</span>';
			html += '<span>' + o.label + '</span>';
			html += '</button>';
		});

		html += '<button type="button" class="sa-a11y-reset">Reset all</button>';
		panel.innerHTML = html;
		document.body.appendChild(panel);

		var state = load();
		if (typeof state.fontSize !== 'number') state.fontSize = 100;

		btn.addEventListener('click', function () {
			var open = panel.classList.toggle('sa-open');
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		});

		panel.querySelector('.sa-a11y-close').addEventListener('click', function () {
			panel.classList.remove('sa-open');
			btn.setAttribute('aria-expanded', 'false');
		});

		// Text size actions
		panel.querySelectorAll('.sa-a11y-text-row button').forEach(function (b) {
			b.addEventListener('click', function () { fontAction(b.dataset.action, state); });
		});

		// Toggles
		panel.querySelectorAll('.sa-a11y-opt').forEach(function (b) {
			b.addEventListener('click', function () { toggle(b.dataset.id, state); });
		});

		panel.querySelector('.sa-a11y-reset').addEventListener('click', function () {
			reset(state);
		});

		document.addEventListener('click', function (e) {
			if (!panel.classList.contains('sa-open')) return;
			if (panel.contains(e.target) || btn.contains(e.target)) return;
			panel.classList.remove('sa-open');
			btn.setAttribute('aria-expanded', 'false');
		});

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
