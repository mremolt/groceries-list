// Progressive enhancement for the themed pages (ADR 0003). No external requests, no eval (CSP-safe).
(function () {
  // Show/hide password: the button keeps its name "Passwort anzeigen"; the state is announced via aria-pressed (FR-AUTH-01 AC6).
  document.querySelectorAll('[data-password-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = document.getElementById(button.getAttribute('aria-controls'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', show ? 'true' : 'false');
    });
  });
  // Keycloak validates a password confirmation field server-side; the product has a single password field (FR-AUTH-01 AC6),
  // so the confirmation is mirrored from it before submit.
  document.querySelectorAll('input[data-mirror-of]').forEach(function (hidden) {
    var source = document.getElementById(hidden.getAttribute('data-mirror-of'));
    if (!source || !source.form) return;
    var sync = function () { hidden.value = source.value; };
    source.addEventListener('input', sync);
    source.form.addEventListener('submit', sync);
    sync();
  });
  // After an error, focus moves to the first invalid field (FR-FB-04 AC3).
  var invalid = document.querySelector('[aria-invalid="true"]');
  if (invalid) invalid.focus();
})();
