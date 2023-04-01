/* eslint-disable no-restricted-globals */

import { INTRO_HTML } from './intro';

export default {
  async fetch(request) {
    const { method, url: reqUrl, headers: reqHeaders } = request;

    if (method === 'OPTIONS') {
      const headers = new Headers();
      headers.set('access-control-allow-origin', '*');
      headers.set('access-control-allow-credentials', 'true');
      headers.set('access-control-allow-methods', '*');
      headers.set('access-control-allow-headers', '*');
      headers.set('access-control-expose-headers', '*');
      return new Response(null, { status: 200, headers });
    }

    const upstreamUrl = reqHeaders.get('upstream-host');
    if (!upstreamUrl) {
      return new Response(INTRO_HTML, {
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }

    const realReferer = reqHeaders.get('real-referer');
    const realOrigin = reqHeaders.get('real-origin');

    const proxyReqUrl = new URL(reqUrl);
    proxyReqUrl.host = upstreamUrl;
    const { hostname } = proxyReqUrl;
    const proxyReqUrlStr = proxyReqUrl.toString();

    const proxyReqHeaders = new Headers(reqHeaders);
    proxyReqHeaders.delete('origin');
    proxyReqHeaders.delete('referer');
    proxyReqHeaders.delete('upstream-url');
    proxyReqHeaders.delete('real-referer');
    proxyReqHeaders.delete('real-origin');
    if (realReferer) proxyReqHeaders.set('referer', realReferer);
    if (realOrigin) proxyReqHeaders.set('origin', realOrigin);

    const proxyResponse = await fetch(proxyReqUrlStr, {
      method,
      headers: proxyReqHeaders,
      body: request.body ? await request.arrayBuffer() : undefined,
    });

    const reqUpgrade = reqHeaders.get('Upgrade');
    if (reqUpgrade && reqUpgrade.toLowerCase() === 'websocket')
      return proxyResponse;

    const respHeaders = new Headers(proxyResponse.headers);
    respHeaders.set('access-control-allow-origin', '*');
    respHeaders.set('access-control-allow-credentials', 'true');
    respHeaders.set('access-control-allow-methods', '*');
    respHeaders.set('access-control-allow-headers', '*');
    respHeaders.set('access-control-expose-headers', '*');
    respHeaders.delete('content-security-policy');
    respHeaders.delete('content-security-policy-report-only');
    respHeaders.delete('clear-site-data');

    const ajax = respHeaders.get('x-pjax-url');
    if (ajax)
      respHeaders.set(
        'x-pjax-url',
        ajax.replace(`//${upstreamUrl}`, `//${hostname}`)
      );

    const { status, statusText } = proxyResponse;
    return new Response(await proxyResponse.arrayBuffer(), {
      status,
      statusText,
      headers: respHeaders,
    });
  },
} as ExportedHandler;
