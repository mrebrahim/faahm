# Deploying فاهم on aaPanel

> **Already set up and running** (21 Nov 2026): PM2 process `faahm` on port
> **3001**, nginx vhost at `/www/server/panel/vhost/nginx/faahm.com.conf`.
> For routine updates you want **[UPDATE-SITE.md](./UPDATE-SITE.md)**, not
> this page. This one is the first-time setup and the reference.
>
> Two things that actually bit us, both fixed in the script but worth
> knowing: port 3000 was already held by the old container, so the app runs
> on 3001 (`PORT=3001`); and nginx kept proxying to the OLD backend on 3300
> long after the new one was live, which looks exactly like "the deploy
> didn't work" — always check `proxy_pass` before debugging the app.

The script does the build and the swap. aaPanel does the domain, the TLS
certificate and the reverse proxy. This page is the half aaPanel owns.

Target: `faahm.com` → nginx on the server → Next.js on `127.0.0.1:3000`.

## Why not Docker here

The repo has a working `Dockerfile` and that is still the better option on a
host built around Docker. On aaPanel the Node.js + PM2 path is less machinery
for the same result: aaPanel already manages nginx and certificates, and PM2
is already how it keeps Node processes alive. The app builds to
`output: 'standalone'`, so what actually runs is a single `node server.js`
either way.

## One-time setup

**0. Clone the repo.** The script lives inside it, so it has to be on the
server before anything else:

```bash
mkdir -p /www/wwwroot/faahm
git clone https://github.com/mrebrahim/faahm.git /www/wwwroot/faahm/src
```


**1. Node 18 or newer.** aaPanel → App Store → Node.js version manager → install 20
and make it the command-line default. Next.js 14 refuses to build on 16.
Anything from 18 up works; 24 builds fine.

**2. Put the env file at `/www/wwwroot/faahm/faahm.env`.**

Start from `.env.example`. It needs BOTH groups — this is the step that
breaks deployments:

| Group | When it is read | Breaks like this if missing |
|---|---|---|
| `NEXT_PUBLIC_*` | **Build time**, inlined into the browser bundle | Site loads, nothing connects to Supabase, login silently fails |
| Everything else | **Run time**, from the process environment | Site loads, every course/admin page is empty or 500 |

The second group is the one people forget. `SUPABASE_SERVICE_ROLE_KEY` alone
is behind every server-side read on the site.

The file must be readable only by root:

```bash
chmod 600 /www/wwwroot/faahm/faahm.env
```

**3. Give git access to the private repo.** Either a deploy key on the server,
or clone once over HTTPS with a token. The script does not handle credentials.

## Deploy

```bash
bash /www/wwwroot/faahm/src/deploy-aapanel.sh            # origin/main
bash /www/wwwroot/faahm/src/deploy-aapanel.sh ca4b93f    # a specific commit
```

It fetches, builds, assembles the standalone bundle, publishes it to
`releases/<timestamp>-<sha>/`, points `current` at it, restarts PM2 and then
**checks the server actually answers 200** before calling it done. If it
doesn't, the script prints the logs and stops — the previous release is still
on disk, untouched.

## The reverse proxy

aaPanel → Website → add `faahm.com` (no PHP) → open it → **Reverse proxy** →
add:

- Target URL: `http://127.0.0.1:3000`
- Send domain: `$host`
- Enable cache: **off** — Next.js sets its own cache headers per route, and
  an nginx cache in front of them serves one user's dashboard to another.

Then **SSL → Let's Encrypt → apply**, and turn on *Force HTTPS*.

### Stripe webhooks need the raw body

`/api/stripe/webhook` verifies a signature over the exact bytes Stripe sent.
If nginx rewrites or buffers the body the signature check fails and every
purchase stops being fulfilled. In the site's nginx config, inside the
proxy `location`:

```nginx
proxy_request_buffering off;
client_max_body_size 10m;
```

After deploying, confirm it in the Stripe dashboard: Developers → Webhooks →
the endpoint should show recent 200s, not 400s.

## Rollback

Releases are kept (the last five). Point `current` at an older one and
restart:

```bash
ls -1dt /www/wwwroot/faahm/releases/*/     # newest first
ln -sfn /www/wwwroot/faahm/releases/<older> /www/wwwroot/faahm/current
pm2 restart faahm
```

No rebuild — the older bundle is already built.

## Checking a deploy landed

```bash
pm2 list                 # faahm should be "online", restarts not climbing
pm2 logs faahm --lines 50
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login
```

Then from outside, confirm the thing you actually shipped is live — the
version string is not enough, check a real behaviour. For the current build:

```
https://faahm.com/course/vibe-coding?code=VIBE20
```

should show **$20** struck through from $60. Without the code it should show
$60.

## Keeping it running after a reboot

`pm2 save` runs inside the script, but the boot hook is a one-time step:

```bash
pm2 startup systemd -u root --hp /root   # run the line it prints back
```

Skip it and the site stays down after the first server restart.
