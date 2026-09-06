#!/usr/bin/env python3
"""Refresh the static note article data; preserve the last snapshot on failure."""
import argparse
from email.utils import parsedate_to_datetime
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

MAX_BYTES = 5 * 1024 * 1024
MEDIA = '{http://search.yahoo.com/mrss/}'


def parse_articles(raw):
    root = ET.fromstring(raw)
    items = root.findall('./channel/item')
    if not items:
        raise ValueError('RSS contains no articles; keeping the previous snapshot')
    articles = []
    seen = set()
    for item in items:
        def text(name):
            return (item.findtext(name) or '').strip()
        title, link, published = text('title'), text('link'), text('pubDate')
        if not title or urlsplit(link).scheme not in ('http', 'https') or not urlsplit(link).netloc:
            raise ValueError('RSS item has no title or valid article URL')
        date = parsedate_to_datetime(published)
        if date.tzinfo is None:
            raise ValueError('RSS publication date has no timezone')
        thumbnail = item.find(MEDIA + 'thumbnail')
        image = '' if thumbnail is None else (thumbnail.get('url') or thumbnail.text or '').strip()
        if image and (urlsplit(image).scheme not in ('http', 'https') or not urlsplit(image).netloc):
            raise ValueError('RSS thumbnail URL is invalid')
        if link in seen:
            continue
        seen.add(link)
        articles.append(dict(title=title, url=link, publishedAt=published,
                             description=text('description'), thumbnail=image))
    return articles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default=os.environ.get('NOTE_RSS_URL') or 'https://note.com/flair_agency_biz/rss')
    parser.add_argument('--input', type=Path, help='Read an RSS fixture instead of the network')
    parser.add_argument('--output', type=Path, default=Path('src/_data/note_articles.json'))
    args = parser.parse_args()
    if args.input:
        raw = args.input.read_bytes()
    else:
        if urlsplit(args.url).scheme not in ('http', 'https'):
            raise ValueError('RSS URL must use HTTP or HTTPS')
        with urlopen(Request(args.url, headers={'User-Agent': 'Flair-Corporate-Site/1.0'}), timeout=30) as response:
            raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError('RSS exceeds the 5 MiB limit')
    articles = parse_articles(raw)
    output = json.dumps(articles, ensure_ascii=False, indent=2) + '\n'
    if args.output.exists() and args.output.read_text(encoding='utf-8') == output:
        print(f'Unchanged: {len(articles)} articles')
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=args.output.parent,
                                         suffix='.tmp', delete=False) as handle:
            name = handle.name
            handle.write(output)
        os.replace(name, args.output)
    finally:
        if name and Path(name).exists():
            Path(name).unlink()
    print(f'Updated: {len(articles)} articles')


if __name__ == '__main__':
    main()
