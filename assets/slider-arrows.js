(function () {
	'use strict';

	function setActive(slider, index) {
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (!slides.length) return;
		index = ((index % slides.length) + slides.length) % slides.length;

		// Reset any transform Divi's slider may have set on the slides
		// container — if .et_pb_slides has transform:translate3d(...), the
		// first slide stays "in view" and class toggles do nothing.
		var slidesContainer = slider.querySelector('.et_pb_slides');
		if (slidesContainer) {
			slidesContainer.style.setProperty('transform', 'none', 'important');
			slidesContainer.style.setProperty('height', 'auto', 'important');
		}

		for (var i = 0; i < slides.length; i++) {
			var s = slides[i];
			if (i === index) {
				s.classList.add('et-pb-active-slide');
				s.style.setProperty('display', 'block', 'important');
				s.style.setProperty('opacity', '1', 'important');
				s.style.setProperty('visibility', 'visible', 'important');
				s.style.setProperty('z-index', '2', 'important');
				s.style.setProperty('position', 'relative', 'important');
			} else {
				s.classList.remove('et-pb-active-slide');
				s.style.setProperty('display', 'none', 'important');
				s.style.setProperty('opacity', '0', 'important');
				s.style.setProperty('visibility', 'hidden', 'important');
			}
		}

		var dots = slider.querySelectorAll('.et-pb-controllers a');
		for (var j = 0; j < dots.length; j++) {
			if (j === index) dots[j].classList.add('et-pb-active-control');
			else dots[j].classList.remove('et-pb-active-control');
		}
		slider.dataset.swiftAidActive = String(index);
	}

	function getActive(slider) {
		var v = parseInt(slider.dataset.swiftAidActive, 10);
		return isNaN(v) ? 0 : v;
	}

	function ensureControllers(slider) {
		var existing = slider.querySelector('.et-pb-controllers');
		if (existing) return existing;
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (slides.length < 2) return null;
		var div = document.createElement('div');
		div.className = 'et-pb-controllers';
		for (var i = 0; i < slides.length; i++) {
			var a = document.createElement('a');
			a.href = '#';
			a.textContent = String(i + 1);
			div.appendChild(a);
		}
		slider.appendChild(div);
		return div;
	}

	function findSection(slider) {
		var n = slider.parentNode;
		while (n && n !== document.body) {
			if (n.classList && n.classList.contains('et_pb_section')) return n;
			n = n.parentNode;
		}
		return null;
	}

	function moveArrowsToSection(slider, section) {
		// Look for the existing arrows wrapper or bare arrow links inside
		// the slider, then move them to the section so they land at the
		// section's edges instead of the (potentially card-width) slider's.
		var arrowsContainer = slider.querySelector('.et-pb-slider-arrows');
		if (arrowsContainer) {
			arrowsContainer.dataset.swiftAidSliderId = slider.dataset.swiftAidId;
			section.appendChild(arrowsContainer);
			return arrowsContainer;
		}
		var prev = slider.querySelector('.et-pb-arrow-prev');
		var next = slider.querySelector('.et-pb-arrow-next');
		if (!prev && !next) return null;
		var wrap = document.createElement('div');
		wrap.className = 'et-pb-slider-arrows';
		wrap.dataset.swiftAidSliderId = slider.dataset.swiftAidId;
		if (prev) wrap.appendChild(prev);
		if (next) wrap.appendChild(next);
		section.appendChild(wrap);
		return wrap;
	}

	function initSlider(slider) {
		if (slider.dataset.swiftAidInited === '1') return;
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (slides.length < 2) return;
		slider.dataset.swiftAidInited = '1';
		slider.dataset.swiftAidId = 'sa-slider-' + Math.random().toString(36).slice(2, 9);

		var pos = window.getComputedStyle(slider).position;
		if (pos === 'static') slider.style.position = 'relative';

		// Ensure controllers (dots) exist inside the slider
		var controllers = ensureControllers(slider);
		if (controllers) {
			var dots = controllers.querySelectorAll('a');
			for (var i = 0; i < dots.length; i++) {
				(function (idx, a) {
					a.addEventListener('click', function (e) {
						e.preventDefault();
						setActive(slider, idx);
					});
				})(i, dots[i]);
			}
		}

		// Move arrows to the parent section so they land at section edges
		var section = findSection(slider);
		if (section) {
			var sPos = window.getComputedStyle(section).position;
			if (sPos === 'static') section.style.position = 'relative';
			moveArrowsToSection(slider, section);
		}

		// Wire arrow clicks (works whether arrows are in slider or section)
		var arrows = (section || slider).querySelectorAll(
			'[data-swift-aid-slider-id="' + slider.dataset.swiftAidId + '"] .et-pb-arrow-prev,' +
			'[data-swift-aid-slider-id="' + slider.dataset.swiftAidId + '"] .et-pb-arrow-next,' +
			'.et-pb-arrow-prev, .et-pb-arrow-next'
		);
		// Filter to arrows that are connected to THIS slider (in the moved
		// container or still inside it)
		var prev = (section && section.querySelector('[data-swift-aid-slider-id="' + slider.dataset.swiftAidId + '"] .et-pb-arrow-prev'))
			|| slider.querySelector('.et-pb-arrow-prev');
		var next = (section && section.querySelector('[data-swift-aid-slider-id="' + slider.dataset.swiftAidId + '"] .et-pb-arrow-next'))
			|| slider.querySelector('.et-pb-arrow-next');
		if (prev) {
			prev.addEventListener('click', function (e) {
				e.preventDefault();
				setActive(slider, getActive(slider) - 1);
			});
		}
		if (next) {
			next.addEventListener('click', function (e) {
				e.preventDefault();
				setActive(slider, getActive(slider) + 1);
			});
		}

		// Find the initially-active slide (Divi marks one with et-pb-active-slide)
		var initIdx = 0;
		for (var k = 0; k < slides.length; k++) {
			if (slides[k].classList.contains('et-pb-active-slide')) { initIdx = k; break; }
		}
		setActive(slider, initIdx);
	}

	function bind() {
		var sliders = document.querySelectorAll('.et_pb_slider');
		for (var i = 0; i < sliders.length; i++) initSlider(sliders[i]);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bind);
	} else {
		bind();
	}
})();
