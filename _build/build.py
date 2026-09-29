"""Builds the site from _build/pages/*.html into the repo root.

Each page file starts with two comment lines (title, description) followed by the
page's <main> content. The shared header and footer live here, so a change to the
address or the navigation is made once. Run: python3 _build/build.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, '_build', 'pages')
EMAIL = 'emrsimsek15@gmail.com'
ADDRESS = '71&ndash;75 Shelton Street, Covent Garden, London WC2H&nbsp;9JQ, United Kingdom'
YEAR = '2026'


def render(rel, title, desc, body):
    # 404 is served from any depth, so it uses absolute paths.
    r = '/' if rel == '404.html' else '../' * rel.count('/')
    near = rel.startswith('near/')
    body = body.replace('{{R}}', r).replace('{{EMAIL}}', EMAIL).replace('{{ADDRESS}}', ADDRESS)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#F4F3EF">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://svartlimited.com/assets/logo-black.png">
<link rel="icon" type="image/png" href="{r}assets/favicon.png">
<link rel="apple-touch-icon" href="{r}assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{r}assets/site.css">
<script>document.documentElement.classList.add('js')</script>
<script src="{r}assets/site.js" defer></script>
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{r}index.html" aria-label="Svart Limited home"><img src="{r}assets/mark-black.png" alt="" width="26" height="40"><span>Svart Limited</span></a>
    <nav class="nav" aria-label="Main">
      <a class="hide-sm" href="{r}index.html#about">About</a>
      <a href="{r}near/index.html"{' aria-current="page"' if near else ''}>NEAR</a>
      <a class="nav-cta" href="{r}index.html#contact">Contact</a>
    </nav>
  </div>
</header>
<main>
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-brand">
      <img src="{r}assets/logo-white.png" alt="Svart Limited" width="220" height="72">
      <address>Svart Limited<br>{ADDRESS}</address>
    </div>
    <nav aria-label="Footer">
      <a href="{r}near/index.html">NEAR</a>
      <a href="{r}near/support.html">Support</a>
      <a href="{r}near/privacy.html">NEAR Privacy Policy</a>
      <a href="{r}privacy.html">Website Privacy</a>
      <a href="mailto:{EMAIL}">{EMAIL}</a>
    </nav>
  </div>
  <div class="wrap footer-base">&copy; {YEAR} Svart Limited. All rights reserved.</div>
</footer>
</body>
</html>
'''


for dirpath, _, files in os.walk(PAGES):
    for f in files:
        src = os.path.join(dirpath, f)
        rel = os.path.relpath(src, PAGES)
        text = open(src).read()
        title = re.search(r'<!--title: (.*?)-->', text).group(1)
        desc = re.search(r'<!--desc: (.*?)-->', text).group(1)
        body = re.sub(r'<!--(title|desc): .*?-->\n', '', text).rstrip('\n')
        out = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w').write(render(rel, title, desc, body))
        print('built', rel)
