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

	function isRequired(field) {
		if (field.required) return true;
		if (field.getAttribute('aria-required') === 'true') return true;
		if (field.getAttribute('data-required_mark') === 'required') return true;
		return false;
	}

	function fieldLabel(field) {
		var name = field.getAttribute('data-original_id') || field.name || '';
		// Try to find a matching <label> in the form
		if (field.id) {
			var byFor = document.querySelector('label[for="' + field.id + '"]');
			if (byFor && byFor.textContent.trim()) return byFor.textContent.trim().replace(/\*+\s*$/, '');
		}
		var placeholder = field.getAttribute('placeholder');
		if (placeholder) return placeholder.replace(/\*+\s*$/, '').trim();
		return name.replace(/_/g, ' ');
	}

	function validateForm(form) {
		var fields = form.querySelectorAll('input, textarea, select');
		var missing = [];
		var seenGroups = {};
		for (var i = 0; i < fields.length; i++) {
			var f = fields[i];
			if (f.type === 'hidden' || f.type === 'submit' || f.type === 'reset' || f.type === 'button') continue;
			if (!isRequired(f)) continue;

			if (f.type === 'checkbox' || f.type === 'radio') {
				if (seenGroups[f.name]) continue;
				seenGroups[f.name] = true;
				var checked = form.querySelectorAll('input[name="' + f.name + '"]:checked');
				if (checked.length === 0) missing.push(fieldLabel(f));
			} else {
				if (!f.value || !String(f.value).trim()) missing.push(fieldLabel(f));
			}
		}
		return missing;
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

	function showTopBanner(text, isError) {
		// Fixed-position banner pinned to the top of the viewport — visible
		// regardless of where the form lived in the page or what its container
		// did when we hid it. Auto-dismisses after 8s.
		var b = document.createElement('div');
		b.setAttribute('role', 'alert');
		b.style.cssText = [
			'position:fixed', 'top:0', 'left:0', 'right:0',
			'background:' + (isError ? '#c62828' : '#8bbc3a'),
			'color:#ffffff', 'padding:18px 24px',
			'text-align:center', 'font-weight:600', 'font-size:16px',
			'z-index:2147483647',
			'box-shadow:0 4px 14px rgba(0,0,0,0.2)',
			'font-family:inherit'
		].join(';');
		b.textContent = text;
		document.body.appendChild(b);
		setTimeout(function () {
			b.style.transition = 'opacity 0.5s';
			b.style.opacity = '0';
			setTimeout(function () { try { b.remove(); } catch (e) {} }, 600);
		}, 8000);
	}

	function buildPanel() {
		var panel = document.createElement('div');
		panel.className = 'swift-aid-form-success';
		panel.style.cssText = 'display:block;background:#8bbc3a;color:#ffffff;padding:30px 24px;border-radius:14px;text-align:center;margin:18px 0;font-family:inherit;';
		var h = document.createElement('h3');
		h.style.cssText = 'color:#ffffff;margin:0 0 10px;font-size:24px;';
		h.textContent = 'Thanks — message received';
		var p = document.createElement('p');
		p.style.cssText = 'margin:0;color:#ffffff;font-size:16px;line-height:1.5;';
		p.textContent = 'We\'ve got your details and will be in touch shortly. If your enquiry is urgent, call 1300 718 970.';
		panel.appendChild(h);
		panel.appendChild(p);
		return panel;
	}

	function renderSuccess(form) {
		// Always show the top banner first — guaranteed visible feedback even
		// if the inline replacement ends up in a collapsed container.
		showTopBanner('Thanks — your message has been received. We will be in touch shortly.', false);

		// Inline replacement: replace the form's parent's contents with the
		// success panel. Replacing the parent's children (rather than just
		// hiding the form and inserting a sibling) guarantees the parent has
		// at least the panel inside, so it can't collapse to zero-height.
		try {
			var parent = form.parentNode;
			if (parent) {
				parent.innerHTML = '';
				parent.appendChild(buildPanel());
				parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
			} else {
				form.style.display = 'none';
			}
		} catch (e) {
			// Even if the inline swap throws, the top banner is already up.
			try { form.style.display = 'none'; } catch (_) {}
		}
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

		var missing = validateForm(form);
		if (missing.length > 0) {
			showError(form, 'Please fill in: ' + missing.join(', '));
			// Make sure the error is visible
			var msg = form.querySelector('.swift-aid-form-msg');
			if (msg && msg.scrollIntoView) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}

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
					var msg = 'Sorry, something went wrong: ' + (data && data.message ? data.message : 'please try again or email info@swiftaid.com.au directly.');
					showError(form, msg);
					showTopBanner(msg, true);
				}
			})
			.catch(function () {
				setBusy(submit, false, original);
				var msg = 'Sorry, the form could not be submitted. Please email info@swiftaid.com.au directly.';
				showError(form, msg);
				showTopBanner(msg, true);
			});
	}

	function init() {
		var forms = document.querySelectorAll('form[data-web3forms]');
		for (var i = 0; i < forms.length; i++) forms[i].addEventListener('submit', handleSubmit);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
