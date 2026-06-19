(function () {
  'use strict';

  var CONSENT_KEY = 'toeshee_cookie_consent';

  function getConsent() { return localStorage.getItem(CONSENT_KEY); }
  function setConsent(val) { localStorage.setItem(CONSENT_KEY, val); }

  function removeBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) { b.style.transform = 'translateY(120%)'; b.style.opacity = '0'; setTimeout(function () { b && b.remove(); }, 400); }
  }

  function accept() { setConsent('accepted'); removeBanner(); }
  function decline() { setConsent('declined'); removeBanner(); }

  function injectBanner() {
    if (getConsent()) return;

    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:24px', 'z-index:99999',
      'max-width:380px', 'width:calc(100vw - 48px)',
      'background:#fff', 'border:1px solid #E5E7EB',
      'border-radius:16px', 'padding:20px 22px',
      'box-shadow:0 20px 60px rgba(0,0,0,0.14)',
      'transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.4s',
      'transform:translateY(0)', 'opacity:1',
      'font-family:Inter,sans-serif'
    ].join(';');

    banner.innerHTML = [
      '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">',
        '<div style="width:36px;height:36px;border-radius:10px;background:#FF3A10;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
        '</div>',
        '<div>',
          '<p style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:15px;color:#0A0A0F;margin:0 0 4px">We use cookies</p>',
          '<p style="font-size:13px;color:#6B7280;line-height:1.55;margin:0">',
            'We use cookies to improve your experience. Read our ',
            '<a href="cookie-policy.html" style="color:#FF3A10;text-decoration:underline;font-weight:500">Cookie Policy</a>',
            ' to learn more.',
          '</p>',
        '</div>',
      '</div>',
      '<div style="display:flex;gap:8px">',
        '<button id="cookie-accept" style="flex:1;background:#FF3A10;color:#fff;border:none;border-radius:8px;padding:10px 16px;font-family:Space Grotesk,sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:background .2s">Accept All</button>',
        '<button id="cookie-decline" style="flex:1;background:#F3F4F6;color:#374151;border:none;border-radius:8px;padding:10px 16px;font-family:Space Grotesk,sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:background .2s">Decline</button>',
        '<a href="cookie-policy.html" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;background:#F3F4F6;flex-shrink:0;text-decoration:none" title="Read cookie policy">',
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        '</a>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);

    document.getElementById('cookie-accept').addEventListener('click', accept);
    document.getElementById('cookie-decline').addEventListener('click', decline);

    // Hover states
    var acceptBtn = document.getElementById('cookie-accept');
    acceptBtn.addEventListener('mouseenter', function () { this.style.background = '#E5330E'; });
    acceptBtn.addEventListener('mouseleave', function () { this.style.background = '#FF3A10'; });
    var declineBtn = document.getElementById('cookie-decline');
    declineBtn.addEventListener('mouseenter', function () { this.style.background = '#E5E7EB'; });
    declineBtn.addEventListener('mouseleave', function () { this.style.background = '#F3F4F6'; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBanner);
  } else {
    setTimeout(injectBanner, 600);
  }
})();
