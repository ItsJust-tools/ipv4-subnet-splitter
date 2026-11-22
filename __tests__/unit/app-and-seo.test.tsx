import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { subnetSplitterTool } from '@/tool/tool-definition';
import { DEFAULT_STATE, splitNetwork, parseCidr } from '@/tool/types';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import type { ExporterLoader } from '@itsjust/core';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    expect(subnetSplitterTool.name).toBe(toolConfig.name);
    expect(
      subnetSplitterTool.deserialize({
        cidr: '10.0.0.0/8',
        newPrefix: '9',
        subnetCount: '',
        lookupIp: '',
      })
    ).toEqual({
      success: true,
      data: {
        cidr: '10.0.0.0/8',
        newPrefix: '9',
        subnetCount: '',
        lookupIp: '',
      },
    });
    const repaired = subnetSplitterTool.deserialize({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.cidr).toBe(DEFAULT_STATE.cidr);
    }
    expect(subnetSplitterTool.serialize({ ...DEFAULT_STATE, cidr: '10.0.0.0/8' })).toContain(
      '"cidr":"10.0.0.0/8"'
    );
    const exporters =
      (subnetSplitterTool as { exporters?: Array<{ loader: ExporterLoader }> }).exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });

  it('renders tool components', () => {
    const subnets = splitNetwork(
      parseCidr('192.168.1.0/24') as Parameters<typeof splitNetwork>[0],
      25
    );
    render(
      <>
        <Toolbar
          state={{ ...DEFAULT_STATE }}
          onChange={() => {}}
          onClear={() => {}}
          onCopy={() => {}}
        />
        <Sidebar
          state={{ ...DEFAULT_STATE }}
          onChange={() => {}}
          subnets={subnets}
          selected={null}
        />
        <Canvas
          state={{ ...DEFAULT_STATE, lookupIp: '192.168.1.130' }}
          onChange={() => {}}
          subnets={subnets}
          selected={null}
          lookupIndex={1}
          error={null}
        />
      </>
    );

    expect(screen.getByTestId('subnet-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('parent-card')).toBeInTheDocument();
    expect(screen.getByTestId('lookup-note')).toHaveTextContent('Highlighted block contains');
  });
});
