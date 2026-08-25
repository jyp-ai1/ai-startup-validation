import https from 'node:https';

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          redirects < 5 &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).toString();
          resolve(get(next, redirects + 1));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            url,
            body: Buffer.concat(chunks).toString('utf8'),
            location: res.headers.location,
          }),
        );
      })
      .on('error', reject);
  });
}

const tip = 'https://ai-startup-validation-tau.vercel.app';
const preview =
  'https://ai-startup-validation-9kcdl9gzl-jyp-ai1s-projects.vercel.app';

for (const base of [tip, preview]) {
  const home = await get(`${base}/`);
  const ws = await get(
    `${base}/ko/workspace?demo=guided&fresh=1&forceReviewError=1`,
  );
  const urls = [
    ...new Set(
      [...(home.body + ws.body).matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map(
        (m) => m[0],
      ),
    ),
  ];
  let foundForce = false;
  let foundRetry = false;
  for (const u of urls.slice(0, 100)) {
    const chunk = await get(`${base}${u}`);
    if (chunk.body.includes('forceReviewError')) foundForce = true;
    if (chunk.body.includes('review-start-retry')) foundRetry = true;
  }
  console.log(
    JSON.stringify(
      {
        base,
        homeStatus: home.status,
        wsStatus: ws.status,
        wsLen: ws.body.length,
        wsSnippet: ws.body.slice(0, 120),
        chunkCount: urls.length,
        foundForce,
        foundRetry,
      },
      null,
      2,
    ),
  );
}
