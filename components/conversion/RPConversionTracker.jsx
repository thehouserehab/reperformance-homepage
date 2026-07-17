'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  normalizeAttribution,
  sanitizeAttributionPath,
  sanitizeAttributionToken,
  sanitizeReferrerHost,
} from '../../lib/rpAttribution';

const ATTRIBUTION_KEY = 'rp:conversion:attribution:v1';
const SESSION_ID_KEY = 'rp:conversion:session:v1';
const LAST_PATH_KEY = 'rp:conversion:last-path:v1';

function readSessionValue(key) {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch (_) {
    return '';
  }
}

function writeSessionValue(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (_) {
    // Tracking must never block public navigation or form submission.
  }
}

function getSessionId() {
  const existing = readSessionValue(SESSION_ID_KEY);
  if (existing) return existing;

  const generated = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  writeSessionValue(SESSION_ID_KEY, generated);
  return generated;
}

function readStoredAttribution() {
  try {
    return JSON.parse(readSessionValue(ATTRIBUTION_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function getReferrer() {
  if (!document.referrer) return { host: '', path: '', external: false };

  try {
    const url = new URL(document.referrer);
    return {
      host: sanitizeReferrerHost(url.host),
      path: url.origin === window.location.origin ? sanitizeAttributionPath(url.pathname) : '',
      external: url.origin !== window.location.origin,
    };
  } catch (_) {
    return { host: '', path: '', external: false };
  }
}

function inferReferrerTouch(referrer) {
  const host = referrer.host;
  if (!referrer.external || !host) return { source: 'direct', medium: 'none' };
  if (host.includes('blog.naver.com')) return { source: 'naver-blog', medium: 'referral' };
  if (host.includes('naver.com')) return { source: 'naver', medium: 'organic' };
  if (host.includes('instagram.com')) return { source: 'instagram', medium: 'referral' };
  if (host.includes('google.')) return { source: 'google', medium: 'organic' };
  if (host.includes('daum.net')) return { source: 'daum', medium: 'organic' };
  return { source: host, medium: 'referral' };
}

function getExplicitTouch(searchParams) {
  const source = sanitizeAttributionToken(searchParams.get('utm_source') || searchParams.get('source'));
  const medium = sanitizeAttributionToken(searchParams.get('utm_medium') || searchParams.get('medium'));
  const campaign = sanitizeAttributionToken(searchParams.get('utm_campaign') || searchParams.get('campaign'));
  const content = sanitizeAttributionToken(searchParams.get('utm_content'));

  return {
    source,
    medium,
    campaign,
    content,
    explicit: Boolean(source || medium || campaign || content),
  };
}

function buildAttribution(pathname) {
  const path = sanitizeAttributionPath(pathname) || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const referrer = getReferrer();
  const explicit = getExplicitTouch(searchParams);
  const inferred = inferReferrerTouch(referrer);
  const previous = readStoredAttribution();
  const currentTouch = {
    source: explicit.source || inferred.source,
    medium: explicit.medium || inferred.medium,
    campaign: explicit.campaign,
    utmContent: explicit.content,
  };
  const shouldRefreshLatest = explicit.explicit || referrer.external || !previous;
  const previousPath = readSessionValue(LAST_PATH_KEY) || referrer.path;

  const next = {
    sessionId: getSessionId(),
    firstSource: previous?.firstSource || currentTouch.source,
    firstMedium: previous?.firstMedium || currentTouch.medium,
    firstCampaign: previous?.firstCampaign || currentTouch.campaign,
    firstLandingPath: previous?.firstLandingPath || path,
    latestSource: shouldRefreshLatest ? currentTouch.source : previous?.latestSource,
    latestMedium: shouldRefreshLatest ? currentTouch.medium : previous?.latestMedium,
    latestCampaign: shouldRefreshLatest ? currentTouch.campaign : previous?.latestCampaign,
    utmContent: shouldRefreshLatest ? currentTouch.utmContent : previous?.utmContent,
    applicationReferrerPath: path === '/apply' ? previousPath : previous?.applicationReferrerPath,
    campaignCode: sanitizeAttributionToken(searchParams.get('campaign_code') || previous?.campaignCode),
    referralCode: sanitizeAttributionToken(searchParams.get('ref') || searchParams.get('referral') || previous?.referralCode),
    partnerCode: sanitizeAttributionToken(searchParams.get('partner') || previous?.partnerCode),
    qrCode: sanitizeAttributionToken(searchParams.get('qr') || previous?.qrCode),
    referrerHost: referrer.external ? referrer.host : previous?.referrerHost,
    maxAffiliation: ['1', 'true', 'yes', 'max'].includes(String(searchParams.get('max') || '').toLowerCase())
      || sanitizeAttributionToken(searchParams.get('partner') || previous?.partnerCode).includes('max')
      || Boolean(previous?.maxAffiliation),
  };

  const normalized = normalizeAttribution(next);
  writeSessionValue(ATTRIBUTION_KEY, JSON.stringify(normalized));
  writeSessionValue(LAST_PATH_KEY, path);
  return normalized;
}

function writeApplicationFields(attribution) {
  const form = document.querySelector('form[data-rp-application-form]');
  if (!form) return;

  const fields = {
    attributionSessionId: attribution.sessionId,
    attributionFirstSource: attribution.firstSource,
    attributionFirstMedium: attribution.firstMedium,
    attributionFirstCampaign: attribution.firstCampaign,
    attributionFirstLandingPath: attribution.firstLandingPath,
    attributionLatestSource: attribution.latestSource,
    attributionLatestMedium: attribution.latestMedium,
    attributionLatestCampaign: attribution.latestCampaign,
    attributionUtmContent: attribution.utmContent,
    attributionApplicationReferrerPath: attribution.applicationReferrerPath,
    attributionCampaignCode: attribution.campaignCode,
    attributionReferralCode: attribution.referralCode,
    attributionPartnerCode: attribution.partnerCode,
    attributionQrCode: attribution.qrCode,
    attributionReferrerHost: attribution.referrerHost,
    attributionMaxAffiliation: attribution.maxAffiliation ? 'yes' : 'no',
  };

  for (const [name, value] of Object.entries(fields)) {
    let input = form.elements.namedItem(name);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = String(value || '');
  }
}

function sendEvent(eventName, pagePath, attribution, serviceKey = '') {
  const payload = JSON.stringify({ eventName, pagePath, serviceKey, attribution });

  fetch('/api/rp/conversion-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function inferServiceKey(url) {
  const requested = url.searchParams.get('service') || '';
  if (requested) return requested;
  if (url.pathname.startsWith('/services/')) return url.pathname.split('/')[2] || '';
  return url.pathname.startsWith('/pe-exam') ? 'pe-exam' : '';
}

function isTrackablePath(pathname) {
  return !['/admin', '/account', '/login', '/api'].some((prefix) => pathname.startsWith(prefix));
}

export default function RPConversionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrackablePath(pathname)) return undefined;

    const attribution = buildAttribution(pathname);
    writeApplicationFields(attribution);

    const viewKey = `rp:conversion:view:${pathname}`;
    if (!readSessionValue(viewKey)) {
      sendEvent(pathname === '/apply' ? 'application_view' : 'page_view', pathname, attribution, inferServiceKey(new URL(window.location.href)));
      writeSessionValue(viewKey, '1');
    }

    function handleClick(event) {
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname === '/apply') {
          sendEvent('consultation_cta_click', pathname, attribution, inferServiceKey(url));
        }
      } catch (_) {}
    }

    function handleFormStart(event) {
      if (!event.target?.closest?.('form[data-rp-application-form]')) return;
      const startKey = 'rp:conversion:application-started';
      if (readSessionValue(startKey)) return;
      sendEvent('application_started', '/apply', attribution, inferServiceKey(new URL(window.location.href)));
      writeSessionValue(startKey, '1');
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('focusin', handleFormStart, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('focusin', handleFormStart, true);
    };
  }, [pathname]);

  return null;
}
