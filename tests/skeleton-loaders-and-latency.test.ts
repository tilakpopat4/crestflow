import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

import {
  Skeleton,
  DashboardSkeleton,
  ClientsSkeleton,
  WorkLogSkeleton,
  InvoicesSkeleton,
  ReviewsSkeleton,
  ProfileSkeleton,
  BillingSkeleton,
  ClientPortalSkeleton,
  PublicProfileSkeleton,
  WorkspaceShellSkeleton
} from '../src/components/skeletons';

describe('Professional Skeleton Loaders & Latency Reduction Suite', () => {
  describe('1. Minimal & Professional Skeleton Components', () => {
    test('renders base Skeleton with neutral professional palette', () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Skeleton, { className: 'h-4 w-24' })
      );
      assert.ok(html.includes('animate-pulse'), 'Skeleton must have gentle pulse');
      assert.ok(html.includes('bg-slate-200'), 'Skeleton must use neutral slate palette');
      assert.ok(!html.includes('gradient'), 'Skeleton must not have flashy gradients per GEMINI.md');
      assert.ok(!html.includes('purple') && !html.includes('pink'), 'Skeleton must avoid saturated neon/pastel tones');
    });

    test('renders DashboardSkeleton with structural metric cards, chart, and table rows', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(DashboardSkeleton));
      assert.ok(html.includes('Loading dashboard'));
      assert.ok(html.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'), 'Has 3-column metric cards');
      assert.ok(html.includes('h-64'), 'Has chart skeleton area');
    });

    test('renders ClientsSkeleton matching client cards grid', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(ClientsSkeleton));
      assert.ok(html.includes('Loading clients'));
      assert.ok(html.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), 'Has responsive client grid');
    });

    test('renders WorkLogSkeleton matching table rows and column headers', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(WorkLogSkeleton));
      assert.ok(html.includes('Loading work logs'));
      assert.ok(html.includes('grid-cols-12'), 'Has 12-column table grid structure');
    });

    test('renders InvoicesSkeleton with stats cards and invoice rows', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(InvoicesSkeleton));
      assert.ok(html.includes('Loading invoices'));
      assert.ok(html.includes('grid-cols-2 lg:grid-cols-4'), 'Has 4 invoice summary cards');
    });

    test('renders ReviewsSkeleton with average rating and feedback cards', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(ReviewsSkeleton));
      assert.ok(html.includes('Loading reviews'));
    });

    test('renders ProfileSkeleton with identity card and form settings grid', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(ProfileSkeleton));
      assert.ok(html.includes('Loading profile'));
    });

    test('renders BillingSkeleton with active membership card and payment history', () => {
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(BillingSkeleton));
      assert.ok(html.includes('Loading billing'));
    });

    test('renders ClientPortalSkeleton and PublicProfileSkeleton seamlessly', () => {
      const portalHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(ClientPortalSkeleton));
      assert.ok(portalHtml.includes('Loading client portal'));

      const publicHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(PublicProfileSkeleton));
      assert.ok(publicHtml.includes('Loading profile'));
    });

    test('renders WorkspaceShellSkeleton with sidebar rail, global header, and content body', () => {
      const shellHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(WorkspaceShellSkeleton));
      assert.ok(shellHtml.includes('<aside'), 'Includes sidebar rail skeleton');
      assert.ok(shellHtml.includes('<header'), 'Includes global header skeleton');
      assert.ok(shellHtml.includes('<main'), 'Includes main body skeleton');
    });
  });

  describe('2. Latency Reduction & Offline Persistence Architecture', () => {
    test('src/firebase.ts configures persistentLocalCache and removes startup connection blocking', () => {
      const firebaseContent = fs.readFileSync(path.join(process.cwd(), 'src/firebase.ts'), 'utf-8');
      assert.ok(
        firebaseContent.includes('persistentLocalCache'),
        'Firestore must be configured with persistentLocalCache for instantaneous data loading'
      );
      assert.ok(
        firebaseContent.includes('persistentMultipleTabManager'),
        'Firestore must use persistentMultipleTabManager for multi-tab synchronization'
      );
      // Verify testFirestoreConnection() is not executed on module load
      assert.ok(
        !firebaseContent.trim().endsWith('testFirestoreConnection();'),
        'src/firebase.ts must not call testFirestoreConnection() on module load'
      );
    });

    test('src/hooks/useFirestore.ts implements local caching and auto-retry on network disconnect', () => {
      const hookContent = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useFirestore.ts'), 'utf-8');
      assert.ok(
        hookContent.includes('crestflow_cache_'),
        'useFirestore must use local cache key to seed data immediately'
      );
      assert.ok(
        hookContent.includes('retryAttempt') || hookContent.includes('retryTimer'),
        'useFirestore must implement automatic retry for network disconnects'
      );
    });

    test('src/App.tsx displays WorkspaceShellSkeleton during initial sync instead of spinner', () => {
      const appContent = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
      assert.ok(
        appContent.includes('<WorkspaceShellSkeleton />'),
        'App.tsx must render WorkspaceShellSkeleton instead of full-screen spinning loader'
      );
      assert.ok(
        !appContent.includes('isBlocked === null'),
        'App.tsx must not block UI waiting for isBlocked === null'
      );
    });

    test('src/components/layout/AppRouterView.tsx provides tailored page skeletons for Suspense fallbacks', () => {
      const routerViewContent = fs.readFileSync(
        path.join(process.cwd(), 'src/components/layout/AppRouterView.tsx'),
        'utf-8'
      );
      assert.ok(
        routerViewContent.includes('getRouteSkeleton'),
        'AppRouterView must select skeleton matching the current route'
      );
      assert.ok(
        routerViewContent.includes('ClientsSkeleton') && routerViewContent.includes('InvoicesSkeleton'),
        'AppRouterView must provide specialized skeletons'
      );
    });
  });

  describe('3. Image Loading Optimization', () => {
    test('user avatars and images include referrerPolicy="no-referrer" and decoding="async"', () => {
      const headerContent = fs.readFileSync(path.join(process.cwd(), 'src/components/GlobalHeader.tsx'), 'utf-8');
      assert.ok(
        headerContent.includes('referrerPolicy="no-referrer"'),
        'GlobalHeader avatar must include referrerPolicy="no-referrer" to prevent Google image blocks'
      );
      assert.ok(
        headerContent.includes('decoding="async"'),
        'GlobalHeader avatar must use decoding="async"'
      );

      const clientsContent = fs.readFileSync(path.join(process.cwd(), 'src/components/ClientsTab.tsx'), 'utf-8');
      assert.ok(
        clientsContent.includes('loading="lazy"'),
        'ClientsTab client logo must use loading="lazy"'
      );
      assert.ok(
        clientsContent.includes('decoding="async"'),
        'ClientsTab client logo must use decoding="async"'
      );
    });
  });
});
