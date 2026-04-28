(function () {
	'use strict';

	function animate(el) {
		var target = parseInt(el.getAttribute('data-target'), 10);
		if (isNaN(target)) return;
		var suffix = el.getAttribute('data-suffix') || '';
		var duration = 1600;
		var start = performance.now();

		function tick(now) {
			var t = Math.min((now - start) / duration, 1);
			// ease-out cubic for a satisfying tick that slows toward the end
			var eased = 1 - Math.pow(1 - t, 3);
			el.textContent = Math.round(target * eased) + suffix;
			if (t < 1) requestAnimationFrame(tick);
		}

		requestAnimationFrame(tick);
	}

	function init() {
		var counters = document.querySelectorAll('.sa-counter-number[data-target]');
		if (!counters.length) return;

		// No IntersectionObserver — fall back to immediate animation
		if (!('IntersectionObserver' in window)) {
			counters.forEach(animate);
			return;
		}

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting && !e.target.dataset.animated) {
					e.target.dataset.animated = '1';
					animate(e.target);
					io.unobserve(e.target);
				}
			});
		}, { threshold: 0.4 });

		counters.forEach(function (c) { io.observe(c); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
