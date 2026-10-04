(() => {
  'use strict';

  /*
  |--------------------------------------------------------------------------
  | SPONSOREDGONE
  |--------------------------------------------------------------------------
  |
  | Google sponsored-result cleaner.
  |
  | Project: SponsoredGone
  | Version: 1
  |
  */

  const GLOBAL_KEY = '__SPONSOREDGONE_V1__';

  /*
  |--------------------------------------------------------------------------
  | PREVENT DUPLICATE INJECTION
  |--------------------------------------------------------------------------
  |
  | background.js may inject SponsoredGone.js manually when the extension
  | is switched ON while a Google page is already open.
  |
  | If this script already exists on the page, simply enable the existing
  | instance instead of creating another MutationObserver.
  |
  */

  const existing = globalThis[GLOBAL_KEY];

  if (existing) {
    existing.enable();
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | INTERNAL IDENTIFIERS
  |--------------------------------------------------------------------------
  */

  const STYLE_ID = 'sponsoredgone-v1-style';

  const HIDDEN_ATTR =
    'data-sponsoredgone-hidden';

  /*
  |--------------------------------------------------------------------------
  | DIRECT GOOGLE AD SELECTORS
  |--------------------------------------------------------------------------
  |
  | These are the strongest structural signals.
  |
  | CSS handles them immediately so known sponsored containers disappear
  | as early as possible.
  |
  */

  const DIRECT_AD_SELECTORS = [
    '#tads',
    '#tadsb',
    '#bottomads',

    '[data-text-ad]',
    '[data-is-ad]'
  ];

  const DIRECT_AD_SELECTOR =
    DIRECT_AD_SELECTORS.join(',');

  /*
  |--------------------------------------------------------------------------
  | GROUPED SPONSORED LABELS
  |--------------------------------------------------------------------------
  |
  | Google sometimes groups several advertisements inside one larger
  | "Sponsored results" / "Sponsored products" section.
  |
  | These labels provide a fallback when Google's structural markup changes.
  |
  */

  const GROUP_LABELS = [
    /*
     * English
     */
    'sponsored results',
    'sponsored result',
    'sponsored products',

    /*
     * Azerbaijani
     */
    'sponsorlu nəticələr',
    'sponsorlu nəticə',
    'sponsorlu məhsullar',

    /*
     * Turkish
     */
    'sponsorlu sonuçlar',
    'sponsorlu sonuç',
    'sponsorlu ürünler',

    /*
     * German
     */
    'gesponserte ergebnisse',
    'gesponsertes ergebnis',
    'gesponserte produkte',

    /*
     * French
     */
    'résultats sponsorisés',
    'résultat sponsorisé',
    'produits sponsorisés',

    /*
     * Spanish
     */
    'resultados patrocinados',
    'resultado patrocinado',
    'productos patrocinados',

    /*
     * Italian
     */
    'risultati sponsorizzati',
    'risultato sponsorizzato',
    'prodotti sponsorizzati',

    /*
     * Portuguese
     */
    'resultados patrocinados',
    'resultado patrocinado',
    'produtos patrocinados',

    /*
     * Russian
     */
    'спонсируемые результаты',
    'спонсируемый результат',
    'рекламные результаты',
    'рекламные товары'
  ];

  /*
  |--------------------------------------------------------------------------
  | SINGLE-RESULT LABELS
  |--------------------------------------------------------------------------
  |
  | Used only when the label itself is a short standalone element.
  |
  | We intentionally avoid matching the generic English word "Ad"
  | because it can generate false positives.
  |
  */

  const SINGLE_LABELS = new Set([
    /*
     * English
     */
    'sponsored',

    /*
     * Azerbaijani / Turkish
     */
    'sponsorlu',

    /*
     * German
     */
    'gesponsert',

    /*
     * French
     */
    'sponsorisé',
    'sponsorisée',

    /*
     * Spanish / Portuguese
     */
    'patrocinado',
    'patrocinada',

    /*
     * Italian
     */
    'sponsorizzato',
    'sponsorizzata',

    /*
     * Russian
     */
    'реклама'
  ]);

  /*
  |--------------------------------------------------------------------------
  | SEARCH BOUNDARIES
  |--------------------------------------------------------------------------
  |
  | SponsoredGone must never accidentally hide Google's complete results
  | page while walking up the DOM.
  |
  | These elements act as hard stopping points.
  |
  */

  const STOP_SELECTOR = [
    'html',
    'body',
    '#search',
    '#rso',
    'main',
    '[role="main"]'
  ].join(',');

  /*
  |--------------------------------------------------------------------------
  | LABEL CANDIDATES
  |--------------------------------------------------------------------------
  */

  const LABEL_CANDIDATE_SELECTOR = [
    'span',
    'div',
    'button',
    '[role="button"]',
    '[role="heading"]',
    'h1',
    'h2',
    'h3',
    'h4'
  ].join(',');

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  let active = false;

  let observer = null;

  /*
  |--------------------------------------------------------------------------
  | TEXT NORMALIZATION
  |--------------------------------------------------------------------------
  */

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase();
  }

  /*
  |--------------------------------------------------------------------------
  | LABEL HELPERS
  |--------------------------------------------------------------------------
  */

  function containsGroupLabel(text) {
    return GROUP_LABELS.some(
      (label) => text.includes(label)
    );
  }

  function isExactGroupLabel(text) {
    return GROUP_LABELS.includes(text);
  }

  /*
  |--------------------------------------------------------------------------
  | ELEMENT SAFETY
  |--------------------------------------------------------------------------
  */

  function isStopElement(element) {
    return (
      !element ||
      element.matches(STOP_SELECTOR)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MARK ELEMENT AS HIDDEN
  |--------------------------------------------------------------------------
  |
  | We do not modify Google's own inline display values.
  |
  | Instead we mark elements with our own attribute and let our stylesheet
  | hide them.
  |
  | When SponsoredGone is switched OFF we simply remove our attribute.
  |
  */

  function hideElement(element) {
    if (!(element instanceof Element)) {
      return;
    }

    if (isStopElement(element)) {
      return;
    }

    element.setAttribute(
      HIDDEN_ATTR,
      '1'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | INSTALL EARLY HIDE STYLE
  |--------------------------------------------------------------------------
  */

  function installStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style =
      document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `
      ${DIRECT_AD_SELECTOR},
      [${HIDDEN_ATTR}="1"] {
        display: none !important;
      }
    `;

    const mount =
      document.documentElement ||
      document.head;

    if (mount) {
      mount.appendChild(style);
      return;
    }

    /*
     * document_start can execute extremely early.
     *
     * If <html> does not exist yet, retry in the next microtask.
     */
    queueMicrotask(installStyle);
  }

  /*
  |--------------------------------------------------------------------------
  | FIND GROUPED SPONSORED SECTION
  |--------------------------------------------------------------------------
  */

  function findGroupedAdContainer(
    startElement
  ) {
    let current = startElement;

    for (
      let depth = 0;
      current && depth < 9;
      depth += 1,
      current = current.parentElement
    ) {
      if (isStopElement(current)) {
        break;
      }

      const text =
        normalizeText(
          current.textContent
        );

      /*
       * Avoid examining enormous containers.
       */
      if (
        !text ||
        text.length > 25000
      ) {
        continue;
      }

      /*
       * Require both:
       *
       * 1. Sponsored wording
       * 2. At least one actual result link
       *
       * This substantially reduces false positives.
       */
      if (
        containsGroupLabel(text) &&
        current.querySelector('a[href]')
      ) {
        return current;
      }
    }

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | FIND SINGLE SPONSORED RESULT
  |--------------------------------------------------------------------------
  */

  function findSingleAdContainer(
    labelElement
  ) {
    let current =
      labelElement.parentElement;

    for (
      let depth = 0;
      current && depth < 8;
      depth += 1,
      current = current.parentElement
    ) {
      if (isStopElement(current)) {
        break;
      }

      const text =
        normalizeText(
          current.textContent
        );

      if (
        !text ||
        text.length > 7000
      ) {
        continue;
      }

      const hasLink =
        Boolean(
          current.querySelector(
            'a[href]'
          )
        );

      const hasResultHeading =
        Boolean(
          current.querySelector(
            'h3,[role="heading"]'
          )
        );

      if (
        hasLink &&
        hasResultHeading
      ) {
        return current;
      }
    }

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | INSPECT POSSIBLE LABEL
  |--------------------------------------------------------------------------
  */

  function inspectLabelElement(element) {
    if (!(element instanceof Element)) {
      return;
    }

    const text =
      normalizeText(
        element.textContent
      );

    /*
     * Individual Google labels should be short.
     *
     * This prevents us from treating complete result containers
     * as label elements.
     */
    if (
      !text ||
      text.length > 90
    ) {
      return;
    }

    /*
     * Grouped advertisements.
     */
    if (isExactGroupLabel(text)) {
      const container =
        findGroupedAdContainer(
          element
        );

      hideElement(container);

      return;
    }

    /*
     * Individual advertisement.
     */
    if (SINGLE_LABELS.has(text)) {
      const container =
        findSingleAdContainer(
          element
        );

      hideElement(container);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SCAN LABELS
  |--------------------------------------------------------------------------
  */

  function scanLabels(root) {
    if (
      !(root instanceof Element) &&
      root !== document
    ) {
      return;
    }

    /*
     * Inspect root itself first.
     */
    if (root instanceof Element) {
      inspectLabelElement(root);
    }

    const candidates =
      root.querySelectorAll?.(
        LABEL_CANDIDATE_SELECTOR
      );

    if (!candidates) {
      return;
    }

    /*
     * Defensive limit.
     *
     * Google Search normally stays comfortably below this number.
     */
    const limit =
      Math.min(
        candidates.length,
        1800
      );

    for (
      let index = 0;
      index < limit;
      index += 1
    ) {
      inspectLabelElement(
        candidates[index]
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INSPECT PARENTS OF NEWLY INSERTED CONTENT
  |--------------------------------------------------------------------------
  |
  | Sometimes Google inserts only one child into an already-existing
  | sponsored group.
  |
  | Therefore we inspect the new node's ancestor chain as well.
  |
  */

  function inspectAncestorChain(start) {
    let current =
      start instanceof Element
        ? start
        : start?.parentElement;

    for (
      let depth = 0;
      current && depth < 9;
      depth += 1,
      current = current.parentElement
    ) {
      if (isStopElement(current)) {
        break;
      }

      const text =
        normalizeText(
          current.textContent
        );

      if (
        !text ||
        text.length > 25000
      ) {
        continue;
      }

      if (
        containsGroupLabel(text) &&
        current.querySelector('a[href]')
      ) {
        hideElement(current);

        return;
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PROCESS GOOGLE DOM CHANGES
  |--------------------------------------------------------------------------
  */

  function processMutationRecords(
    records
  ) {
    if (!active) {
      return;
    }

    for (const record of records) {
      for (
        const node
        of record.addedNodes
      ) {
        if (!(node instanceof Element)) {
          continue;
        }

        /*
         * Structural selectors are already hidden immediately through CSS.
         *
         * This scan exists mainly for experimental / newly changed Google
         * layouts where only the visible Sponsored label is reliable.
         */
        scanLabels(node);

        inspectAncestorChain(node);
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | START GOOGLE PAGE OBSERVER
  |--------------------------------------------------------------------------
  */

  function startObserver() {
    observer?.disconnect();

    observer =
      new MutationObserver(
        processMutationRecords
      );

    observer.observe(
      document,
      {
        childList: true,
        subtree: true
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | INITIAL CLEANUP
  |--------------------------------------------------------------------------
  */

  function initialCleanup() {
    /*
     * Known structural ads are handled immediately by CSS.
     *
     * This handles grouped sponsored layouts that already exist when
     * SponsoredGone is enabled.
     */
    scanLabels(document);
  }

  /*
  |--------------------------------------------------------------------------
  | ENABLE SPONSOREDGONE
  |--------------------------------------------------------------------------
  */

  function enable() {
    /*
     * If already active, refresh our style and perform another scan
     * rather than creating another observer.
     */
    if (active) {
      installStyle();

      initialCleanup();

      return;
    }

    active = true;

    installStyle();

    startObserver();

    initialCleanup();
  }

  /*
  |--------------------------------------------------------------------------
  | DISABLE SPONSOREDGONE
  |--------------------------------------------------------------------------
  */

  function disable() {
    active = false;

    /*
     * Stop monitoring Google.
     */
    observer?.disconnect();

    observer = null;

    /*
     * Remove our CSS.
     */
    document
      .getElementById(STYLE_ID)
      ?.remove();

    /*
     * Restore anything hidden by SponsoredGone.
     *
     * We remove only OUR attribute.
     *
     * We never force Google's elements to display:block, so Google's
     * own original CSS remains responsible for the restored layout.
     */
    document
      .querySelectorAll(
        `[${HIDDEN_ATTR}]`
      )
      .forEach((element) => {
        element.removeAttribute(
          HIDDEN_ATTR
        );
      });
  }

  /*
  |--------------------------------------------------------------------------
  | EXPOSE SINGLE PAGE INSTANCE
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | This is deliberately the exact same name checked at the beginning:
  |
  | __SPONSOREDGONE_V1__
  |
  */

  globalThis[GLOBAL_KEY] = {
    enable,
    disable
  };

  /*
  |--------------------------------------------------------------------------
  | BACKGROUND.JS MESSAGES
  |--------------------------------------------------------------------------
  */

  chrome.runtime.onMessage.addListener(
    (message) => {
      if (
        message?.type ===
        'SPONSOREDGONE_DISABLE'
      ) {
        disable();

        return;
      }

      if (
        message?.type ===
        'SPONSOREDGONE_ENABLE'
      ) {
        enable();
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | WATCH SAVED ON/OFF STATE
  |--------------------------------------------------------------------------
  |
  | This provides another synchronization path when the toolbar button
  | changes chrome.storage.sync.
  |
  */

  chrome.storage.onChanged.addListener(
    (changes, areaName) => {
      if (
        areaName !== 'sync' ||
        !changes.enabled
      ) {
        return;
      }

      if (
        changes.enabled.newValue ===
        false
      ) {
        disable();

        return;
      }

      enable();
    }
  );

  /*
  |--------------------------------------------------------------------------
  | START
  |--------------------------------------------------------------------------
  */

  enable();
})();