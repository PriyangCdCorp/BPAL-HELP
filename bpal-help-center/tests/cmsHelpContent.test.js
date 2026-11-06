const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { safeCmsUrl, mapTips, mapWhatsNew, selectWhatsNewSource, loadCmsHelpContent } = require('../cmsHelpContent');
const ID = '696f79aa-7115-45ee-84b4-20278f5f261f';

test('API only accepts secure/loopback URLs', () => {
  assert.equal(safeCmsUrl('http://127.0.0.1:8000/'), 'http://127.0.0.1:8000');
  assert.equal(safeCmsUrl('https://example.com/'), 'https://example.com');
  assert.equal(safeCmsUrl('http://example.com'), null);
  assert.equal(safeCmsUrl('file:///temp/'), null);
});

test('maps structured tips with independent category groups and rich text', () => {
  const tips = mapTips([
    {title:'Subtopic',category:'Getting Started',content:{steps:[{text:'<p>Hello</p>',imagePath:`/content/media/${ID}`}]},media:[{media_id:ID}]},
    {title:'Another',category:'Getting Started',content:{steps:[{text:'Second'}]}}
  ], id => id === ID ? 'file:///safe/image.png' : null);
  assert.equal(tips.length, 1);
  assert.equal(tips[0].subHeadings.length, 2);
  assert.equal(tips[0].subHeadings[0].steps[0].imagePath, 'file:///safe/image.png');
});

test('media not attached is not fetched or rendered', () => {
  const tips = mapTips([{title:'Subtopic',content:{steps:[{text:'a',imagePath:`/content/media/${ID}`}]},media:[]}],()=>'file:///bad');
  assert.equal(tips[0].subHeadings[0].steps[0].imagePath, '');
});

test("maps What's New release metadata", () => {
  const out = mapWhatsNew([{title:'Feature',target_bpal_version:'2.1.2',content:{html:'<p>Great</p>',major_update:true},visible_from:'2026-11-03T00:00:00+00:00'}]);
  assert.equal(out[0].version,'2.1.2');
  assert.equal(out[0].changes[0].text,'<p>Great</p>');
  assert.equal(out[0].visibleFrom,'2026-11-03');
});

test('fetches tenant-scoped content and authenticated media', async () => {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bpal-cms-'));
  const calls=[];
  const fetchImpl=async (url, opts) => {
    calls.push({url, token:opts.headers.Authorization});
    if(url.includes('/content/media/')) return {ok:true,headers:new Headers({'content-type':'image/png'}),arrayBuffer:async()=>new Uint8Array([137,80,78,71]).buffer};
    const body=url.includes('/tips?') ? [{title:'Setup',category:'Basics',content:{steps:[{text:'<p>Open</p>',imagePath:`/content/media/${ID}`}]},media:[{media_id:ID}]}] : [];
    return {ok:true,json:async()=>body};
  };
  try {
    const result=await loadCmsHelpContent({apiUrl:'http://localhost:8000',apiKey:'secret-test-key',language:'en',cacheRoot:temp,fetchImpl});
    assert.equal(result.tipCount,1);
    assert.equal(result.mediaCount,1);
    assert.ok(result.tips[0].subHeadings[0].steps[0].imagePath.startsWith('file://'));
    assert.ok(calls.every(c=>c.token==='Bearer secret-test-key'));
    const bytes=await fs.readFile(new URL(result.tips[0].subHeadings[0].steps[0].imagePath));
    assert.equal(bytes.length,4);
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
});

test('CMS API failure returns null for section to preserve local fallback', async () => {
  const result=await loadCmsHelpContent({apiUrl:'http://localhost:8000',apiKey:'key',language:'fr',cacheRoot:'/tmp/bpal-m3-no-media',fetchImpl:async()=>{throw Error('offline')},logger:{warn:()=>{}}});
  assert.equal(result.tips,null);
  assert.equal(result.whatsNew,null);
});


test('successful empty CMS response suppresses old local announcements', () => {
  const local = [{title:'Outdated local release'}];
  assert.deepEqual(selectWhatsNewSource([], local), {items:[], source:'cms'});
  assert.deepEqual(selectWhatsNewSource(null, local), {items:local, source:'local'});
});

test('What’s New preserves inclusive date ranges, major flag and descending chronology', () => {
  const releases = [
    {title:'Future',target_bpal_version:'3',visible_from:'2026-11-05T00:00:00Z',content:{major_update:true,html:'future'}},
    {title:'Expired',target_bpal_version:'1',visible_to:'2026-11-02T23:59:59Z',content:{html:'past'}},
    {title:'Regular',target_bpal_version:'2',visible_from:'2026-11-01T00:00:00Z',content:{html:'regular'}},
    {title:'Major',target_bpal_version:'2.1',visible_from:'2026-11-03T00:00:00Z',visible_to:'2026-11-03T23:59:59Z',content:{majorUpdate:true,html:'major'}}
  ];
  const visible = mapWhatsNew(releases, () => null, '2026-11-03');
  assert.deepEqual(visible.map(x => x.title), ['Major', 'Regular']);
  assert.equal(visible[0].majorUpdate, true);
  assert.equal(visible[1].majorUpdate, false);
  assert.equal(visible[0].visibleTo, '2026-11-03');
});


test('Registry /chat URL resolves CMS lists and media at origin', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'bpal-cms-chat-url-'));
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, auth: options.headers.Authorization });
    if (url.includes('/content/media/')) {
      return { ok: true, headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    }
    const items = url.includes('/tips?')
      ? [{ title: 'Tip', category: 'General', content: { steps: [{text:'Example', imagePath: `/content/media/${ID}`}] }, media: [{ media_id: ID }] }]
      : [{title:'Update', content: {html: '<p>Fixed</p>'} }];
    return { ok: true, json: async () => items };
  };
  try {
    const res = await loadCmsHelpContent({
      apiUrl: 'https://cdcorp-bpal-api.duckdns.org/chat', apiKey: 'customer-test-key',
      language: 'fr', cacheRoot: temp, fetchImpl
    });
    assert.equal(res.tipCount, 1);
    assert.equal(res.whatsNewCount, 1);
    assert.equal(res.mediaCount, 1);
    assert.equal(calls.length, 3);
    assert.ok(calls.every(x => x.url.startsWith('https://cdcorp-bpal-api.duckdns.org/content/')));
    assert.ok(calls.every(x => !x.url.includes('/chat/content/')));
    assert.ok(calls.every(x => x.auth === 'Bearer customer-test-key'));
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
