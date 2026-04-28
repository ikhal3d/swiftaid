(function () {
	'use strict';

	function setActive(slider, index) {
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (!slides.length) return;
		index = ((index % slides.length) + slides.length) % slides.length;
		for (var i = 0; i < slides.length; i++) {
			if (i === index) {
				slides[i].classList.add('et-pb-active-slide');
				slides[i].style.display = '';
				slides[i].style.opacity = '1';
				slides[i].style.zIndex = '2';
			} else {
				slides[i].classList.remove('et-pb-active-slide');
				slides[i].style.opacity = '0';
				slides[i].style.zIndex = '1';
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

	function initSlider(slider) {
		if (slider.dataset.swiftAidInited === '1') return;
		var slides = slider.querySelectorAll('.et_pb_slide');
		if (slides.length < 2) return;
		slider.dataset.swiftAidInited = '1';

		// Position container so absolutely-positioned arrows / controllers
		// land where Divi's CSS expects them
		var pos = window.getComputedStyle(slider).position;
		if (pos === 'static') slider.style.position = 'relative';

		// Ensure controllers (dots) exist
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

		// Wire arrows (already injected by Python, just attach handlers)
		var prev = slider.querySelector('.et-pb-slider-arrows .et-pb-arrow-prev, > .et-pb-arrow-prev, .et-pb-arrow-prev');
		var next = slider.querySelector('.et-pb-slider-arrows .et-pb-arrow-next, > .et-pb-arrow-next, .et-pb-arrow-next');
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
