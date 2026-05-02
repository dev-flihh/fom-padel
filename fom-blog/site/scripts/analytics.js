(function () {
  const DEFAULT_MEASUREMENT_ID = 'G-CRE1CTV063';
  const measurementId = (window.FOM_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID || '').trim();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  const sanitizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const toSnakeCase = (value) => sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  const getPageGroup = () => {
    const path = window.location.pathname;
    if (path.includes('/articles/ranking-mmr-fom-play')) return 'article_ranking_mmr';
    if (path.includes('/articles/')) return 'article';
    if (path === '/ranking' || path === '/ranking/') return 'ranking';
    if (path.startsWith('/blog')) return 'blog';
    return 'landing';
  };

  const getScreenName = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/') return 'landing';
    if (path === '/blog') return 'blog';
    if (path === '/ranking') return 'ranking';

    const articleMatch = path.match(/\/articles\/([^/]+)/);
    if (articleMatch) return `article_${toSnakeCase(articleMatch[1])}`;

    return toSnakeCase(path);
  };

  const baseParams = () => ({
    screen_name: getScreenName(),
    page_group: getPageGroup(),
    page_path: window.location.pathname,
    page_location: window.location.href,
    page_title: document.title,
    app_surface: 'public_web'
  });

  const sendEvent = (eventName, params) => {
    window.gtag('event', eventName, Object.assign({}, baseParams(), params || {}));
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_path: window.location.pathname,
    page_location: window.location.href,
    page_title: document.title,
    send_page_view: false
  });

  sendEvent('page_view');

  const readDescriptor = (element) => {
    return (
      element.getAttribute('data-analytics-id') ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.getAttribute('id') ||
      sanitizeText(element.textContent)
    );
  };

  const readSection = (element) => {
    const section = element.closest('[data-analytics-section], section[id], article, main, header, footer');
    if (!section) return undefined;
    return toSnakeCase(
      section.getAttribute('data-analytics-section') ||
      section.getAttribute('id') ||
      section.tagName.toLowerCase()
    );
  };

  document.addEventListener('click', (event) => {
    const element = event.target && event.target.closest
      ? event.target.closest('a, button, [role="button"], [data-analytics-id], [data-filter]')
      : null;
    if (!element) return;

    const descriptor = element.getAttribute('data-filter')
      ? `filter_${element.getAttribute('data-filter')}`
      : readDescriptor(element);
    const clickName = toSnakeCase(descriptor);
    if (!clickName) return;

    const anchor = element.tagName.toLowerCase() === 'a' ? element : element.closest('a');
    const clickType = anchor ? 'link' : (element.getAttribute('role') || element.tagName.toLowerCase());

    sendEvent('tracker_click', {
      click_name: `${getScreenName()}__${clickName}`,
      click_text: sanitizeText(element.textContent),
      click_type: toSnakeCase(clickType),
      target_url: anchor ? anchor.href : undefined,
      section: readSection(element)
    });
  }, true);

  const milestones = [25, 50, 75, 90, 100];
  const trackedMilestones = new Set();
  let maxDepth = 0;
  let ticking = false;

  const getScrollPercent = () => {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const scrollTop = window.scrollY || scrollingElement.scrollTop || document.body.scrollTop || 0;
    const scrollableHeight = Math.max(1, scrollingElement.scrollHeight - window.innerHeight);
    return Math.min(100, Math.max(0, Math.round((scrollTop / scrollableHeight) * 100)));
  };

  const checkScrollDepth = () => {
    ticking = false;
    const scrollPercent = getScrollPercent();
    maxDepth = Math.max(maxDepth, scrollPercent);

    milestones.forEach((milestone) => {
      if (trackedMilestones.has(milestone) || scrollPercent < milestone) return;
      trackedMilestones.add(milestone);
      sendEvent('page_scroll', {
        scroll_milestone: milestone,
        scroll_percent: scrollPercent,
        max_scroll_depth: maxDepth
      });
    });
  };

  const handleScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(checkScrollDepth);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll);
  checkScrollDepth();
})();
