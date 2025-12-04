document.addEventListener('DOMContentLoaded', function() {
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      if (target) {
        window.location.href = target;
      }
    });
  });
  
  const credentialsCard = document.getElementById('credentials-card');
  if (credentialsCard) {
    credentialsCard.addEventListener('click', function() {
      window.location.href = 'credentialsInjection.html';
    });
  }
});