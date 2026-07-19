import * as cheerio from 'cheerio';

import type { ExtractedProduct, ProductOption, ShippingInfo } from '../types';

const DEFAULT_SHIPPING: ShippingInfo = {
  method: '택배',
  fee: 0,
  estimatedDays: '2-3일',
};

/** Extract structured product data from crawled HTML. */
export function extractProductFromHtml(
  html: string,
  sourceUrl: string,
  extras?: { screenshotPath?: string; downloads?: string[]; loadTimeMs?: number },
): ExtractedProduct {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('[data-product-title]').attr('data-product-title')?.trim() ||
    $('#product-title, #title, h1.product-title, h1').first().text().trim() ||
    'Untitled Product';

  const priceRaw =
    $('[data-price]').attr('data-price') ||
    $('[itemprop="price"]').attr('content') ||
    $('.price, .product-price, [class*="price"]').first().text();
  const price = parsePrice(priceRaw);

  const brand =
    $('[data-brand]').attr('data-brand')?.trim() ||
    $('[itemprop="brand"]').text().trim() ||
    $('.brand, .product-brand').first().text().trim() ||
    'Unknown Brand';

  const category =
    $('[data-category]').attr('data-category')?.trim() ||
    $('[itemprop="category"]').text().trim() ||
    $('.category, .breadcrumb li:last-child').first().text().trim() ||
    'General';

  const description =
    $('[data-description]').attr('data-description')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('.description, .product-description, #description').first().text().trim() ||
    $('p.description').first().text().trim() ||
    '';

  const images = collectImages($, extras?.downloads ?? []);
  const options = collectOptions($);
  const shipping = collectShipping($);

  return {
    sourceUrl,
    title,
    price,
    currency: $('[data-currency]').attr('data-currency') ?? 'KRW',
    brand,
    category,
    description,
    images,
    options,
    shipping,
    rawHtmlLength: html.length,
    screenshotPath: extras?.screenshotPath,
  };
}

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d.]/g, '');
  const parsed = parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collectImages(
  $: cheerio.CheerioAPI,
  downloads: string[],
): string[] {
  const urls = new Set<string>(downloads);

  $('[data-image], [data-product-image]').each((_, el) => {
    const src = $(el).attr('data-image') ?? $(el).attr('data-product-image');
    if (src) urls.add(src);
  });

  $('img.product-image, img[data-product], #product-image, .gallery img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) urls.add(src);
  });

  return [...urls];
}

function collectOptions($: cheerio.CheerioAPI): ProductOption[] {
  const options: ProductOption[] = [];

  $('[data-options] option, .product-option').each((_, el) => {
    const name = $(el).attr('data-option-name') ?? $(el).attr('name') ?? 'Option';
    const value = $(el).attr('value') ?? $(el).text().trim();
    if (!value) return;

    const existing = options.find((o) => o.name === name);
    if (existing) {
      if (!existing.values.includes(value)) existing.values.push(value);
    } else {
      options.push({ name, values: [value] });
    }
  });

  $('[data-option-group]').each((_, group) => {
    const name = $(group).attr('data-option-group') ?? 'Option';
    const values: string[] = [];
    $(group)
      .find('[data-option-value]')
      .each((__, el) => {
        const v = $(el).attr('data-option-value') ?? $(el).text().trim();
        if (v) values.push(v);
      });
    if (values.length) options.push({ name, values });
  });

  return options;
}

function collectShipping($: cheerio.CheerioAPI): ShippingInfo {
  const method =
    $('[data-shipping-method]').attr('data-shipping-method')?.trim() ||
    $('.shipping-method').first().text().trim() ||
    DEFAULT_SHIPPING.method;

  const feeRaw =
    $('[data-shipping-fee]').attr('data-shipping-fee') ||
    $('.shipping-fee').first().text();
  const fee = parsePrice(feeRaw);

  const estimatedDays =
    $('[data-shipping-days]').attr('data-shipping-days')?.trim() ||
    $('.shipping-days').first().text().trim() ||
    DEFAULT_SHIPPING.estimatedDays;

  return { method, fee, estimatedDays };
}
