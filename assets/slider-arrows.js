(function () {
	'use strict';

	function activeSlideIndex(slides) {
		for (var i = 0; i < slides.length; i++) {
			if (slides[i].classList.contains('et-pb-active-slide')) return i;
		}
		return 0;
	}

	function clickControllerAt(slider, index) {
		// Divi renders one <a> per slide inside .et-pb-controllers; clicking
		// it advances the slider exactly like the native dot click.
		var controllers = slider.querySelectorAll('.et-pb-controllers a');
		if (controllers.length === 0) return false;
		var target = controllers[(index + controllers.length) % controllers.length];
		if (target && target.click) { target.click(); return true; }
		return false;
	}

	function advance(slider, dir) {
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (slides.length < 2) return;
		var idx = activeSlideIndex(slides);
		var next = (idx + dir + slides.length) % slides.length;
		// Try the dot path first (uses Divi's wired-up click handler)
		if (clickControllerAt(slider, next)) return;
		// Fallback: toggle the active class manually so visuals at least
		// move. Divi's own transition styles still apply.
		slides[idx].classList.remove('et-pb-active-slide');
		slides[next].classList.add('et-pb-active-slide');
	}

	function bind() {
		var arrows = document.querySelectorAll('.et-pb-slider-arrows a.et-pb-arrow-prev, .et-pb-slider-arrows a.et-pb-arrow-next');
		for (var i = 0; i < arrows.length; i++) {
			(function (a) {
				if (a.dataset.swiftAidBound) return;
				a.dataset.swiftAidBound = '1';
				a.addEventListener('click', function (e) {
					e.preventDefault();
					var slider = a.closest('.et_pb_slider');
					if (!slider) return;
					advance(slider, a.classList.contains('et-pb-arrow-next') ? 1 : -1);
				});
			})(arrows[i]);
		}
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
	else bind();
})();
