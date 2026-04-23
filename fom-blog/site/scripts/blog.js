const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const filterButtons = document.querySelectorAll('[data-filter]');
const articleCards = document.querySelectorAll('.article-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.getAttribute('data-filter');

    filterButtons.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');

    articleCards.forEach((card) => {
      const category = card.getAttribute('data-category');
      const hidden = filter !== 'all' && category !== filter;
      card.setAttribute('data-hidden', String(hidden));
    });
  });
});
