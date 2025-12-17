import { hashCode } from './loader';
import { type SvgOptions } from './types';
import { dvi2html } from '@drgrice1/dvi2html';
import { Writable } from 'stream';

/**
 * Converts a DVI file to an SVG string.
 *
 * @param dvi The buffer containing the DVI file.
 * @param options The options.
 * @returns The SVG string.
 */
export async function dvi2svg(dvi: Uint8Array, options: SvgOptions = {}) {
  let html = '';

  async function* streamBuffer() {
    yield Buffer.from(dvi);
    return;
  }

  await dvi2html(
    streamBuffer(),
    new Writable({
      write(chunk) {
        html += chunk.toString();
      },
    }),
  );

  // {
  //   write: (chunk, encodeding) : boolean => {
  //     html = html + chunk.toString();
  //   },
  // });

  // Patch: Assign unique IDs to SVG elements to avoid conflicts when inlining multiple SVGs.
  const ids = html.match(/\bid="pgf[^"]*"/g);
  if (ids) {
    // Sort the ids from longest to shortest.
    ids.sort((a, b) => b.length - a.length);
    const hash = hashCode(html);

    for (const id of ids) {
      const pgfIdString = id.replace(/id="pgf(.*)"/, '$1');
      html = html.replaceAll('pgf' + pgfIdString, `pgf${hash}${pgfIdString}`);
    }
  }

  // Patch: Fixes symbols stored in the SOFT HYPHEN character (e.g. \Omega, \otimes) not being rendered
  // Replaces soft hyphens with ¬
  html = html.replaceAll('&#173;', '&#172;');
  return html;
}
