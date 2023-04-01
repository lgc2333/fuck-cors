/* eslint-disable no-restricted-globals */

const INTRO_HTML = `
<html>
  <head>
    <meta charset="utf-8" />
    <title>CORS，我测你码</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/code-prettify@0.1.0/styles/prettify.css"
    />
    <style>
      html {
        background-position: center;
        background-repeat: no-repeat;
        background-image: url('https://pixiv.re/104117310.png');
        background-size: cover;
      }

      code,
      pre {
        font-family: 'JetBrains Mono', 'Cascadia Mono', 'Consolas';
        background-color: rgb(220, 220, 220, 0.3);
        border: 1px solid rgb(120, 120, 120, 0.3) !important;
        border-radius: 5px;
      }

      pre {
        text-align: left;
      }

      a:link,
      a:visited {
        color: black;
        text-decoration-color: rgb(0, 0, 0, 0.3);
      }

      a:hover {
        color: darkslategray;
      }

      .flex {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }

      #box {
        padding: 10px 30px;
        text-align: center;
        border-radius: 10px;
        box-shadow: 0px 0px 5px 5px rgb(0, 0, 0, 0.2);
        background: rgb(255, 255, 255, 0.5);
        backdrop-filter: blur(3px);
      }
    </style>
  </head>

  <body>
    <div class="flex">
      <div id="box">
        <h1>CORS，我测你码</h1>

        <p>
          狗比 CORS 阻挡了我们在前端访问众多外部资源的权利<br />
          所以我用 Cloudflare Workers 搭建了一个 Fuck CORS 反代！
        </p>

        <p>你只需要使用这个域名替代源站域名，然后加上下面的 Header</p>

        <ul>
          <li><code lang="js">upstream-host</code> - 源站域名</li>
          <li>
            <code lang="js">real-referer</code>
            <i>(可选)</i> - 要传给源站的 Referer
          </li>
          <li>
            <code lang="js">real-origin</code>
            <i>(可选)</i> - 要传给源站的 Origin
          </li>
        </ul>

        <p>就可以愉快地到处 <code>fetch</code> 啦！</p>

        <p><b>使用例子</b></p>

        <pre class="prettyprint lang-js">
const url = 'https://fuck-cors.lgc2333.top/setu/v2';

async function fuckCors() {
  // 实际上访问的是 api.lolicon.app
  const resp = await fetch(url, {
    headers: { 'upstream-host': 'api.lolicon.app' },
  });
  const json = await resp.json();
  console.log(json);
}

fuckCors();</pre
        >

        <p>
          <small>
            Site By <a href="https://lgc2333.top">lgc2333</a> |
            <a href="https://github.com/lgc2333/fuck-cors">GitHub</a>
          </small>
        </p>
      </div>
    </div>
  </body>

  <script src="https://unpkg.com/showdown@2.1.0/dist/showdown.min.js"></script>
  <script src="https://unpkg.com/code-prettify@0.1.0/loader/run_prettify.js"></script>
</html>
`;

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
