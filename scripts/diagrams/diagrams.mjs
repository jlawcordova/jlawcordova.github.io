// The blog's diagrams, redrawn in the design system's diagram style
// (scripts/diagrams/kit.mjs). Each entry is the PNG a post embeds and the
// function that draws it. scripts/diagrams/render.mjs writes them.

import { actor, graph, pack, sequence, svg, table, usecase } from './kit.mjs';

const BROWSER = { id: 'browser', name: 'Browser', kind: 'client' };
const IDENTITY = { id: 'identity', name: 'Identity Server', kind: 'server' };
const RESOURCE = { id: 'resource', name: 'Resource Server', kind: 'server' };
const SESSION = { id: 'session', name: 'Session', kind: 'store' };

const CLIENT = { id: 'client', name: 'Client', kind: 'client' };
const API = { id: 'api', name: 'API', kind: 'server' };
const CACHE = { id: 'cache', name: 'In-Memory Cache', kind: 'cache' };
const DISK = { id: 'disk', name: 'Disk Database', kind: 'database' };

/** @type {{ file: string, draw: () => string | Promise<string> }[]} */
export const DIAGRAMS = [
  // JWT for authorization in microservice-architectured systems
  {
    file: 'static/public/2020-12-05-monolithic-authorization.png',
    draw: () => sequence([BROWSER, { id: 'server', name: 'Server', kind: 'server' }, SESSION], [
      { section: 'Authentication' },
      { from: 'browser', to: 'server', text: 'POST /authentication' },
      { from: 'server', to: 'session', text: 'Save Session' },
      { from: 'server', to: 'browser', text: 'Session ID', back: true },
      { section: 'Retrieving Resources' },
      { from: 'browser', to: 'server', text: 'GET /resource (Cookie: SessionID)', accent: true },
    ], { gap: 230 }),
  },
  {
    file: 'static/public/2020-12-05-sessions-in-microservices.png',
    draw: () => sequence([BROWSER, IDENTITY, RESOURCE, SESSION], [
      { section: 'Authentication' },
      { from: 'browser', to: 'identity', text: 'POST /authentication' },
      { from: 'identity', to: 'session', text: 'Save Session' },
      { from: 'identity', to: 'browser', text: 'Session ID', back: true },
      { section: 'Retrieving Resources' },
      { from: 'browser', to: 'resource', text: 'GET /resource (Cookie: Session ID)' },
      { from: 'resource', to: 'session', text: 'Validate Session ID', accent: true },
      { from: 'session', to: 'resource', text: 'Validation', back: true },
      { from: 'resource', to: 'browser', text: 'Resource', back: true },
    ], { gap: 180 }),
  },
  {
    file: 'static/public/2020-12-05-microservices-JWT.png',
    draw: () => sequence([BROWSER, IDENTITY, RESOURCE], [
      { section: 'Authentication' },
      { from: 'browser', to: 'identity', text: 'POST /authentication' },
      { self: 'identity', text: 'Generate/Sign JWT' },
      { from: 'identity', to: 'browser', text: 'JWT', back: true },
      { section: 'Retrieving Resources' },
      { from: 'browser', to: 'resource', text: 'GET /resource (Authorization: bearer JWT)' },
      { self: 'resource', text: 'Validate JWT', accent: true },
      { from: 'resource', to: 'browser', text: 'Resource', back: true },
    ], { gap: 200, pad: 60 }),
  },
  {
    file: 'static/public/2020-12-05-microservices-refresh-tokens.png',
    draw: () => sequence([BROWSER, { ...IDENTITY, extra: 90 }], [
      { section: 'Authentication' },
      { from: 'browser', to: 'identity', text: 'POST /authentication' },
      { self: 'identity', text: 'Generate/Sign JWT' },
      { self: 'identity', text: 'Save Refresh Token' },
      { from: 'identity', to: 'browser', text: 'JWT + Refresh Token', back: true },
      { section: 'Generating Another JWT' },
      { from: 'browser', to: 'identity', text: 'POST /authentication (bearer Refresh Token)', accent: true },
      { self: 'identity', text: 'Validate Refresh Token' },
      { self: 'identity', text: 'Generate/Sign JWT' },
      { from: 'identity', to: 'browser', text: 'JWT', back: true },
    ], { gap: 360 }),
  },
  {
    file: 'static/public/2020-12-05-revoking-refresh-tokens.png',
    draw: () => sequence([BROWSER, IDENTITY, { ...RESOURCE, extra: 70 }], [
      { section: 'Revoking Refresh Tokens' },
      { from: 'browser', to: 'identity', text: 'DELETE /refresh-token' },
      { self: 'identity', text: 'Delete Refresh Token' },
      { from: 'identity', to: 'resource', text: 'Broadcast Revoke' },
      { self: 'resource', text: 'Cache Revoked Token' },
      { section: 'Retrieving Resources with JWT from Revoked Refresh Token' },
      { from: 'browser', to: 'resource', text: 'GET /resource (Authorization: bearer JWT)' },
      { self: 'resource', text: 'Validate JWT' },
      { from: 'resource', to: 'browser', text: 'Status Code 401', back: true, accent: true },
    ], { gap: 210 }),
  },

  // Using caching to create performant APIs
  {
    file: 'static/public/2021-04-17/2021-04-17-lazy-loading-cache-hit.png',
    draw: () => sequence([CLIENT, API, CACHE, DISK], [
      { from: 'client', to: 'api', text: 'GET /user/1' },
      { group: 'Cache hit', from: 'api', to: 'cache', items: [
        { from: 'api', to: 'cache', text: '[1] Retrieve User 1' },
        { from: 'cache', to: 'api', text: '[1] User 1', back: true, accent: true },
      ] },
      { from: 'api', to: 'client', text: 'User 1', back: true },
    ], { gap: 170 }),
  },
  {
    file: 'static/public/2021-04-17/2021-04-17-lazy-loading-cache-miss.png',
    draw: () => sequence([CLIENT, API, CACHE, DISK], [
      { from: 'client', to: 'api', text: 'GET /user/1' },
      { group: 'Cache miss', from: 'api', to: 'cache', items: [
        { from: 'api', to: 'cache', text: '[1] Retrieve User 1' },
        { from: 'cache', to: 'api', text: '[1] Not Found', back: true },
      ] },
      { group: 'DB query', from: 'api', to: 'disk', items: [
        { from: 'api', to: 'disk', text: '[2] Retrieve User 1' },
        { from: 'disk', to: 'api', text: '[2] User 1', back: true },
      ] },
      { group: 'Cache save', from: 'api', to: 'cache', items: [
        { from: 'api', to: 'cache', text: '[3] Save User 1', accent: true },
        { from: 'cache', to: 'api', text: '[3] OK', back: true },
      ] },
      { from: 'api', to: 'client', text: 'User 1', back: true },
    ], { gap: 170 }),
  },
  {
    file: 'static/public/2021-04-17/2021-04-17-write-through.png',
    draw: () => sequence([CLIENT, API, CACHE, DISK], [
      { group: 'Write', from: 'client', to: 'disk', padLeft: 6, padRight: 18, items: [
        { from: 'client', to: 'api', text: 'POST /user/1' },
        { group: 'Disk save', from: 'api', to: 'disk', items: [
          { from: 'api', to: 'disk', text: '[2] Save User 1' },
          { from: 'disk', to: 'api', text: '[2] User 1', back: true },
        ] },
        { group: 'Cache save', from: 'api', to: 'cache', items: [
          { from: 'api', to: 'cache', text: '[1] Save User 1', accent: true },
          { from: 'cache', to: 'api', text: '[1] User 1', back: true },
        ] },
        { from: 'api', to: 'client', text: 'User 1', back: true },
      ] },
      { from: 'client', to: 'api', text: 'GET /user/1' },
      { group: 'Cache hit', from: 'api', to: 'cache', items: [
        { from: 'api', to: 'cache', text: '[1] Retrieve User 1' },
        { from: 'cache', to: 'api', text: '[1] User 1', back: true },
      ] },
      { from: 'api', to: 'client', text: 'User 1', back: true },
    ], { gap: 170 }),
  },
  {
    file: 'static/public/2021-04-17/2021-04-17-conditional-GET.png',
    draw: () => sequence([CLIENT, API, DISK], [
      { group: 'First GET', from: 'client', to: 'disk', items: [
        { from: 'client', to: 'api', text: 'GET /user/1' },
        { from: 'api', to: 'disk', text: 'Retrieve User 1' },
        { from: 'disk', to: 'api', text: 'User 1', back: true },
        { from: 'api', to: 'client', text: 'User 1; ETag: 4fc2a', back: true },
        { self: 'client', text: 'Cache User 1' },
      ] },
      { group: 'Conditional GET', from: 'client', to: 'api', items: [
        { from: 'client', to: 'api', text: 'GET /user/1; If-Not-Match: 4fc2a' },
        { from: 'api', to: 'client', text: '304 Not Modified', back: true, accent: true },
        { self: 'client', text: 'Use User 1 Cache' },
      ] },
    ], { gap: 260 }),
  },

  // Collecting and monitoring application metrics with the ELK stack
  {
    file: 'static/public/2020-12-12-elk-stack.png',
    draw: () => graph(900, 390, {
      frames: [{ x: 30, y: 40, w: 350, h: 320, label: 'Host' }, { x: 450, y: 40, w: 280, h: 320, label: 'Monitoring' }],
      nodes: [
        { id: 'app', x: 205, y: 105, name: 'Application', kind: 'app', w: 150 },
        { id: 'log', x: 205, y: 205, name: 'Application Log', kind: 'log file', w: 150 },
        { id: 'filebeat', x: 125, y: 310, name: 'Filebeat', kind: 'shipper', w: 130 },
        { id: 'logstash', x: 285, y: 310, name: 'Logstash', kind: 'pipeline', w: 130 },
        { id: 'elastic', x: 590, y: 310, name: 'Elasticsearch', kind: 'search', w: 150 },
        { id: 'kibana', x: 590, y: 175, name: 'Kibana', kind: 'dashboard', w: 150 },
      ],
      edges: [
        { from: 'app', out: 'b', to: 'log', in: 't' },
        { from: 'log', out: 'b', to: 'filebeat', in: 't', via: [[205, 255], [125, 255]] },
        { from: 'filebeat', to: 'logstash', accent: true },
        { from: 'logstash', to: 'elastic', accent: true },
        { from: 'elastic', out: 't', to: 'kibana', in: 'b', accent: true },
        { from: 'kibana', to: 'ops' },
      ],
      extra: [{ id: 'ops', ...actor(820, 149, 'Operations') }],
    }),
  },

  // Creating UML diagrams in Visual Studio Code
  {
    file: 'static/public/2021-02-14/2021-02-14-use-case-components.png',
    draw: () => svg(540, 160, [pack(30, 30, 320, 100, 'POS', { title: 'Point of Sale Terminal' }), actor(450, 30, 'Cashier').svg]),
  },
  {
    file: 'static/public/2021-02-14/2021-02-14-use-case-usecases.png',
    draw: () => svg(640, 270, [
      pack(30, 30, 450, 210, 'Point of Sale Terminal'),
      usecase(140, 105, 'Login').svg, usecase(340, 105, 'Check Product Info').svg, usecase(175, 190, 'Perform Checkout').svg,
      actor(560, 60, 'Cashier').svg,
    ]),
  },
  {
    file: 'static/public/2021-02-14/2021-02-14-use-case-connection.png',
    draw: () => graph(660, 320, {
      extra: [
        pack(30, 170, 600, 120, 'Point of Sale Terminal'),
        { id: 'cashier', ...actor(330, 20, 'Cashier') },
        { id: 'checkout', ...usecase(140, 245, 'Perform Checkout') },
        { id: 'product', ...usecase(330, 245, 'Check Product Info') },
        { id: 'login', ...usecase(520, 245, 'Login') },
      ],
      edges: ['checkout', 'product', 'login'].map((to) => ({ from: 'cashier', out: 'b', to, in: 't', straight: true })),
    }),
  },
  {
    file: 'static/public/2021-02-14/2021-02-14-use-case-diagram.png',
    draw: () => graph(560, 320, {
      extra: [
        pack(200, 30, 330, 260, 'Point of Sale Terminal'),
        { id: 'cashier', ...actor(80, 120, 'Cashier') },
        { id: 'login', ...usecase(365, 100, 'Login', { w: 190 }) },
        { id: 'product', ...usecase(365, 175, 'Check Product Info', { w: 190 }) },
        { id: 'checkout', ...usecase(365, 250, 'Perform Checkout', { w: 190 }) },
      ],
      edges: ['login', 'product', 'checkout'].map((to) => ({ from: 'cashier', to, straight: true })),
    }),
  },

  // Taking on the Cloud Resume Challenge
  {
    file: 'static/public/2023-07-16/crc-web-infra.png',
    draw: () => graph(600, 170, {
      frames: [{ x: 30, y: 40, w: 540, h: 100, label: 'Web' }],
      nodes: [
        { id: 'cdn', x: 175, y: 90, name: 'Download Distribution', kind: 'cloudfront', w: 210 },
        { id: 'bucket', x: 425, y: 90, name: 'Web Static Website Bucket', kind: 's3', w: 230 },
      ],
      edges: [{ from: 'cdn', to: 'bucket', accent: true }],
    }),
  },
  {
    file: 'static/public/2023-07-16/crc-app-infra.png',
    draw: () => graph(820, 250, {
      frames: [{ x: 30, y: 40, w: 760, h: 180, label: 'App' }],
      nodes: [
        { id: 'endpoint', x: 145, y: 95, name: 'View Count Endpoint', kind: 'api gateway', w: 190 },
        { id: 'lambda', x: 395, y: 95, name: 'Add View Count\nLambda Function', kind: 'lambda', w: 190 },
        { id: 'views', x: 660, y: 95, name: 'View Count Table', kind: 'dynamodb', w: 180 },
        { id: 'visitors', x: 660, y: 180, name: 'Visitor Table', kind: 'dynamodb', w: 180 },
      ],
      edges: [
        { from: 'endpoint', to: 'lambda', accent: true },
        { from: 'lambda', to: 'views', accent: true },
        { from: 'lambda', to: 'visitors', via: [[525, 95], [525, 180]] },
      ],
    }),
  },
  {
    file: 'static/public/2023-07-16/crc-db.png',
    draw: () => svg(500, 170, [table(30, 30, 'ViewCount', [['Id', 'S'], ['ViewCount', 'N']]), table(270, 30, 'Visitor', [['IP', 'S'], ['TTL', 'N']])]),
  },
  {
    file: 'static/public/2023-07-16/crc-infra.png',
    draw: () => graph(1080, 900, {
      frames: [{ x: 210, y: 40, w: 560, h: 120, label: 'Web' }, { x: 210, y: 220, w: 840, h: 650, label: 'App' }],
      nodes: [
        { id: 'client', x: 95, y: 190, name: 'Client', kind: 'browser', w: 120 },
        { id: 'cdn', x: 360, y: 100, name: 'Download\nDistribution', kind: 'cloudfront', w: 200 },
        { id: 'site', x: 620, y: 100, name: 'Web Static\nWebsite Bucket', kind: 's3', w: 200 },
        { id: 'endpoint', x: 360, y: 290, name: 'View Count\nEndpoint', kind: 'api gateway', w: 200, accent: true },
        { id: 'lambda', x: 620, y: 290, name: 'Add View Count\nLambda Function', kind: 'lambda', w: 200, accent: true },
        { id: 'views', x: 900, y: 290, name: 'View Count Table', kind: 'dynamodb', w: 200, accent: true },
        { id: 'visitors', x: 900, y: 380, name: 'Visitor Table', kind: 'dynamodb', w: 200 },
        { id: 'appbucket', x: 900, y: 470, name: 'App Bucket', kind: 's3', w: 200 },
        { id: 'apilogs', x: 360, y: 600, name: 'API Gateway Logs', kind: 'cloudwatch', w: 200 },
        { id: 'latency', x: 620, y: 600, name: 'API Gateway\nLatency Alarm', kind: 'alarm', w: 200 },
        { id: 'calls', x: 620, y: 700, name: 'API Gateway\nCall Count Alarm', kind: 'alarm', w: 200 },
        { id: 'errors', x: 620, y: 810, name: 'Lambda Error\nCount Alarm', kind: 'alarm', w: 200 },
        { id: 'lambdalogs', x: 360, y: 810, name: 'Lambda Function Logs', kind: 'cloudwatch', w: 200 },
        { id: 'email', x: 900, y: 700, name: 'Email Notification', kind: 'sns', w: 200 },
      ],
      edges: [
        { from: 'client', to: 'cdn', via: [[180, 190], [180, 100]] },
        { from: 'cdn', to: 'site' },
        { from: 'client', to: 'endpoint', via: [[180, 190], [180, 290]], accent: true },
        { from: 'endpoint', to: 'lambda', accent: true },
        { from: 'lambda', to: 'views', accent: true },
        { from: 'lambda', to: 'visitors', via: [[760, 290], [760, 380]] },
        { from: 'lambda', to: 'appbucket', via: [[760, 290], [760, 470]] },
        { from: 'endpoint', out: 'b', to: 'apilogs', in: 't' },
        { from: 'lambda', out: 'b', to: 'lambdalogs', in: 'l', via: [[620, 520], [230, 520], [230, 810]] },
        { from: 'latency', out: 'l', to: 'apilogs', in: 'r' },
        { from: 'calls', out: 'l', to: 'apilogs', in: 'b', via: [[360, 700]] },
        { from: 'errors', out: 'l', to: 'lambdalogs', in: 'r' },
        { from: 'latency', to: 'email', via: [[760, 600], [760, 700]] },
        { from: 'calls', to: 'email' },
        { from: 'errors', to: 'email', via: [[760, 810], [760, 700]] },
      ],
    }),
  },
  {
    file: 'static/public/2023-07-16/crc-ci-cd.png',
    draw: () => graph(1130, 560, {
      frames: [
        { x: 200, y: 40, w: 440, h: 260, label: 'GitHub' },
        { x: 840, y: 40, w: 260, h: 230, label: 'Production' },
        { x: 840, y: 310, w: 260, h: 230, label: 'Development' },
      ],
      nodes: [
        { id: 'devops', x: 95, y: 110, name: 'DevOps', kind: 'team', w: 110 },
        { id: 'repo', x: 300, y: 110, name: 'GitHub\nRepository', kind: 'repository', w: 150 },
        { id: 'main', x: 530, y: 110, name: 'Main Branch\nAction Runner', kind: 'runner', w: 170, accent: true },
        { id: 'pr', x: 530, y: 235, name: 'Pull Request\nAction Runner', kind: 'runner', w: 170 },
        { id: 'prod', x: 970, y: 110, name: 'Production\nAccount', kind: 'aws account', w: 200, accent: true },
        { id: 'prodstate', x: 970, y: 215, name: 'Production Terraform\nBackend Bucket', kind: 's3', w: 200 },
        { id: 'dev', x: 970, y: 380, name: 'Development\nAccount', kind: 'aws account', w: 200 },
        { id: 'devstate', x: 970, y: 485, name: 'Development Terraform\nBackend Bucket', kind: 's3', w: 200 },
      ],
      edges: [
        { from: 'devops', to: 'repo' },
        { from: 'repo', to: 'main', text: 'Push', at: [410, 102], accent: true },
        { from: 'repo', out: 'b', to: 'pr', via: [[300, 235]], text: 'Pull Request', at: [380, 227] },
        { from: 'main', to: 'prod', text: 'Resource Provisioning', at: [775, 102], accent: true },
        { from: 'main', to: 'prodstate', via: [[680, 110], [680, 215]], text: 'Terraform State', at: [775, 207] },
        { from: 'pr', to: 'dev', via: [[700, 235], [700, 380]], text: 'Resource Provisioning', at: [775, 372] },
        { from: 'pr', to: 'devstate', via: [[700, 235], [700, 485]], text: 'Terraform State', at: [775, 477] },
      ],
    }),
  },
];
