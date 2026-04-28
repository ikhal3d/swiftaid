(function () {
	'use strict';

	// Divi/CF7 emit a lot of internal hidden fields (nonces, schema JSON, etc.)
	// that pollute the email body and make Web3Forms classify the message as
	// spam. Strip them before submission, and rename the user-facing fields
	// from Divi's noisy form-id-suffixed names to readable ones.
	var SKIP_FIELD_PATTERNS = [
		/^et_pb_contactform_submit_/,
		/^wpnonce-et-pb-contact-form-/,
		/^wp_http_referer$/,
		/^et_pb_contact_email_fields_/,
		/^et_pb_contact_email_hidden_fields_/,
		/^token$/,
		/^_wpcf7$/,
		/^_wpcf7_version$/,
		/^_wpcf7_locale$/,
		/^_wpcf7_unit_tag$/,
		/^_wpcf7_container_post$/,
		/^_wpcf7_posted_data_hash$/,
		/^_wpcf7_recaptcha_response$/,
		/^g-recaptcha-response$/,
	];

	// Divi names fields like et_pb_contact_<original_id>_0 — extract the inner part.
	var DIVI_FIELD_RE = /^et_pb_contact_(.+?)_\d+$/;

	function shouldSkip(name) {
		for (var i = 0; i < SKIP_FIELD_PATTERNS.length; i++) {
			if (SKIP_FIELD_PATTERNS[i].test(name)) return true;
		}
		return false;
	}

	function cleanName(name) {
		var m = name.match(DIVI_FIELD_RE);
		return m ? m[1] : name;
	}

	function buildPayload(form) {
		var src = new FormData(form);
		var out = new FormData();
		var entries = [];
		// Iterate via forEach for IE/Edge-old compat
		src.forEach(function (value, key) { entries.push([key, value]); });
		for (var i = 0; i < entries.length; i++) {
			var key = entries[i][0];
			var value = entries[i][1];
			if (shouldSkip(key)) continue;
			out.append(cleanName(key), value);
		}
		return out;
	}

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

	function renderSuccess(form) {
		// Insert a thank-you panel as a sibling of the form, then hide the
		// form. Inserting as a sibling preserves the surrounding container's
		// height so the layout doesn't collapse.
		var panel = document.createElement('div');
		panel.className = 'swift-aid-form-success';
		panel.style.cssText = 'background:#8bbc3a;color:#ffffff;padding:30px 24px;border-radius:14px;text-align:center;margin:18px 0;';
		var h = document.createElement('h3');
		h.style.cssText = 'color:#ffffff;margin:0 0 10px;font-size:24px;';
		h.textContent = 'Thanks — message received';
		var p = document.createElement('p');
		p.style.cssText = 'margin:0;color:#ffffff;font-size:16px;line-height:1.5;';
		p.textContent = 'We\'ve got your details and will be in touch shortly. If your enquiry is urgent, call 1300 718 970.';
		panel.appendChild(h);
		panel.appendChild(p);

		var parent = form.parentNode || document.body;
		parent.insertBefore(panel, form);
		form.style.display = 'none';
		panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function showError(form, text) {
		var msg = form.querySelector('.swift-aid-form-msg');
		if (!msg) {
			msg = document.createElement('div');
			msg.className = 'swift-aid-form-msg';
			msg.style.cssText = 'padding:14px 18px;border-radius:10px;margin-top:18px;text-align:center;font-weight:600;font-size:16px;background:#c62828;color:#ffffff;';
			form.appendChild(msg);
		}
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
			body: buildPayload(form),
		})
			.then(function (r) { return r.json().catch(function () { return { success: false, message: 'unexpected response' }; }); })
			.then(function (data) {
				if (data && data.success) {
					renderSuccess(form);
				} else {
					setBusy(submit, false, original);
					showError(form, 'Sorry, something went wrong: ' + (data && data.message ? data.message : 'please try again or email info@swiftaid.com.au directly.'));
				}
			})
			.catch(function () {
				setBusy(submit, false, original);
				showError(form, 'Sorry, the form could not be submitted. Please email info@swiftaid.com.au directly.');
			});
	}

	function init() {
		var forms = document.querySelectorAll('form[data-web3forms]');
		for (var i = 0; i < forms.length; i++) forms[i].addEventListener('submit', handleSubmit);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
