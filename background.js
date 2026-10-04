'use strict';

const SCRIPT_ID = 'sponsoredgone-google-cleaner-v1';

const GOOGLE_MATCHES = [
  'https://www.google.com/*',
  'https://google.com/*',
  'https://maps.google.com/*'
];

/*
|--------------------------------------------------------------------------
| GET CURRENT STATE
|--------------------------------------------------------------------------
*/

async function getEnabled() {
  const result = await chrome.storage.sync.get({
    enabled: true
  });

  return result.enabled !== false;
}

/*
|--------------------------------------------------------------------------
| REGISTER / UNREGISTER CLEANER
|--------------------------------------------------------------------------
*/

async function ensureRegistration(enabled) {
  const registered =
    await chrome.scripting.getRegisteredContentScripts({
      ids: [SCRIPT_ID]
    });

  const exists = registered.length > 0;

  if (enabled && !exists) {
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches: GOOGLE_MATCHES,
        js: ['SponsoredGone.js'],
        runAt: 'document_start',
        allFrames: false,
        persistAcrossSessions: true
      }
    ]);
  } else if (!enabled && exists) {
    await chrome.scripting.unregisterContentScripts({
      ids: [SCRIPT_ID]
    });
  }
}

/*
|--------------------------------------------------------------------------
| TOOLBAR STATE
|--------------------------------------------------------------------------
*/

async function setActionState(enabled) {
  await chrome.action.setBadgeText({
    text: enabled ? 'ON' : 'OFF'
  });

  await chrome.action.setBadgeBackgroundColor({
    color: enabled
      ? '#2E7D32'
      : '#6B7280'
  });

  await chrome.action.setTitle({
    title: `SponsoredGone: ${enabled ? 'ON' : 'OFF'} — click to toggle`
  });
}

/*
|--------------------------------------------------------------------------
| INJECT INTO CURRENT TAB
|--------------------------------------------------------------------------
*/

async function injectIntoTab(tabId) {
  if (!Number.isInteger(tabId)) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId
      },

      files: [
        'SponsoredGone.js'
      ]
    });
  } catch (_) {
    /*
     * Expected on browser pages and websites outside
     * SponsoredGone's Google permissions.
     */
  }
}

/*
|--------------------------------------------------------------------------
| MESSAGE OPEN CONTENT SCRIPTS
|--------------------------------------------------------------------------
*/

async function tellOpenScripts(type) {
  const tabs = await chrome.tabs.query({});

  await Promise.allSettled(
    tabs
      .filter((tab) =>
        Number.isInteger(tab.id)
      )
      .map((tab) =>
        chrome.tabs.sendMessage(
          tab.id,
          {
            type
          }
        )
      )
  );
}

/*
|--------------------------------------------------------------------------
| INITIALIZE
|--------------------------------------------------------------------------
*/

async function initialize() {
  const current =
    await chrome.storage.sync.get('enabled');

  const enabled =
    current.enabled === undefined
      ? true
      : current.enabled !== false;

  /*
   * SponsoredGone starts ON by default.
   */
  if (current.enabled === undefined) {
    await chrome.storage.sync.set({
      enabled: true
    });
  }

  await ensureRegistration(enabled);
  await setActionState(enabled);
}

/*
|--------------------------------------------------------------------------
| INSTALL
|--------------------------------------------------------------------------
*/

chrome.runtime.onInstalled.addListener(() => {
  initialize().catch(console.error);
});

/*
|--------------------------------------------------------------------------
| BROWSER STARTUP
|--------------------------------------------------------------------------
*/

chrome.runtime.onStartup.addListener(() => {
  initialize().catch(console.error);
});

/*
|--------------------------------------------------------------------------
| ONE-CLICK ON / OFF
|--------------------------------------------------------------------------
*/

chrome.action.onClicked.addListener((tab) => {
  (async () => {
    const enabled =
      await getEnabled();

    const nextEnabled =
      !enabled;

    /*
     * Save state.
     */
    await chrome.storage.sync.set({
      enabled: nextEnabled
    });

    /*
     * Register / unregister SponsoredGone.
     */
    await ensureRegistration(
      nextEnabled
    );

    /*
     * Update toolbar state.
     */
    await setActionState(
      nextEnabled
    );

    if (nextEnabled) {
      /*
       * SponsoredGone turned ON.
       *
       * Immediately clean the page currently being viewed.
       */
      await injectIntoTab(
        tab.id
      );

      await tellOpenScripts(
        'SPONSOREDGONE_ENABLE'
      );
    } else {
      /*
       * SponsoredGone turned OFF.
       *
       * Tell already-running content scripts to restore
       * Google's original layout immediately.
       */
      await tellOpenScripts(
        'SPONSOREDGONE_DISABLE'
      );
    }
  })().catch(console.error);
});