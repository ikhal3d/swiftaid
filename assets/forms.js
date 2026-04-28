(function () {
	'use strict';

	function setBusy(button, busy, original) {
		if (!button) return;
		button.disabled = busy;
		if (busy) {
			if (button.tagName === 'INPUT') button.value = 'Sending…';
			else button.innerText = 'Sending…';
		} else {
			if (button.tagName === 'INPUT') button.value = original;
			else button.innerText = original;
		}
	}

	function showMessage(form, text, isError) {
		var msg = form.querySelector('.swift-aid-form-msg');
		if (!msg) {
			msg = document.createElement('div');
			msg.className = 'swift-aid-form-msg';
			msg.style.cssText = 'padding:14px 18px;border-radius:10px;margin-top:18px;text-align:center;font-weight:600;font-size:16px;';
			form.appendChild(msg);
		}
		msg.style.background = isError ? '#c62828' : '#8bbc3a';
		msg.style.color = '#ffffff';
		msg.textContent = text;
	}

	function handleSubmit(e) {
		e.preventDefault();
		var form = e.target;
		var submit = form.querySelector('button[type="submit"], input[type="submit"]');
		var original = submit ? (submit.tagName === 'INPUT' ? submit.value : submit.innerText) : '';
		setBusy(submit, true, original);

		fetch('https://api.web3forms.com/submit', {
			method: 'POST',
			body: new FormData(form),
		})
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (data && data.success) {
					showMessage(form, 'Thanks — your message has been received. We will be in touch shortly.', false);
					form.reset();
				} else {
					showMessage(form, 'Sorry, something went wrong: ' + (data && data.message ? data.message : 'please try again or email info@swiftaid.com.au.'), true);
				}
			})
			.catch(function () {
				showMessage(form, 'Sorry, the form could not be submitted. Please email info@swiftaid.com.au directly.', true);
			})
			.finally(function () { setBusy(submit, false, original); });
	}

	function init() {
		var forms = document.querySelectorAll('form[data-web3forms]');
		for (var i = 0; i < forms.length; i++) forms[i].addEventListener('submit', handleSubmit);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
