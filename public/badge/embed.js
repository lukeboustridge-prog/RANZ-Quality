(function() {
  'use strict';

  var PORTAL_URL = 'https://portal.ranz.org.nz';

  function initBadges() {
    var badges = document.querySelectorAll('.ranz-badge');

    badges.forEach(function(badge) {
      var businessId = badge.getAttribute('data-business-id');
      var style = badge.getAttribute('data-style') || 'compact';

      if (!businessId) {
        console.error('RANZ Badge: Missing data-business-id attribute');
        return;
      }

      // Add loading state
      badge.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Loading...</span>';

      fetch(PORTAL_URL + '/api/public/verify/' + businessId)
        .then(function(response) {
          if (!response.ok) throw new Error('Verification failed');
          return response.json();
        })
        .then(function(data) {
          if (!data.verified) {
            badge.innerHTML = '<span style="color: #dc2626; font-size: 12px;">Certification not found</span>';
            return;
          }

          var link = document.createElement('a');
          link.href = PORTAL_URL + '/verify/' + businessId;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.title = 'Verify RANZ Certification';

          var img = document.createElement('img');
          img.src = PORTAL_URL + '/api/public/badge/' + businessId + '/image';
          img.alt = 'RANZ ' + data.certificationTier.replace('_', ' ') + ' Certified';
          img.style.maxWidth = style === 'full' ? '200px' : '120px';
          img.style.height = 'auto';

          link.appendChild(img);
          badge.innerHTML = '';
          badge.appendChild(link);
        })
        .catch(function(error) {
          console.error('RANZ Badge: Failed to load badge', error);
          badge.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Badge unavailable</span>';
        });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadges);
  } else {
    initBadges();
  }
})();
